import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('registration intents authorize only new Professional accounts and preserve stored roles', async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  const originalWarn = console.warn;
  const originalError = console.error;
  const logs = [];
  const roles = new Map();
  const authUsers = new Map();
  let authEnabled = true;
  let racePromotionUser = null;
  let patchCalls = 0;
  let handler;
  const serviceKey = 'server-only-test-service-role';
  const publicKey = 'test-public-key';
  const roleFor = (id) => roles.get(id) || 'citizen';
  const createdAtFor = (id) => authUsers.get(id)?.created_at || new Date(Date.now() - 60_000).toISOString();
  const timestampAtMicros = (value) => {
    const micros = BigInt(value);
    const seconds = micros / 1_000_000n;
    const fraction = (micros % 1_000_000n).toString().padStart(6, '0');
    return `${new Date(Number(seconds * 1_000n)).toISOString().slice(0, 19)}.${fraction}Z`;
  };
  const signClaims = async (claims) => {
    const encoder = new TextEncoder();
    const b64 = (value) => Buffer.from(value).toString('base64url');
    const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64(JSON.stringify(claims));
    const input = `${header}.${payload}`;
    const key = await webcrypto.subtle.importKey('raw', encoder.encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = new Uint8Array(await webcrypto.subtle.sign('HMAC', key, encoder.encode(input)));
    return `${input}.${b64(signature)}`;
  };

  globalThis.Deno = {
    env: { get: (name) => ({
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_ANON_KEY: publicKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    })[name] },
    serve: (nextHandler) => { handler = nextHandler; },
  };
  console.warn = (...args) => logs.push(args.join(' '));
  console.error = (...args) => logs.push(args.join(' '));
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const parsedUrl = new URL(url);
    const bearer = new Headers(init.headers).get('authorization') || '';
    const userId = bearer.startsWith('Bearer user-token-') ? bearer.slice('Bearer user-token-'.length) : 'missing-user';
    if (url.endsWith('/auth/v1/user')) {
      return authEnabled
        ? Response.json({ id: userId, created_at: createdAtFor(userId) })
        : Response.json({}, { status: 401 });
    }
    if (url.endsWith('/rest/v1/rpc/law_nanban_registration_timestamp')) return Response.json(new Date().toISOString());
    if (url.includes('/rest/v1/profiles?') && init.method === 'PATCH') {
      const profileUserId = (parsedUrl.searchParams.get('id') || '').replace(/^eq\./, '');
      patchCalls += 1;
      if (racePromotionUser === profileUserId) {
        roles.set(profileUserId, 'professional');
        racePromotionUser = null;
        return Response.json([]);
      }
      if (roleFor(profileUserId) === 'citizen') roles.set(profileUserId, 'professional');
      return Response.json([{ id: profileUserId, role: roleFor(profileUserId) }]);
    }
    if (url.includes('/rest/v1/profiles?')) {
      const profileUserId = (parsedUrl.searchParams.get('id') || '').replace(/^eq\./, '');
      return Response.json([{ id: profileUserId, role: roleFor(profileUserId) }]);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    await vite.ssrLoadModule('/supabase/functions/law-nanban-professional-registration/index.ts');
    const invoke = (userId, body, authenticated = true, key = publicKey) => handler(new Request('https://test-project.supabase.co/functions/v1/law-nanban-professional-registration', {
      method: 'POST',
      headers: { apikey: key, ...(authenticated ? { authorization: `Bearer user-token-${userId}` } : {}), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));

    assert.equal((await invoke('unauthenticated', { action: 'finalize' }, false)).status, 401);
    assert.equal((await invoke('wrong-project', { action: 'prepare' }, false, 'wrong-key')).status, 401);

    const prepared = await invoke('unused-user', { action: 'prepare', role: 'admin' }, false);
    assert.equal(prepared.status, 200);
    const { registrationIntent } = await prepared.json();
    assert.equal(typeof registrationIntent, 'string');
    assert.ok(!registrationIntent.includes(serviceKey));
    const claims = JSON.parse(Buffer.from(registrationIntent.split('.')[1], 'base64url').toString('utf8'));
    assert.equal(claims.role, 'professional', 'the server fixes the intent role and ignores arbitrary role fields');
    const issuedAtUs = BigInt(claims.iat_us);
    const expiresAtUs = BigInt(claims.exp_us);
    assert.equal(expiresAtUs - issuedAtUs, 30n * 60n * 1_000_000n, 'intent lifetime is exactly 30 minutes');
    assert.equal(BigInt(claims.iat), issuedAtUs / 1_000_000n);
    assert.equal(BigInt(claims.exp), expiresAtUs / 1_000_000n);

    const intentParts = registrationIntent.split('.');
    intentParts[2] = `${intentParts[2].startsWith('a') ? 'b' : 'a'}${intentParts[2].slice(1)}`;
    const tamperedIntent = intentParts.join('.');
    authUsers.set('tampered-user', { created_at: timestampAtMicros(issuedAtUs + 1n) });
    assert.deepEqual(await (await invoke('tampered-user', { action: 'finalize', registrationIntent: tamperedIntent })).json(), { role: 'citizen' });
    assert.equal(roleFor('tampered-user'), 'citizen');

    // A correctly signed but expired intent cannot promote a newly created account.
    const expiredIssuedAtUs = BigInt(Date.now()) * 1_000n - 30n * 60n * 1_000_000n - 1_000n;
    const expiredIntent = await signClaims({
      aud: claims.aud,
      role: 'professional',
      iat: Number(expiredIssuedAtUs / 1_000_000n),
      exp: Number((expiredIssuedAtUs + 30n * 60n * 1_000_000n) / 1_000_000n),
      iat_us: expiredIssuedAtUs.toString(),
      exp_us: (expiredIssuedAtUs + 30n * 60n * 1_000_000n).toString(),
    });
    authUsers.set('expired-intent-user', { created_at: timestampAtMicros(expiredIssuedAtUs + 1n) });
    assert.deepEqual(await (await invoke('expired-intent-user', { action: 'finalize', registrationIntent: expiredIntent })).json(), { role: 'citizen' });

    // A previously existing Citizen cannot use a fresh signup intent as a login-time promotion.
    authUsers.set('existing-citizen', { created_at: timestampAtMicros(issuedAtUs - 1n) });
    const existingCitizen = await invoke('existing-citizen', { action: 'finalize', registrationIntent, role: 'admin' });
    assert.equal(existingCitizen.status, 200);
    assert.deepEqual(await existingCitizen.json(), { role: 'citizen' });
    assert.equal(roleFor('existing-citizen'), 'citizen');

    // A user created after intent issuance can register directly as a Professional.
    authUsers.set('new-professional', { created_at: timestampAtMicros(issuedAtUs + 1n) });
    const promoted = await invoke('new-professional', { action: 'finalize', registrationIntent, role: 'admin' });
    assert.equal(promoted.status, 200);
    assert.deepEqual(await promoted.json(), { role: 'professional' });
    assert.equal(roleFor('new-professional'), 'professional');

    // Equality is ambiguous: creation must be strictly later, not merely in the same millisecond.
    authUsers.set('equal-timestamp-user', { created_at: timestampAtMicros(issuedAtUs) });
    assert.deepEqual(await (await invoke('equal-timestamp-user', { action: 'finalize', registrationIntent })).json(), { role: 'citizen' });
    authUsers.set('one-microsecond-before-user', { created_at: timestampAtMicros(issuedAtUs - 1n) });
    assert.deepEqual(await (await invoke('one-microsecond-before-user', { action: 'finalize', registrationIntent })).json(), { role: 'citizen' });
    authUsers.set('same-millisecond-after-user', { created_at: timestampAtMicros(issuedAtUs + 1n) });
    assert.deepEqual(await (await invoke('same-millisecond-after-user', { action: 'finalize', registrationIntent })).json(), { role: 'professional' });

    // Refresh/replayed callbacks do not repeat the role update.
    const patchesBeforeReplay = patchCalls;
    assert.deepEqual(await (await invoke('new-professional', { action: 'finalize', registrationIntent })).json(), { role: 'professional' });
    assert.equal(patchCalls, patchesBeforeReplay);

    // Concurrent callbacks see the winning role update and return success idempotently.
    authUsers.set('racing-user', { created_at: timestampAtMicros(issuedAtUs + 1_000n) });
    racePromotionUser = 'racing-user';
    const raced = await invoke('racing-user', { action: 'finalize', registrationIntent });
    assert.equal(raced.status, 200);
    assert.deepEqual(await raced.json(), { role: 'professional' });

    // Existing Professionals and Admins need no registration intent and keep their roles.
    roles.set('existing-professional', 'professional');
    authUsers.set('existing-professional', { created_at: timestampAtMicros(issuedAtUs - 60_000_000n) });
    assert.deepEqual(await (await invoke('existing-professional', { action: 'finalize' })).json(), { role: 'professional' });
    roles.set('admin-user', 'admin');
    authUsers.set('admin-user', { created_at: timestampAtMicros(issuedAtUs - 60_000_000n) });
    assert.deepEqual(await (await invoke('admin-user', { action: 'finalize' })).json(), { role: 'admin' });
    assert.equal(roleFor('admin-user'), 'admin');
    assert.ok(!logs.join('\n').includes(serviceKey));

    const authContext = await readFile(new URL('../src/context/AuthContext.tsx', import.meta.url), 'utf8');
    const callback = await readFile(new URL('../src/pages/auth/AuthCallbackPage.tsx', import.meta.url), 'utf8');
    const authPage = await readFile(new URL('../src/pages/auth/AuthPage.tsx', import.meta.url), 'utf8');
    const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
    const registrationFunction = await readFile(new URL('../supabase/functions/law-nanban-professional-registration/index.ts', import.meta.url), 'utf8');
    const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
    assert.match(authContext, /supabase\.auth\.signUp/);
    assert.match(authContext, /signInWithOAuth\(\{\s*provider:\s*'google'/);
    assert.match(authContext, /searchParams\.set\('registration_intent'/);
    assert.match(authContext, /if \(intent === 'professional' && registrationIntent\)[\s\S]*options\.emailRedirectTo = callback\.toString\(\)/);
    assert.match(authContext, /data\?\.role === 'citizen'[\s\S]*registrationIntentInvalid: true/);
    assert.match(callback, /registration_intent/);
    assert.match(callback, /completeProfessionalRegistration/);
    assert.match(callback, /completed\.registrationIntentInvalid/);
    assert.match(callback, /Restart Professional registration/);
    assert.match(callback, /navigate\(result\.role === 'citizen' \? '\/portal' : '\/app'/);
    assert.match(authPage, /navigate\(role === 'citizen' \? '\/portal' : '\/app'/);
    assert.match(authPage, /else if \(result\.role\) routeForRole\(result\.role\)/);
    assert.match(authPage, /\{isSignUp && <div[^]*aria-label="Account type"/);
    assert.match(authPage, /signInWithGoogle\(isSignUp \? accountType : 'citizen'\)/);
    assert.doesNotMatch(authPage, /access.?code/i);
    assert.doesNotMatch(callback, /access.?code/i);
    assert.doesNotMatch(authContext, /access.?code/i);
    assert.match(app, /<RequireAuth role="professional">/);
    assert.match(app, /profile\.role !== role && profile\.role !== 'admin'/);
    assert.match(registrationFunction, /userCreatedAtUs > issuedAtUs/);
    assert.match(registrationFunction, /INTENT_LIFETIME_US = 30n \* 60n \* 1_000_000n/);
    assert.match(registrationFunction, /parseTimestampMicros/);
    assert.match(registrationFunction, /&role=eq\.citizen/);
    assert.match(config, /\[functions\.law-nanban-professional-registration\]\s*verify_jwt = false/);
    const timestampMigration = await readFile(new URL('../supabase/migrations/20261115180000_professional_registration_timestamp.sql', import.meta.url), 'utf8');
    assert.match(timestampMigration, /REVOKE ALL ON FUNCTION public\.law_nanban_registration_timestamp\(\) FROM PUBLIC, anon, authenticated/);
    assert.match(timestampMigration, /GRANT EXECUTE ON FUNCTION public\.law_nanban_registration_timestamp\(\) TO service_role/);
    for (const migration of [
      '20261115150000_professional_registration_rate_limit.sql',
      '20261115160000_professional_registration_network_rate_limit.sql',
      '20261115170000_professional_registration_atomic_limits.sql',
    ]) {
      await assert.rejects(readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url)));
    }
  } finally {
    await vite.close();
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    console.error = originalError;
    if (originalDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = originalDeno;
  }
});
