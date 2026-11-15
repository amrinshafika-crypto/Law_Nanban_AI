import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const arrestRightsAnswer = [
  '# Arrest Rights in India',
  '',
  'If arrested, **you have the right to know the grounds of arrest**. தமிழிலும் English-லும் கேள்வி கேட்கலாம்.',
  '',
  '---',
  '',
  '## Steps to take',
  '',
  '1. Ask for the grounds of arrest.',
  '2. Contact a lawyer or legal-aid service.',
  '',
  '---',
  '',
  '| Right | What to do |',
  '| --- | --- |',
  '| Legal advice | Ask to speak with a lawyer. |',
  '| Informing family | Ask that a relative or friend be informed. |',
  '',
  '> Do not sign a statement you do not understand.',
  '',
  '[NALSA legal aid](https://nalsa.gov.in)',
  '',
  '**Disclaimer:** This is general information, not a substitute for advice from a qualified lawyer.',
].join('\n');

test('Citizen assistant renders the arrest-rights Markdown structure safely', async () => {
  const citizenAskSource = fs.readFileSync(fileURLToPath(new URL('../src/pages/citizen/CitizenAsk.tsx', import.meta.url)), 'utf8');
  assert.match(citizenAskSource, /message\.role === 'user' \? message\.text : <MarkdownMessage content=\{message\.text\} \/>/);
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { MarkdownMessage } = await vite.ssrLoadModule('/src/components/MarkdownMessage.tsx');
    const html = renderToStaticMarkup(React.createElement(MarkdownMessage, { content: arrestRightsAnswer }));
    assert.match(html, /<h1[^>]*>Arrest Rights in India<\/h1>/);
    assert.match(html, /<strong[^>]*>you have the right to know the grounds of arrest<\/strong>/);
    assert.match(html, /<ol\b/);
    assert.equal((html.match(/<hr\b/g) || []).length, 2);
    assert.match(html, /<table/);
    assert.match(html, /<th[^>]*>Right<\/th>/);
    assert.match(html, /<blockquote\b/);
    assert.match(html, /<a href="https:\/\/nalsa\.gov\.in"/);
    assert.match(html, /தமிழிலும் English-லும்/);
    assert.match(html, /<strong[^>]*>Disclaimer:<\/strong>/);
    assert.doesNotMatch(html, /# Arrest Rights|\*\*|\| Right \||---/);

    const unsafeHtml = renderToStaticMarkup(React.createElement(MarkdownMessage, {
      content: '<script>alert(1)</script><svg onload="alert(1)">unsafe</svg> [bad](javascript:alert(1))',
    }));
    assert.doesNotMatch(unsafeHtml, /<script|<svg|onload=|href="javascript:/);
  } finally {
    await vite.close();
  }
});
