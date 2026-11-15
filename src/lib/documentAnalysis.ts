export type FieldStatus = 'identified' | 'uncertain' | 'not_stated';
export type EntityType = 'individual' | 'organisation' | 'uncertain';

export interface DocumentParty {
  role: string;
  name: string | null;
  status: FieldStatus;
  entityType: EntityType;
  sourceText: string | null;
}

export interface DocumentPartyRoles {
  complainant: DocumentParty;
  oppositeParty: DocumentParty;
  otherNamedEntities: DocumentParty[];
}

export interface DocumentTimelineEntry {
  event: string;
  originalDate: string;
  isoDate: string | null;
  status: 'identified' | 'uncertain';
  sourceText: string;
}

export interface DocumentFinancialAmount {
  kind: 'amount_paid' | 'claimed_amount' | 'refund_requested' | 'other_amount';
  original: string;
  amount: string;
  currency: 'INR' | null;
  status: 'identified' | 'uncertain';
  sourceText: string;
}

export interface DocumentEvidenceMention {
  name: string;
  status: 'mentioned_not_attached' | 'attachment_not_verified';
  sourceText: string;
}

export interface DocumentAnalysisResult {
  overview: string;
  quickSummary: string;
  detailedSummary: string;
  parties: string[];
  partyRoles: DocumentPartyRoles;
  identifiers: { label: string; value: string; sourceText: string }[];
  product: { value: string | null; status: FieldStatus; sourceText: string | null };
  timeline: DocumentTimelineEntry[];
  dates: string[];
  financialAmounts: DocumentFinancialAmount[];
  keyPoints: string[];
  reviewIssues: string[];
  evidence: DocumentEvidenceMention[];
  missingInfo: string[];
  questions: string[];
  wordCount: number;
  documentType: string;
}

export interface DocumentVerificationResult {
  verified: boolean;
  checks: {
    name: string;
    passed: boolean | null;
    status: 'passed' | 'failed' | 'needs_review' | 'not_applicable';
    detail: string;
  }[];
  summary: string;
}

export interface DocumentAnalysisRun {
  result: DocumentAnalysisResult;
  verificationResult: DocumentVerificationResult;
  verified: boolean;
  executionLog: { agent: string; status: string; timestamp: string }[];
}

const LABELS = [
  'Reference ID', 'Reference No', 'Ref ID', 'Case Reference', 'Case ID', 'Order ID', 'Order No', 'Support Ticket', 'Ticket ID',
  'Complainant', 'Applicant', 'Petitioner', 'Plaintiff', 'Opposite Party', 'Respondent', 'Defendant',
  'Advocate for Complainant', 'Advocate for Applicant', 'Advocate for Petitioner', 'Advocate for Respondent', 'Counsel for Complainant', 'Counsel for Respondent',
  'Advocate', 'Counsel', 'Witnesses', 'Witness', 'Product', 'Model', 'Amount Paid', 'Paid Amount', 'Purchase Amount',
  'Claimed Amount', 'Claim Amount', 'Compensation Claimed', 'Refund Requested', 'Refund Amount', 'Document Date', 'Purchase Date',
  'Promised Delivery Date', 'Expected Delivery Date', 'Actual Delivery Date', 'Delivery Date', 'Incident Date', 'Complaint Date',
  'Rejection Date', 'Follow-up Date', 'Hearing Date', 'Deadline', 'Response Date',
];

const LABEL_RE = new RegExp(`\\b(${LABELS.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})\\s*[:：-]\\s*`, 'gi');
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
const DATE_RE = new RegExp(`\\b(?:\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}|\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}|\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}|(?:${MONTHS})\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'gi');
const MONEY_RE = /(?:₹\s*|\b(?:INR|Rs\.?|Rupees?)\s*)(?:(?:\d{1,3}(?:,\d{3})+)|(?:\d{1,2}(?:,\d{2})*,\d{3})|\d+)(?:\.\d{1,2})?/gi;
const ID_RE = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,}\b/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledFields(text: string) {
  const labels: { label: string; start: number; valueStart: number }[] = [];
  for (const match of text.matchAll(LABEL_RE)) {
    if (match.index === undefined) continue;
    labels.push({ label: match[1], start: match.index, valueStart: match.index + match[0].length });
  }
  return labels.map((item, index) => {
    const nextStart = labels[index + 1]?.start ?? text.length;
    const raw = text.slice(item.valueStart, nextStart).split(/[\r\n;]/, 1)[0].trim();
    const value = raw.replace(/[\s,.:]+$/g, '');
    return { label: item.label, value, start: item.start, valueStart: item.valueStart, sourceText: text.slice(item.start, nextStart).trim().slice(0, 280) };
  }).filter((item) => item.value.length > 0);
}

function findField(fields: ReturnType<typeof extractLabeledFields>, label: string) {
  return fields.find((field) => field.label.toLowerCase() === label.toLowerCase());
}

function entityType(name: string | null): EntityType {
  if (!name) return 'uncertain';
  if (/\b(?:private limited|pvt\.?\s*ltd\.?|limited|\bltd\.?|llp|incorporated|corporation|company|bank|electronics|industries|enterprises|association|society|university|department|municipal corporation)\b/i.test(name)) return 'organisation';
  if (/\b(?:unknown|unclear|not stated|not known|to be confirmed|uncertain)\b/i.test(name) || name.split(/\s+/).length < 2) return 'uncertain';
  return 'individual';
}

function partyFromField(field: ReturnType<typeof extractLabeledFields>[number] | undefined, role: string): DocumentParty {
  if (!field) return { role, name: null, status: 'not_stated', entityType: 'uncertain', sourceText: null };
  const name = field.value.replace(/\s*\((?:fictional|illustrative|example)\)\s*/ig, '').trim();
  const type = entityType(name);
  return { role, name: name || null, status: type === 'uncertain' ? 'uncertain' : 'identified', entityType: type, sourceText: field.sourceText };
}

function extractPartyRoles(fields: ReturnType<typeof extractLabeledFields>): DocumentPartyRoles {
  const complainant = partyFromField(
    fields.find((field) => /^(complainant|applicant|petitioner|plaintiff)$/i.test(field.label)),
    'Complainant / Applicant / Petitioner / Plaintiff',
  );
  const oppositeParty = partyFromField(
    fields.find((field) => /^(opposite party|respondent|defendant)$/i.test(field.label)),
    'Opposite Party / Respondent / Defendant',
  );
  const otherNamedEntities: DocumentParty[] = [];
  for (const field of fields) {
    if (/^(advocate for |counsel for )/i.test(field.label)) {
      const namedRole = field.label;
      otherNamedEntities.push(partyFromField(field, namedRole));
    } else if (/^(advocate|counsel|witness|witnesses)$/i.test(field.label)) {
      const names = field.value.split(/\s*,\s*|\s+and\s+/i).filter(Boolean);
      for (const name of names) {
        const type = entityType(name);
        otherNamedEntities.push({ role: field.label, name: name.trim(), status: type === 'uncertain' ? 'uncertain' : 'identified', entityType: type, sourceText: field.sourceText });
      }
    }
  }
  return { complainant, oppositeParty, otherNamedEntities };
}

function parseDate(value: string): string | null {
  let year: number, month: number, day: number;
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
  if (match) [, year, month, day] = match.map(Number) as [number, number, number, number];
  else if ((match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(value))) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first <= 12 && second <= 12 && first !== second) return null;
    if (first > 12 && second <= 12) { day = first; month = second; }
    else if (second > 12 && first <= 12) { month = first; day = second; }
    else { day = first; month = second; }
    year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  } else {
    const dayFirst = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(value);
    const monthFirst = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(value);
    if (!dayFirst && !monthFirst) return null;
    const monthMap: Record<string, number> = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    if (dayFirst) {
      day = Number(dayFirst[1]); month = monthMap[dayFirst[2].toLowerCase()]; year = Number(dayFirst[3]);
    } else {
      month = monthMap[monthFirst![1].toLowerCase()]; day = Number(monthFirst![2]); year = Number(monthFirst![3]);
    }
  }
  if (!Number.isInteger(year!) || !Number.isInteger(month!) || !Number.isInteger(day!)) return null;
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return null;
  return `${year!.toString().padStart(4, '0')}-${month!.toString().padStart(2, '0')}-${day!.toString().padStart(2, '0')}`;
}

function classifyDateEvent(text: string, start: number, end: number): { event: string; certain: boolean } {
  const from = Math.max(0, start - 100);
  const to = Math.min(text.length, end + 55);
  const context = text.slice(from, to);
  const candidates: { event: string; pattern: RegExp; certain: boolean }[] = [
    { event: 'Document date', pattern: /document date|dated|prepared on|issued on/gi, certain: true },
    { event: 'Purchase date', pattern: /purchase date|purchased on|order placed on|ordered on/gi, certain: true },
    { event: 'Promised delivery date', pattern: /promised delivery|expected delivery|delivery promised/gi, certain: true },
    { event: 'Actual delivery date', pattern: /actual delivery|delivered on|delivered date/gi, certain: true },
    { event: 'Complaint date', pattern: /complaint date|complaint filed|complained on/gi, certain: true },
    { event: 'Incident date', pattern: /incident date|incident occurred|incident on/gi, certain: true },
    { event: 'Rejection date', pattern: /rejection date|rejected on|rejection email|rejection notice/gi, certain: true },
    { event: 'Follow-up date', pattern: /follow[ -]?up date|followed up on|follow-up email/gi, certain: true },
    { event: 'Hearing date', pattern: /hearing date|hearing scheduled/gi, certain: true },
    { event: 'Deadline', pattern: /deadline|due date|respond by/gi, certain: true },
    { event: 'Response date', pattern: /response date|responded on|reply dated/gi, certain: true },
    { event: 'Delivery date (type unclear)', pattern: /delivery date/gi, certain: false },
  ];
  let nearest: { event: string; certain: boolean; distance: number } | null = null;
  for (const candidate of candidates) {
    for (const match of context.matchAll(candidate.pattern)) {
      if (match.index === undefined) continue;
      const absolute = from + match.index;
      const distance = Math.abs(absolute - start);
      if (!nearest || distance < nearest.distance) nearest = { event: candidate.event, certain: candidate.certain, distance };
    }
  }
  return nearest ? { event: nearest.event, certain: nearest.certain } : { event: 'Date mentioned; event not stated', certain: false };
}

function extractTimeline(text: string): DocumentTimelineEntry[] {
  const found: { entry: DocumentTimelineEntry; order: number }[] = [];
  for (const match of text.matchAll(DATE_RE)) {
    if (match.index === undefined) continue;
    const originalDate = match[0];
    const isoDate = parseDate(originalDate);
    const start = match.index;
    const end = start + originalDate.length;
    const event = classifyDateEvent(text, start, end);
    const sourceText = text.slice(Math.max(0, start - 100), Math.min(text.length, end + 55)).trim().slice(0, 260);
    const entry: DocumentTimelineEntry = { event: event.event, originalDate, isoDate, status: isoDate && event.certain ? 'identified' : 'uncertain', sourceText };
    const key = `${entry.event.toLowerCase()}|${isoDate ?? originalDate.toLowerCase()}`;
    if (!found.some((item) => `${item.entry.event.toLowerCase()}|${item.entry.isoDate ?? item.entry.originalDate.toLowerCase()}` === key)) found.push({ entry, order: start });
  }
  return found.sort((a, b) => {
    if (a.entry.isoDate && b.entry.isoDate) return a.entry.isoDate.localeCompare(b.entry.isoDate) || a.order - b.order;
    if (a.entry.isoDate) return -1;
    if (b.entry.isoDate) return 1;
    return a.order - b.order;
  }).map(({ entry }) => entry);
}

function amountKind(text: string, amountStart: number, amountEnd: number): DocumentFinancialAmount['kind'] {
  const previousLineBreak = text.lastIndexOf('\n', amountStart - 1);
  const nextLineBreak = text.indexOf('\n', amountEnd);
  const windowStart = Math.max(previousLineBreak + 1, amountStart - 120);
  const windowEnd = Math.min(nextLineBreak < 0 ? text.length : nextLineBreak, amountEnd + 45);
  const context = text.slice(windowStart, windowEnd);
  const candidates: { kind: DocumentFinancialAmount['kind']; pattern: RegExp }[] = [
    { kind: 'refund_requested', pattern: /refund requested|refund amount|refund sought|requested refund/gi },
    { kind: 'claimed_amount', pattern: /claimed amount|claim amount|compensation claimed|damages claimed|amount claimed/gi },
    { kind: 'amount_paid', pattern: /amount paid|paid amount|purchase amount|purchase price|payment|paid\b/gi },
  ];
  let closest: { kind: DocumentFinancialAmount['kind']; distance: number } | null = null;
  for (const candidate of candidates) {
    for (const match of context.matchAll(candidate.pattern)) {
      if (match.index === undefined) continue;
      const phraseStart = windowStart + match.index;
      const phraseEnd = phraseStart + match[0].length;
      const distance = phraseEnd < amountStart ? amountStart - phraseEnd : phraseStart > amountEnd ? phraseStart - amountEnd : 0;
      if (!closest || distance < closest.distance) closest = { kind: candidate.kind, distance };
    }
  }
  return closest?.kind ?? 'other_amount';
}

function extractAmounts(text: string, fields: ReturnType<typeof extractLabeledFields>): DocumentFinancialAmount[] {
  const amounts: DocumentFinancialAmount[] = [];
  const add = (entry: DocumentFinancialAmount) => {
    const key = `${entry.kind}|${entry.amount.replace(/,/g, '')}`;
    const index = amounts.findIndex((item) => `${item.kind}|${item.amount.replace(/,/g, '')}` === key);
    if (index < 0) amounts.push(entry);
    else if (!amounts[index].currency && entry.currency) amounts[index] = entry;
  };
  for (const match of text.matchAll(MONEY_RE)) {
    if (match.index === undefined) continue;
    const original = match[0].trim();
    const start = match.index;
    const end = start + match[0].length;
    const sourceText = text.slice(Math.max(0, start - 90), Math.min(text.length, end + 65)).trim().slice(0, 240);
    const numeric = original.replace(/^₹\s*|^(?:INR|Rs\.?|Rupees?)\s*/i, '').trim();
    const type = amountKind(text, start, end);
    const currency = /^(?:₹|INR|Rs\.?|Rupees?)/i.test(original) ? 'INR' : null;
    add({ kind: type, original, amount: numeric, currency, status: currency ? 'identified' : 'uncertain', sourceText });
  }

  const bareAmountLabels: { labels: string[]; kind: DocumentFinancialAmount['kind'] }[] = [
    { labels: ['Amount Paid', 'Paid Amount', 'Purchase Amount'], kind: 'amount_paid' },
    { labels: ['Claimed Amount', 'Claim Amount', 'Compensation Claimed'], kind: 'claimed_amount' },
    { labels: ['Refund Requested', 'Refund Amount'], kind: 'refund_requested' },
  ];
  for (const group of bareAmountLabels) {
    for (const label of group.labels) {
      const field = findField(fields, label);
      if (!field) continue;
      const numericMatch = /\b(?:(?:\d{1,3}(?:,\d{3})+)|(?:\d{1,2}(?:,\d{2})*,\d{3})|\d+)(?:\.\d{1,2})?\b/.exec(field.value);
      if (!numericMatch) continue;
      const original = numericMatch[0];
      add({ kind: group.kind, original, amount: original, currency: null, status: 'uncertain', sourceText: field.sourceText });
    }
  }
  return amounts;
}

function extractIdentifiers(text: string, fields: ReturnType<typeof extractLabeledFields>) {
  const specs = [
    { labels: ['Reference ID', 'Reference No', 'Ref ID', 'Case Reference', 'Case ID'], canonical: 'Reference ID' },
    { labels: ['Order ID', 'Order No'], canonical: 'Order ID' },
    { labels: ['Support Ticket', 'Ticket ID'], canonical: 'Support ticket' },
  ];
  const identifiers: { label: string; value: string; sourceText: string }[] = [];
  for (const spec of specs) {
    for (const label of spec.labels) {
      const field = findField(fields, label);
      if (!field) continue;
      const value = /\b[A-Z0-9][A-Z0-9-]{3,}\b/.exec(field.value)?.[0];
      if (value) identifiers.push({ label: spec.canonical, value, sourceText: field.sourceText });
      break;
    }
  }
  for (const match of text.matchAll(ID_RE)) {
    if (match.index === undefined) continue;
    const start = match.index;
    const before = text.slice(Math.max(0, start - 45), start);
    const label = /support ticket|ticket id/i.test(before) ? 'Support ticket'
      : /order id|order no/i.test(before) ? 'Order ID'
        : /reference id|reference no|ref id|case reference|case id/i.test(before) ? 'Reference ID' : '';
    if (!label) continue;
    if (!identifiers.some((item) => item.label === label && item.value === match[0])) {
      identifiers.push({ label, value: match[0], sourceText: text.slice(Math.max(0, start - 50), Math.min(text.length, start + match[0].length + 30)).trim() });
    }
  }
  return identifiers;
}

function extractEvidence(text: string): DocumentEvidenceMention[] {
  const specs: { name: string; pattern: RegExp }[] = [
    { name: 'Order confirmation', pattern: /order confirmation(?: email)?/i },
    { name: 'Payment receipt', pattern: /payment receipt|receipt/i },
    { name: 'Unboxing video', pattern: /unboxing video|opening video/i },
    { name: 'Damage photographs', pattern: /damage photographs?|photos? of (?:the )?damage|photographs? of (?:the )?damage/i },
    { name: 'Rejection email', pattern: /rejection email|email rejecting/i },
    { name: 'Follow-up email', pattern: /follow[ -]?up email|followed up by email/i },
  ];
  const evidence: DocumentEvidenceMention[] = [];
  for (const spec of specs) {
    const match = spec.pattern.exec(text);
    if (!match || match.index === undefined) continue;
    const start = match.index;
    const context = text.slice(Math.max(0, start - 20), Math.min(text.length, start + match[0].length + 55)).trim();
    const explicitlyAbsent = /(?:not attached|not enclosed|not included|not provided|not submitted|was not attached|were not attached)/i.test(context);
    evidence.push({ name: spec.name, status: explicitlyAbsent ? 'mentioned_not_attached' : 'attachment_not_verified', sourceText: context.slice(0, 240) });
  }
  return evidence;
}

function extractFacts(text: string) {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z₹])/).map((part) => part.trim()).filter((part) => part.length > 18);
  const keywords = /complain|applicant|petitioner|plaintiff|respondent|opposite party|order|purchase|paid|payment|delivery|damage|defect|refund|rejected|support ticket|receipt|video|photograph|email|witness/i;
  const chosen = sentences.filter((sentence) => keywords.test(sentence)).slice(0, 8);
  return (chosen.length ? chosen : sentences.slice(0, 4)).map((sentence) => sentence.slice(0, 260));
}

export function analyzeDocument(text: string, fileName: string): DocumentAnalysisRun {
  const cleanText = text.replace(/\0/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const fields = extractLabeledFields(cleanText);
  const partyRoles = extractPartyRoles(fields);
  const timeline = extractTimeline(cleanText);
  const financialAmounts = extractAmounts(cleanText, fields);
  const identifiers = extractIdentifiers(cleanText, fields);
  const evidence = extractEvidence(cleanText);
  const keyPoints = extractFacts(cleanText);
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const extension = fileName.toLowerCase().split('.').pop();
  const documentType = extension === 'pdf' ? 'PDF' : extension === 'docx' ? 'DOCX' : extension === 'txt' ? 'TXT' : 'Unknown';
  const productField = findField(fields, 'Product');
  const modelField = findField(fields, 'Model');
  const productValue = productField?.value
    ? `${productField.value.replace(/[,;\s]+$/g, '')}${modelField?.value ? `, Model ${modelField.value}` : ''}`
    : modelField?.value ? `Model ${modelField.value}` : null;
  const product = { value: productValue, status: productValue ? 'identified' as const : 'not_stated' as const, sourceText: productField?.sourceText ?? modelField?.sourceText ?? null };
  const parties = [partyRoles.complainant, partyRoles.oppositeParty, ...partyRoles.otherNamedEntities]
    .filter((party) => party.name)
    .map((party) => `${party.role}: ${party.name}`);

  const missingInfo: string[] = [];
  if (partyRoles.complainant.status !== 'identified') missingInfo.push(partyRoles.complainant.status === 'not_stated' ? 'Complainant/applicant is not explicitly stated.' : 'Complainant/applicant identification is uncertain; review the source text.');
  if (partyRoles.oppositeParty.status !== 'identified') missingInfo.push(partyRoles.oppositeParty.status === 'not_stated' ? 'Opposite party/respondent is not explicitly stated.' : 'Opposite party/respondent identification is uncertain; review the source text.');
  if (!timeline.some((entry) => entry.event === 'Document date')) missingInfo.push('Document date was not explicitly identified.');
  if (timeline.length === 0) missingInfo.push('No dates were extractable from the text.');
  if (financialAmounts.length === 0) missingInfo.push('No explicit financial amount was extractable.');
  if (financialAmounts.some((amount) => !amount.currency)) missingInfo.push('At least one amount has no reliably extracted currency; verify it in the original.');
  if (!product.value) missingInfo.push('Product or subject matter is not explicitly identified.');
  if (evidence.some((item) => item.status === 'attachment_not_verified')) missingInfo.push('Evidence is mentioned, but the text-only extraction cannot confirm whether it is attached to the uploaded file.');
  if (!cleanText) missingInfo.push('No readable text was extracted from the document.');

  const reviewIssues = keyPoints.filter((point) => /damage|defect|delay|rejected|refund|dispute|failure|not delivered|late delivery/i.test(point));
  const questions = [
    'Which original records support each important date and amount?',
    'Are the evidence items mentioned in the text actually attached or otherwise available?',
    'Are any relevant messages, receipts, photographs or other records missing?',
    'What response or next step should be discussed with a qualified advocate?',
  ];
  if (missingInfo.length) questions.push('Can the missing or uncertain facts be confirmed from the original document or supporting records?');

  const overviewParts = [`${documentType} text extraction contains ${wordCount} words.`];
  const reference = identifiers.find((item) => item.label === 'Reference ID');
  if (reference) overviewParts.push(`Reference ID: ${reference.value}.`);
  if (partyRoles.complainant.name) overviewParts.push(`Complainant: ${partyRoles.complainant.name}.`);
  if (partyRoles.oppositeParty.name) overviewParts.push(`Opposite Party: ${partyRoles.oppositeParty.name}.`);
  if (product.value) overviewParts.push(`Product: ${product.value}.`);
  if (financialAmounts.length) overviewParts.push(`Financial amounts identified: ${financialAmounts.length}; check the original for currency certainty.`);
  const overview = overviewParts.join(' ');
  const detailedSummary = [
    `Document overview\n${overview}`,
    `Parties and roles\n${parties.length ? parties.join('\n') : 'No parties identified; review manually.'}`,
    `Key facts\n${keyPoints.length ? keyPoints.map((point) => `- ${point}`).join('\n') : 'No concise factual points could be extracted.'}`,
    `Timeline\n${timeline.length ? timeline.map((item) => `- ${item.event}: ${item.originalDate}${item.status === 'uncertain' ? ' (review)' : ''}`).join('\n') : 'No dates extracted.'}`,
    `Financial amounts\n${financialAmounts.length ? financialAmounts.map((item) => `- ${item.kind}: ${item.original}${item.currency ? '' : ' (currency uncertain)'}`).join('\n') : 'No amount extracted.'}`,
    `Evidence mentions\n${evidence.length ? evidence.map((item) => `- ${item.name}: ${item.status === 'mentioned_not_attached' ? 'explicitly not attached' : 'attachment not verified'}`).join('\n') : 'No listed evidence items were found.'}`,
    `Missing information\n${missingInfo.length ? missingInfo.map((item) => `- ${item}`).join('\n') : 'No specific extraction gaps detected; still review the source.'}`,
    'Automated extraction only; confirm details against the original. This is not legal advice.',
  ].join('\n\n');

  const result: DocumentAnalysisResult = {
    overview, quickSummary: overview, detailedSummary, parties, partyRoles, identifiers, product, timeline,
    dates: timeline.map((item) => `${item.event}: ${item.originalDate}`), financialAmounts, keyPoints, reviewIssues,
    evidence, missingInfo, questions, wordCount, documentType,
  };
  const verificationResult = verifyDocumentAnalysis(cleanText, result);
  const now = new Date().toISOString();
  return {
    result,
    verificationResult,
    verified: verificationResult.verified,
    executionLog: [
      { agent: 'document_analysis', status: 'completed', timestamp: now },
      { agent: 'document_verification', status: verificationResult.verified ? 'passed' : 'needs_review', timestamp: now },
    ],
  };
}

function verifyDocumentAnalysis(text: string, result: DocumentAnalysisResult): DocumentVerificationResult {
  const roleFields = [result.partyRoles.complainant, result.partyRoles.oppositeParty];
  const presentRoleFields = roleFields.filter((field) => field.status !== 'not_stated');
  const partyIssues = presentRoleFields.filter((field) => !field.name || !field.sourceText || !text.includes(field.name) || !text.includes(field.sourceText));
  const missingRoleFields = roleFields.filter((field) => field.status === 'not_stated');
  const partyCheck = presentRoleFields.length === 0
    ? check('Party roles', null, 'not_applicable', 'No explicit complainant or opposite-party role labels were found; this is missing information, not a confirmed extraction error.')
    : partyIssues.length
      ? check('Party roles', false, 'failed', 'At least one extracted party or role could not be matched to its source text.')
      : missingRoleFields.length
        ? check('Party roles', false, 'needs_review', `Extracted roles match the text, but ${missingRoleFields.map((field) => field.role).join(' and ')} are not explicitly stated.`)
        : check('Party roles', true, 'passed', 'Both identified role values and their source excerpts occur in the extracted document text.');

  const dateSourceIssues = result.timeline.filter((item) => !item.isoDate || !text.includes(item.originalDate) || !text.includes(item.sourceText));
  const dateCheck = result.timeline.length === 0
    ? check('Important dates', null, 'not_applicable', 'No date was found in the extracted text; no date-accuracy failure is inferred.')
    : dateSourceIssues.length
      ? check('Important dates', false, 'needs_review', `${dateSourceIssues.length} date entry/entries are invalid, uncertain, or lack matching source text.`)
      : check('Important dates', true, 'passed', `${result.timeline.length} unique dated event(s) match the extracted text and are chronologically sorted.`);

  const amountIssues = result.financialAmounts.filter((item) => !text.includes(item.original) || !text.includes(item.sourceText) || !item.currency);
  const amountCheck = result.financialAmounts.length === 0
    ? check('Financial amounts', null, 'not_applicable', 'No explicit amount was found; order IDs and other numeric identifiers were not treated as currency.')
    : amountIssues.length
      ? check('Financial amounts', false, 'needs_review', `${amountIssues.length} amount(s) require review because currency is missing/uncertain or source-text matching failed.`)
      : check('Financial amounts', true, 'passed', `${result.financialAmounts.length} amount(s) preserve their explicit INR currency and match source text.`);

  const claims = [
    ...result.keyPoints,
    ...result.identifiers.map((item) => item.value),
    ...(result.product.value ? [result.product.value] : []),
    ...result.partyRoles.complainant.name ? [result.partyRoles.complainant.name] : [],
    ...result.partyRoles.oppositeParty.name ? [result.partyRoles.oppositeParty.name] : [],
    ...result.timeline.map((item) => item.originalDate),
    ...result.financialAmounts.map((item) => item.original),
  ];
  const unsupportedClaims = claims.filter((claim) => !text.includes(claim));
  const summaryCheck = claims.length === 0
    ? check('Summary consistency', null, 'not_applicable', 'There are no extracted factual claims to compare; manually review the document.')
    : unsupportedClaims.length
      ? check('Summary consistency', false, 'failed', `${unsupportedClaims.length} output value(s) do not exactly occur in the extracted text.`)
      : check('Summary consistency', true, 'passed', 'Every extracted factual summary value is supported by an exact source-text occurrence.');

  const checks = [partyCheck, dateCheck, amountCheck, summaryCheck];
  const verified = checks.every((item) => item.status === 'passed');
  const counts = {
    passed: checks.filter((item) => item.status === 'passed').length,
    failed: checks.filter((item) => item.status === 'failed').length,
    review: checks.filter((item) => item.status === 'needs_review').length,
    notApplicable: checks.filter((item) => item.status === 'not_applicable').length,
  };
  const summary = `Document verification: ${counts.passed} confirmed, ${counts.review} need review, ${counts.failed} failed, ${counts.notApplicable} not applicable. Review each check and compare with the original.`;
  return { verified, checks, summary };
}

function check(name: string, passed: boolean | null, status: DocumentVerificationResult['checks'][number]['status'], detail: string): DocumentVerificationResult['checks'][number] {
  return { name, passed, status, detail };
}
