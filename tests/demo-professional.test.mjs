import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('demo professional environment is fictional, isolated, and exercises existing AI workflows', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { demoProfessionalProfile, demoCases } = await vite.ssrLoadModule('/src/lib/demoProfessionalData.ts');
    assert.equal(demoProfessionalProfile.name, 'Adv. Arjun Raman');
    assert.equal(demoProfessionalProfile.barCouncilId, 'DEMO-TN-2026 (fictional; not a real registration)');
    assert.equal(demoProfessionalProfile.fictional, true);
    assert.ok(demoCases.length >= 7 && demoCases.length <= 10);
    for (const category of ['property', 'civil', 'family', 'cyber', 'labor', 'consumer', 'criminal']) {
      assert.ok(demoCases.some((item) => item.category === category), `missing ${category} demo case`);
    }
    for (const item of demoCases) {
      assert.equal(item.fictional, true);
      assert.match(item.caseNumber, /^DEMO-/);
      assert.match(item.client.name, /\(fictional\)/);
      assert.ok(item.evidence.length > 0);
      assert.ok(item.evidence.every((evidence) => evidence.sampleOnly === true && /DEMO_/.test(evidence.fileName)));
    }

    const page = await readFile(new URL('../src/pages/professional/DemoEnvironment.tsx', import.meta.url), 'utf8');
    for (const agent of ['triage', 'legal_research', 'document_intelligence', 'legal_drafting', 'case_summary', 'case_strategy']) {
      assert.ok(page.includes(`'${agent}'`), `missing existing Professional AI workflow ${agent}`);
    }
    assert.match(page, /\['triage', 'case_summary'\]/, 'central orchestration is a bounded supported agent batch');
    assert.match(page, /runProfessionalAgents\(agents/);
    assert.doesNotMatch(page, /from ['"]@\/lib\/supabase['"]/);
    assert.doesNotMatch(page, /\.from\(['"](cases|profiles|documents|case_parties)['"]\)/);
    assert.match(page, /Reset demo/);

    const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
    assert.match(app, /<RequireAuth role="professional">[\s\S]*<Route path="demo" element={<DemoEnvironment \/>} \/>/);
    const professionalLayout = await readFile(new URL('../src/components/ProfessionalLayout.tsx', import.meta.url), 'utf8');
    assert.match(professionalLayout, /to: '\/app\/demo', label: 'Demo Environment'/);
  } finally {
    await vite.close();
  }
});
