import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('professional Edge Function authenticates role and orchestrates real Groq-format agent calls', async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  let role = 'professional';
  let providerMode = 'success';
  let rateLimitCalls = 0;
  let groqCalls = [];
  let handler;
  globalThis.Deno = {
    env: { get: (name) => ({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_ANON_KEY: 'test-publishable-key',
      GROQ_API_KEY: 'test-server-only-groq-key',
      GROQ_MODEL: 'qwen/qwen3.8-27b',
    })[name] },
    serve: (nextHandler) => { handler = nextHandler; },
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-1' });
    if (url.includes('/rest/v1/profiles')) return Response.json([{ role }]);
    if (url === 'https://api.groq.com/openai/v1/chat/completions') {
      groqCalls.push({ headers: init.headers, body: JSON.parse(init.body) });
      if (providerMode === 'unauthorized') return Response.json({ error: { message: 'invalid key' } }, { status: 401 });
      if (providerMode === 'rate-limit-once' && rateLimitCalls++ === 0) {
        return Response.json({ error: { message: 'rate limited' } }, { status: 429 });
      }
      const requestBody = JSON.parse(init.body);
      const specialist = requestBody.messages[0].content.match(/You are Law Nanban's (.*?) for/)?.[1] || 'agent';
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: `Completed ${specialist} review.` } }] });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    await vite.ssrLoadModule('/supabase/functions/law-nanban-professional-ai/index.ts');
    assert.equal(typeof handler, 'function');
    const invoke = (body) => handler(new Request('https://test-project.supabase.co/functions/v1/law-nanban-professional-ai', {
      method: 'POST',
      headers: { apikey: 'test-publishable-key', authorization: 'Bearer actual-user-access-token', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));

    const success = await invoke({ agents: ['case_summary', 'case_strategy'], context: { case: { title: 'Test matter' } } });
    assert.equal(success.status, 200);
    const successBody = await success.json();
    assert.deepEqual(successBody.orchestrator.completedAgents, ['case_summary', 'case_strategy']);
    assert.equal(successBody.results.length, 2);
    assert.ok(groqCalls.every((call) => call.body.model === 'qwen/qwen3.8-27b'));
    assert.ok(groqCalls.every((call) => call.headers.Authorization === 'Bearer test-server-only-groq-key'));
    assert.ok(groqCalls.every((call) => call.body.max_completion_tokens === 2048));

    role = 'citizen';
    const beforeCitizen = groqCalls.length;
    const citizen = await invoke({ agents: ['triage'], context: { description: 'A matter' } });
    assert.equal(citizen.status, 403);
    assert.equal(groqCalls.length, beforeCitizen, 'non-professional profiles must not reach Groq');

    role = 'professional';
    const invalidAgent = await invoke({ agents: ['invented_agent'], context: { description: 'A matter' } });
    assert.equal(invalidAgent.status, 400);
    const beforeUnauthorized = groqCalls.length;
    providerMode = 'unauthorized';
    const unauthorized = await invoke({ agents: ['triage'], context: { description: 'A matter' } });
    assert.equal(unauthorized.status, 502);
    assert.equal(groqCalls.length, beforeUnauthorized + 1, 'provider authentication failures must not be retried');
    assert.equal((await unauthorized.json()).error.code, 'AI_PROVIDER_AUTH');

    providerMode = 'rate-limit-once';
    rateLimitCalls = 0;
    const beforeRetry = groqCalls.length;
    const retried = await invoke({ agents: ['triage'], context: { description: 'A matter' } });
    assert.equal(retried.status, 200);
    assert.equal(groqCalls.length, beforeRetry + 2, '429 receives one bounded retry');
  } finally {
    await vite.close();
    globalThis.fetch = originalFetch;
    if (originalDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = originalDeno;
  }
});
