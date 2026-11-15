import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const sampleDocument = `
Reference ID: LN-DEMO-001
Complainant: Aarav Kumar
Opposite Party: BrightCart Electronics
Product: Laptop computer
Model: BC-14
Order ID: BC-2026-10482
Amount Paid: INR 48,500
Purchase Date: November 2, 2026
Promised Delivery Date: November 6, 2026
Actual Delivery Date: November 7, 2026
Support Ticket: BC-SUP-7781
Complaint Date: November 8, 2026
Rejection Date: November 11, 2026
Follow-up Date: November 12, 2026
Document Date: November 15, 2026
The order confirmation email and payment receipt are listed as evidence. An unboxing video was mentioned but was not attached.
The customer says the laptop arrived one day after the promised delivery date and requests a refund.
`;

async function loadAnalyzer() {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  const module = await vite.ssrLoadModule('/src/lib/documentAnalysis.ts');
  return { vite, ...module };
}

test('analyzes the LN-DEMO-001 fact pattern with source-grounded dates, parties and amounts', async () => {
  const { vite, analyzeDocument } = await loadAnalyzer();
  try {
    const { result, verificationResult } = analyzeDocument(sampleDocument, 'LN-DEMO-001.pdf');
    assert.equal(result.identifiers.find((entry) => entry.label === 'Reference ID')?.value, 'LN-DEMO-001');
    assert.equal(result.identifiers.find((entry) => entry.label === 'Order ID')?.value, 'BC-2026-10482');
    assert.equal(result.identifiers.find((entry) => entry.label === 'Support ticket')?.value, 'BC-SUP-7781');
    assert.equal(result.partyRoles.complainant.name, 'Aarav Kumar');
    assert.equal(result.partyRoles.oppositeParty.name, 'BrightCart Electronics');
    assert.equal(result.product.value, 'Laptop computer, Model BC-14');
    assert.ok(result.financialAmounts.some((entry) => entry.amount === '48,500' && entry.currency === 'INR' && entry.kind === 'amount_paid'));
    assert.deepEqual(result.timeline.map((entry) => entry.isoDate), [
      '2026-11-02', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-11', '2026-11-12', '2026-11-15',
    ]);
    assert.equal(result.timeline.filter((entry) => entry.isoDate === '2026-11-08').length, 1);
    assert.equal(result.evidence.find((entry) => entry.name === 'Unboxing video')?.status, 'mentioned_not_attached');
    assert.equal(result.evidence.find((entry) => entry.name === 'Payment receipt')?.status, 'attachment_not_verified');
    assert.doesNotMatch(result.detailedSummary, /IPC|BNS|Section\s+\d|\bcitation\b/i);
    assert.ok(verificationResult.checks.length >= 4);
  } finally {
    await vite.close();
  }
});

test('reports missing party roles and dates without fabricating values', async () => {
  const { vite, analyzeDocument } = await loadAnalyzer();
  try {
    const { result } = analyzeDocument('A repair service was discussed. No dates or parties are provided.', 'note.txt');
    assert.equal(result.partyRoles.complainant.status, 'not_stated');
    assert.equal(result.partyRoles.oppositeParty.status, 'not_stated');
    assert.equal(result.timeline.length, 0);
    assert.ok(result.missingInfo.some((item) => /Complainant/i.test(item)));
    assert.ok(result.missingInfo.some((item) => /Opposite party/i.test(item)));
    assert.ok(result.missingInfo.some((item) => /No dates/i.test(item)));
  } finally {
    await vite.close();
  }
});

test('keeps multiple financial categories distinct and flags ambiguous currency', async () => {
  const { vite, analyzeDocument } = await loadAnalyzer();
  try {
    const { result } = analyzeDocument('Amount Paid: INR 10,000\nRefund Requested: INR 8,000\nClaimed Amount: 25,000\nAn additional fee was 400.', 'claim.txt');
    assert.ok(result.financialAmounts.some((entry) => entry.kind === 'amount_paid' && entry.amount === '10,000' && entry.currency === 'INR'), JSON.stringify(result.financialAmounts));
    assert.ok(result.financialAmounts.some((entry) => entry.kind === 'refund_requested' && entry.amount === '8,000' && entry.currency === 'INR'));
    assert.ok(result.financialAmounts.some((entry) => entry.kind === 'claimed_amount' && entry.amount === '25,000'));
    assert.ok(!result.financialAmounts.some((entry) => entry.amount === '400'), 'unlabelled bare number should not be asserted as a financial amount');
    assert.ok(result.missingInfo.some((item) => /currency/i.test(item)));
  } finally {
    await vite.close();
  }
});

test('does not guess ambiguous numeric dates or bare numbers as money', async () => {
  const { vite, analyzeDocument } = await loadAnalyzer();
  try {
    const { result } = analyzeDocument('Date mentioned: 04/05/2026. Amount: 1200.', 'ambiguous.txt');
    assert.equal(result.timeline[0]?.isoDate, null);
    assert.equal(result.timeline[0]?.status, 'uncertain');
    assert.equal(result.financialAmounts.length, 0, 'unlabelled bare number should not be mistaken for money');
  } finally {
    await vite.close();
  }
});
