import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const escapedAnswer = [
  '\\# Demo heading',
  '',
  'A \\*\\*bold phrase\\*\\* and an entity:&#x20;done.',
  '',
  '\\---',
  '',
  '\\- First item',
  '\\- Second item',
  '',
  '\\> Quoted advice',
  '',
  '\\| Topic \\| Response \\|',
  '\\| \\--- \\| \\--- \\|',
  '\\| Notice \\| Verify service date \\|',
  '',
  'Inline code: `\\*\\*literal\\*\\*`',
  '',
  '```text',
  '\\# code heading stays literal',
  '```',
].join('\n');

test('Professional AI Markdown is formatted safely without changing stored answer text', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { ProfessionalMarkdownMessage, normalizeProfessionalMarkdown } = await vite.ssrLoadModule('/src/components/ProfessionalMarkdownMessage.tsx');
    const originalAnswer = escapedAnswer;
    const normalized = normalizeProfessionalMarkdown(originalAnswer);
    assert.notEqual(normalized, originalAnswer, 'normalization is a separate render-only value');
    assert.equal(originalAnswer, escapedAnswer);

    const html = renderToStaticMarkup(React.createElement(ProfessionalMarkdownMessage, { content: originalAnswer }));
    assert.match(html, /<h1[^>]*>Demo heading<\/h1>/);
    assert.match(html, /<strong[^>]*>bold phrase<\/strong>/);
    assert.match(html, /entity: done\./);
    assert.match(html, /<hr\b/);
    assert.match(html, /<ul\b/);
    assert.match(html, /<blockquote\b/);
    assert.match(html, /<table\b/);
    assert.match(html, /<th[^>]*>Topic<\/th>/);
    assert.match(html, /<code[^>]*>\\\*\\\*literal\\\*\\\*<\/code>/);
    assert.match(html, /<pre[^>]*>[\s\S]*\\# code heading stays literal[\s\S]*<\/pre>/);
    assert.doesNotMatch(html, /&#x20;|\\# Demo heading|\\\*\\\*bold phrase/);

    const unsafe = renderToStaticMarkup(React.createElement(ProfessionalMarkdownMessage, {
      content: '<script>alert(1)</script><svg onload="alert(1)">unsafe</svg> [bad](javascript:alert(1))',
    }));
    assert.doesNotMatch(unsafe, /<script|<svg|onload=|href="javascript:/);

    for (const pagePath of [
      'Dashboard.tsx', 'CaseTriage.tsx', 'Documents.tsx', 'LegalResearch.tsx',
      'CaseDetail.tsx', 'DemoEnvironment.tsx', 'Drafting.tsx',
    ]) {
      const page = await readFile(new URL(`../src/pages/professional/${pagePath}`, import.meta.url), 'utf8');
      assert.match(page, /ProfessionalMarkdownMessage/, `${pagePath} must use the Professional Markdown renderer`);
    }
    const citizenAsk = await readFile(new URL('../src/pages/citizen/CitizenAsk.tsx', import.meta.url), 'utf8');
    assert.match(citizenAsk, /message\.role === 'user' \? message\.text : <MarkdownMessage content=\{message\.text\} \/>/);
  } finally {
    await vite.close();
  }
});
