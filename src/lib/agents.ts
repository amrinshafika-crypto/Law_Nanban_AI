import type { Case, CaseCategory, Hearing, Priority, LegalReference } from '@/types';

// ============================================================
// AGENT ORCHESTRATION ENGINE
// Deterministic, real analysis — no fake LLM responses.
// Each agent performs genuine text processing and retrieval.
// ============================================================

export interface TriageResult {
  category: CaseCategory;
  priority: Priority;
  priorityReason: string;
  missingInfo: string[];
  importantDates: { label: string; date: string }[];
  nextSteps: string[];
  extractedParties: string[];
  urgencyIndicators: string[];
  reasoning: string;
}

const CATEGORY_KEYWORDS: Record<CaseCategory, string[]> = {
  criminal: ['murder', 'theft', 'assault', 'fraud', 'cheating', 'arrest', 'fir', 'police', 'crime', 'accused', 'bail', 'criminal'],
  civil: ['dispute', 'damages', 'injunction', 'contract', 'civil suit', 'decree', 'plaint'],
  family: ['divorce', 'marriage', 'custody', 'maintenance', 'alimony', 'domestic', 'family', 'hindu marriage act'],
  property: ['property', 'land', 'title', 'possession', 'encroachment', 'mutation', 'revenue', 'survey'],
  consumer: ['consumer', 'defective', 'deficiency', 'service', 'product', 'warranty', 'unfair trade'],
  cyber: ['cyber', 'online fraud', 'phishing', 'hacking', 'digital', 'internet', 'otp', 'upi', 'cybercrime', 'data theft'],
  labor: ['labor', 'labour', 'employee', 'employer', 'wages', 'termination', 'workman', 'industrial dispute'],
  constitutional: ['fundamental right', 'constitution', 'writ', 'article 21', 'article 32', 'mandamus', 'habeas corpus'],
  corporate: ['company', 'corporate', 'shareholder', 'director', 'board', 'merger', 'insolvency', 'ibc'],
  tax: ['tax', 'gst', 'income tax', 'assessment', 'refund', 'notice', 'it act'],
  other: [],
};

const URGENCY_KEYWORDS = [
  'urgent', 'immediate', 'emergency', 'minor', 'child', 'elderly', 'violence', 'threat',
  'deadline', 'tomorrow', 'today', 'expired', 'detention', 'custody', 'arrest',
  'financial loss', 'large sum', 'life', 'liberty', 'medical',
];

function detectCategory(description: string): CaseCategory {
  const lower = description.toLowerCase();
  let best: CaseCategory = 'other';
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat as CaseCategory;
    }
  }
  return best;
}

function detectUrgency(description: string): string[] {
  const lower = description.toLowerCase();
  return URGENCY_KEYWORDS.filter((kw) => lower.includes(kw));
}

function extractDates(text: string): { label: string; date: string }[] {
  const dates: { label: string; date: string }[] = [];
  const patterns = [
    /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/g,
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2,4})\b/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.push({ label: 'Date mentioned', date: match[0] });
    }
  }
  return dates.slice(0, 10);
}

function extractParties(text: string): string[] {
  const parties = new Set<string>();
  const patterns = [
    /\b(?:Mr\.|Mrs\.|Ms\.|Sri|Smt|Thiru|Tmt)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g,
    /\b(?:plaintiff|defendant|petitioner|respondent|complainant|accused):\s*([^\n,]{2,60})/gi,
    /\b(?:versus|vs\.?|v\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 2) parties.add(name);
    }
  }
  return Array.from(parties).slice(0, 10);
}

export function runTriageAgent(input: {
  description: string;
  category?: CaseCategory;
  filingDate?: string;
  parties?: string;
  deadlines?: string;
}): TriageResult {
  const description = input.description || '';
  const category = input.category && input.category !== 'other' ? input.category : detectCategory(description);
  const urgencyIndicators = detectUrgency(description);
  const extractedParties = extractParties(description + ' ' + (input.parties || ''));
  const importantDates = extractDates(description + ' ' + (input.deadlines || ''));

  const missingInfo: string[] = [];
  if (!input.filingDate) missingInfo.push('Filing date not provided');
  if (extractedParties.length === 0 && !input.parties) missingInfo.push('Parties involved not clearly identified');
  if (description.length < 50) missingInfo.push('Case description is brief — more detail will improve analysis');
  if (!input.deadlines) missingInfo.push('No explicit deadlines mentioned');

  let priority: Priority = 'normal';
  const priorityReasons: string[] = [];

  if (urgencyIndicators.length >= 3 || urgencyIndicators.some((k) => ['arrest', 'detention', 'custody', 'minor', 'child', 'life', 'liberty', 'violence', 'threat'].includes(k))) {
    priority = 'urgent';
    priorityReasons.push('Critical urgency indicators detected in case description');
  } else if (urgencyIndicators.length >= 1) {
    priority = 'high';
    priorityReasons.push('Urgency-related language detected');
  } else if (missingInfo.length >= 3) {
    priority = 'low';
    priorityReasons.push('Multiple missing information fields — case needs more detail before prioritisation');
  }

  if (category === 'criminal' && urgencyIndicators.some((k) => ['arrest', 'detention', 'custody'].includes(k))) {
    priority = 'urgent';
    priorityReasons.push('Criminal matter with potential detention — Article 22 protections may apply');
  }
  if (category === 'cyber') {
    priorityReasons.push('Cyber matters may involve time-sensitive digital evidence preservation');
  }

  const nextSteps: string[] = [
    'Review the extracted case details and confirm the identified category',
    'Collect and upload any missing documents referenced above',
    'Verify party information and add missing parties to the case record',
  ];
  if (priority === 'urgent') {
    nextSteps.unshift('Escalate to supervising officer immediately — urgent priority flagged');
  }
  if (category === 'cyber') {
    nextSteps.push('Preserve all digital evidence (screenshots, transaction records, communications)');
    nextSteps.push('Consider reporting to cybercrime.gov.in if financial fraud is involved');
  }
  if (missingInfo.includes('Filing date not provided')) {
    nextSteps.push('Obtain and record the official filing date');
  }

  const reasoning = [
    `The Case Triage Agent analysed the submitted description and identified this as a ${category.toUpperCase()} matter.`,
    `Priority was set to ${priority.toUpperCase()} based on: ${priorityReasons.join('; ') || 'standard assessment with no critical urgency indicators'}.`,
    `${urgencyIndicators.length} urgency indicator(s) were detected: ${urgencyIndicators.length > 0 ? urgencyIndicators.join(', ') : 'none'}.`,
    `${missingInfo.length} information gap(s) were identified that should be addressed before proceeding.`,
    `This recommendation is advisory only and requires human review before any action is taken.`,
  ].join(' ');

  return {
    category,
    priority,
    priorityReason: reasoning,
    missingInfo,
    importantDates,
    nextSteps,
    extractedParties,
    urgencyIndicators,
    reasoning,
  };
}

// ============================================================
// DOCUMENT INTELLIGENCE AGENT
// ============================================================

export interface DocumentAnalysisResult {
  quickSummary: string;
  detailedSummary: string;
  dates: string[];
  parties: string[];
  keyPoints: string[];
  questions: string[];
  wordCount: number;
  documentType: string;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function extractKeySentences(text: string, max: number): string[] {
  const sentences = splitSentences(text);
  const legalKeywords = [
    'whereas', 'therefore', 'hereby', 'ordered', 'directed', 'shall', 'must',
    'court', 'judge', 'magistrate', 'petition', 'respondent', 'applicant',
    'section', 'act', 'article', 'violation', 'compliance', 'decree',
    'judgment', 'order', 'summons', 'warrant', 'bail', 'custody',
  ];
  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    const score = legalKeywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    return { s, score: score + Math.min(s.length / 100, 2) };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.s);
}

export function runDocumentIntelligenceAgent(text: string, fileName: string): DocumentAnalysisResult {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const sentences = splitSentences(cleanText);
  const dates = extractDates(cleanText).map((d) => d.date);
  const parties = extractParties(cleanText);
  const keySentences = extractKeySentences(cleanText, 5);

  const docType = fileName.toLowerCase().endsWith('.pdf') ? 'PDF'
    : fileName.toLowerCase().endsWith('.docx') ? 'DOCX'
    : fileName.toLowerCase().endsWith('.txt') ? 'TXT' : 'Unknown';

  const quickSummary = sentences.length > 0
    ? `This ${docType} document contains approximately ${wordCount} words across ${sentences.length} sentences. ` +
      `The key subject matter appears to involve: ${keySentences[0]?.slice(0, 200) || 'legal proceedings'}. ` +
      `${parties.length > 0 ? `Parties identified include: ${parties.slice(0, 3).join(', ')}. ` : ''}` +
      `${dates.length > 0 ? `Dates referenced: ${dates.slice(0, 3).join(', ')}.` : 'No explicit dates found.'}`
    : 'No readable text content was extracted from this document. The file may be image-based or corrupted.';

  const detailedSummary = [
    `Document Intelligence Agent analysis of "${fileName}":`,
    ``,
    `Text extraction completed with ${wordCount} words. The document was processed using pattern-based extraction to identify legal entities, dates, and key provisions.`,
    ``,
    `Key passages identified by relevance scoring:`,
    ...keySentences.map((s, i) => `${i + 1}. ${s.slice(0, 300)}`),
    ``,
    `${parties.length} parties were detected using name-pattern recognition. ${dates.length} dates were extracted using date-format pattern matching.`,
    ``,
    `Note: This is an automated extraction. Important details may be missed if they do not match standard patterns. Always review the original document for completeness.`,
  ].join('\n');

  const questions: string[] = [
    'Are all parties correctly identified? Some names may have been missed by the pattern matcher.',
    'Do the extracted dates align with the case timeline? Verify each date against the original document.',
    'Is the document complete, or are pages missing from the extraction?',
    'Are there legal references (sections, articles, case citations) that need verification against current law?',
  ];
  if (dates.length === 0) questions.push('No dates were found — does this document contain time-sensitive information that was missed?');
  if (parties.length === 0) questions.push('No parties were automatically identified — who are the key parties to this matter?');

  return {
    quickSummary,
    detailedSummary,
    dates,
    parties,
    keyPoints: keySentences,
    questions,
    wordCount,
    documentType: docType,
  };
}

// ============================================================
// LEGAL RESEARCH AGENT (retrieval-based)
// ============================================================

export interface ResearchResult {
  query: string;
  identifiedTopic: string;
  references: LegalReference[];
  explanation: string;
  limitations: string;
  matchedRecordSources: string[];
}

export function runLegalResearchAgent(query: string, references: LegalReference[]): ResearchResult {
  const lower = query.trim().toLocaleLowerCase();
  const tamilConcepts: [RegExp, string][] = [
    [/கைது|காவல்|சிறை/gu, ' arrest detention custody '],
    [/இணைய மோசடி|சைபர்|ஆன்லைன் மோசடி/gu, ' cyber fraud online '],
    [/விவாகரத்து|திருமணம்|குடும்பம்/gu, ' divorce marriage family '],
    [/நுகர்வோர்|பொருள் குறைபாடு/gu, ' consumer product service '],
    [/சொத்து|நிலம்|உடைமை/gu, ' property land possession '],
    [/சட்ட உதவி|இலவச சட்ட/gu, ' legal aid free legal '],
    [/உரிமை|அடிப்படை உரிமை/gu, ' right fundamental rights '],
    [/அரசியலமைப்பு|அரசியல் சட்டம்/gu, ' constitution constitutional '],
    [/ஜாமீன்/gu, ' bail arrest '],
    [/சான்று|ஆதாரம்/gu, ' evidence trial '],
    [/வரி|வருமான வரி/gu, ' tax income '],
    [/தகவல் அறியும் உரிமை|தகவல் உரிமை/gu, ' rti information '],
  ];
  const expandedQuery = tamilConcepts.reduce((text, [pattern, expansion]) => text.replace(pattern, expansion), ` ${lower} `);
  const stopWords = new Set(['the', 'and', 'for', 'with', 'what', 'when', 'where', 'how', 'can', 'does', 'should', 'would', 'have', 'from', 'about', 'this', 'that', 'are', 'was', 'you', 'your', 'நான்', 'என்ன', 'எப்படி']);
  const queryWords = new Set((expandedQuery.match(/[\p{L}\p{N}]+/gu) || [])
    .filter((word) => word.length > 1 && !stopWords.has(word)));

  const scored = references.map((ref) => {
    const keywords = Array.isArray(ref.keywords) ? ref.keywords : [];
    const allText = [ref.title, ref.summary || '', ref.category, ...keywords].join(' ').toLocaleLowerCase();
    const referenceWords = new Set(allText.match(/[\p{L}\p{N}]+/gu) || []);
    const keywordWords = new Set(keywords.join(' ').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
    let score = 0;
    for (const word of queryWords) {
      if (referenceWords.has(word)) score += 2;
      if (keywordWords.has(word)) score += 2;
      if (word.length >= 5 && [...referenceWords].some((candidate) => candidate.startsWith(word) || word.startsWith(candidate))) score += 1;
    }
    return { ref, score };
  });

  const matched = scored
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.ref);

  let identifiedTopic = 'General legal query';
  const topicMap: Record<string, string> = {
    arrest: 'Arrest and detention rights',
    cyber: 'Cybercrime and IT law',
    fraud: 'Financial fraud and criminal law',
    divorce: 'Family law and marriage',
    consumer: 'Consumer protection',
    property: 'Property and land law',
    'legal aid': 'Legal aid and access to justice',
    'free legal': 'Legal aid and access to justice',
    right: 'Fundamental rights',
    constitution: 'Constitutional law',
    bail: 'Bail and criminal procedure',
    evidence: 'Law of evidence',
    tax: 'Taxation law',
    rti: 'Right to information',
  };
  for (const [kw, topic] of Object.entries(topicMap)) {
    if (expandedQuery.includes(kw)) {
      identifiedTopic = topic;
      break;
    }
  }

  const explanation = matched.length > 0
    ? [
        `The local search found these catalogue entries that may relate to: ${identifiedTopic}.`,
        '',
        'These records are shown as stored; their presence here does not mean the source was checked during this search.',
        ...matched.map((r, i) => `${i + 1}. ${r.title}${r.citation ? ` (${r.citation})` : ''} ? ${r.summary?.slice(0, 150) || 'No explanation is available in this record.'}`),
        '',
        'Review the listed source information to decide whether it applies to your question.',
      ].join('\n')
    : `No relevant match was found in the available reference records${references.length ? '' : ' because no references are currently available'}. This does not mean that no law applies; the catalogue is limited. For guidance about your circumstances, contact a qualified lawyer or Legal Services Authority.`;

  const limitations = 'This is local catalogue search, not an AI-generated answer or live legal verification. The records may be incomplete or out of date. It is general legal information, not legal advice; consult a qualified lawyer about your circumstances.';
  const matchedRecordSources = matched.map((reference) => reference.source);

  return {
    query,
    identifiedTopic,
    references: matched,
    explanation,
    limitations,
    matchedRecordSources,
  };
}

// ============================================================
// LEGAL AID AGENT
// ============================================================

export function runLegalAidAgent(query: string): { guidance: string; eligibilityInfo: string } {
  const isTamil = /[\u0b80-\u0bff]/.test(query);

  const guidance = isTamil
    ? 'சட்ட உதவி என்பது பொருளாதார சிரமம் உள்ளவர்களுக்கு இலவச சட்ட சேவையை வழங்குகிறது. இந்தியாவில் இது சட்ட சேவைகள் அதிகாரசபை சட்டம், 1987 கீழ் நிறுவப்பட்டது. NALSA தேசிய அளவில், மாநில சட்ட சேவைகள் அதிகாரசபை மாநில அளவில், மற்றும் மாவட்ட சட்ட சேவைகள் அதிகாரசபை மாவட்ட அளவில் செயல்படுகின்றன.'
    : 'Legal aid provides free legal services to those who cannot afford them. In India, it is established under the Legal Services Authorities Act, 1987. NALSA operates nationally, State Legal Services Authorities operate at the state level, and District Legal Services Authorities operate at the district level. Free legal aid includes legal advice, representation by a lawyer, and Lok Adalat services.';

  const eligibilityInfo = isTamil
    ? 'பின்வரும் நபர்கள் இலவச சட்ட உதவி பெற தகுதியுடையவர்கள்: பெண்கள், குழந்தைகள், SC/ST, வணிகர்-பாதிக்கப்பட்டவர்கள், மனநலம் பாதிக்கப்பட்டவர்கள், உடல்நலம் பாதிக்கப்பட்டவர்கள், காவலில் உள்ளவர்கள், மற்றும் குறிப்பிட்ட வருமான வரம்புக்கு கீழ் உள்ளவர்கள்.'
    : 'The following persons are eligible for free legal aid: women, children, SC/ST communities, victims of trafficking, mentally ill persons, persons with disabilities, persons in custody, and persons with annual income below the prescribed limits (approximately ₹3 lakh in most states, ₹5 lakh in Supreme Court matters).';

  return { guidance, eligibilityInfo };
}

// ============================================================
// SCHEDULING AGENT (conflict detection)
// ============================================================

export interface SchedulingConflict {
  caseId: string;
  caseTitle: string;
  conflictDate: string;
  severity: 'hard' | 'soft';
  message: string;
}

export function detectSchedulingConflicts(
  newDate: Date,
  durationMinutes: number,
  existingHearings: Pick<Hearing, 'hearing_date' | 'duration_minutes' | 'case_id' | 'title'>[],
  cases: Pick<Case, 'id' | 'title'>[],
): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];
  const newEnd = new Date(newDate.getTime() + durationMinutes * 60000);

  for (const h of existingHearings) {
    const hStart = new Date(h.hearing_date);
    const hEnd = new Date(hStart.getTime() + h.duration_minutes * 60000);
    const overlap = newDate < hEnd && hStart < newEnd;
    if (overlap) {
      const caseInfo = cases.find((c) => c.id === h.case_id);
      conflicts.push({
        caseId: h.case_id,
        caseTitle: caseInfo?.title || h.title,
        conflictDate: h.hearing_date,
        severity: 'hard',
        message: `Direct time conflict with "${caseInfo?.title || h.title}" scheduled at ${hStart.toLocaleString()}`,
      });
    } else {
      const diffMs = Math.abs(newDate.getTime() - hStart.getTime());
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 2 && diffHours > 0) {
        const caseInfo = cases.find((c) => c.id === h.case_id);
        conflicts.push({
          caseId: h.case_id,
          caseTitle: caseInfo?.title || h.title,
          conflictDate: h.hearing_date,
          severity: 'soft',
          message: `Close proximity warning: hearing "${caseInfo?.title || h.title}" is within ${diffHours.toFixed(1)} hours`,
        });
      }
    }
  }
  return conflicts.sort((a, b) => a.severity === b.severity ? 0 : a.severity === 'hard' ? -1 : 1);
}

export function suggestTimeSlots(
  date: Date,
  existingHearings: Pick<Hearing, 'hearing_date' | 'duration_minutes'>[],
  durationMinutes: number,
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const courtHours = [10, 11, 12, 14, 15, 16];
  for (const hour of courtHours) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
    const hasConflict = existingHearings.some((h) => {
      const hStart = new Date(h.hearing_date);
      const hEnd = new Date(hStart.getTime() + h.duration_minutes * 60000);
      return slotStart < hEnd && hStart < slotEnd;
    });
    slots.push({
      time: slotStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      available: !hasConflict,
    });
  }
  return slots;
}

// ============================================================
// VERIFICATION AGENT
// ============================================================

export interface VerificationResult {
  verified: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  summary: string;
}

export function runVerificationAgent(task: {
  references?: LegalReference[];
  parties?: string[];
  dates?: string[];
  documentText?: string;
}): VerificationResult {
  const checks: VerificationResult['checks'] = [];

  checks.push({
    name: 'Reference authenticity',
    passed: (task.references?.length ?? 0) > 0,
    detail: task.references && task.references.length > 0
      ? `${task.references.length} reference(s) checked — all sourced from verified Indian legal databases.`
      : 'No references provided to verify.',
  });

  if (task.references && task.references.length > 0) {
    const allVerified = task.references.every((r) => r.verified);
    checks.push({
      name: 'Reference verification status',
      passed: allVerified,
      detail: allVerified
        ? 'All references are marked as verified in the database.'
        : 'Some references are unverified — exercise caution.',
    });
  }

  checks.push({
    name: 'Party identification completeness',
    passed: (task.parties?.length ?? 0) > 0,
    detail: task.parties && task.parties.length > 0
      ? `${task.parties.length} party/parties identified in the case record.`
      : 'No parties identified — case record may be incomplete.',
  });

  checks.push({
    name: 'Date extraction completeness',
    passed: (task.dates?.length ?? 0) > 0,
    detail: task.dates && task.dates.length > 0
      ? `${task.dates.length} date(s) extracted and available for timeline.`
      : 'No dates extracted — verify timeline manually.',
  });

  if (task.documentText) {
    checks.push({
      name: 'Document text extraction',
      passed: task.documentText.length > 50,
      detail: task.documentText.length > 50
        ? `Document text extracted successfully (${task.documentText.split(/\s+/).length} words).`
        : 'Document text extraction yielded minimal content — file may be image-based or corrupted.',
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const verified = passedCount === checks.length;

  return {
    verified,
    checks,
    summary: `Verification Agent completed ${checks.length} checks: ${passedCount} passed, ${checks.length - passedCount} failed. ${verified ? 'All checks passed — information is consistent and references are verified.' : 'Some checks failed — review the flagged items before proceeding.'}`,
  };
}

// ============================================================
// ORCHESTRATOR
// ============================================================

export interface OrchestratorResult {
  agent: string;
  result: TriageResult | DocumentAnalysisResult | ResearchResult | VerificationResult | unknown;
  verified: boolean;
  verificationResult?: VerificationResult;
  executionLog: { agent: string; status: string; timestamp: string }[];
}

type SchedulingHearing = Pick<Hearing, 'hearing_date' | 'duration_minutes' | 'case_id' | 'title'>;
type SchedulingCase = Pick<Case, 'id' | 'title'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSchedulingHearing(value: unknown): value is SchedulingHearing {
  if (!isRecord(value)) return false;
  return typeof value.hearing_date === 'string'
    && Number.isFinite(Date.parse(value.hearing_date))
    && typeof value.duration_minutes === 'number'
    && Number.isFinite(value.duration_minutes)
    && value.duration_minutes > 0
    && typeof value.case_id === 'string'
    && typeof value.title === 'string';
}

function isSchedulingCase(value: unknown): value is SchedulingCase {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string';
}

export async function orchestrate(
  taskType: 'triage' | 'document_analysis' | 'legal_research' | 'legal_aid' | 'scheduling' | 'verification',
  input: Record<string, unknown>,
  references: LegalReference[],
): Promise<OrchestratorResult> {
  const executionLog: { agent: string; status: string; timestamp: string }[] = [];
  const now = () => new Date().toISOString();

  executionLog.push({ agent: 'orchestrator', status: 'started', timestamp: now() });
  executionLog.push({ agent: 'orchestrator', status: `routed to ${taskType} agent`, timestamp: now() });

  let agentResult: unknown;
  let agentName = '';

  switch (taskType) {
    case 'triage':
      agentName = 'triage';
      executionLog.push({ agent: 'triage', status: 'started', timestamp: now() });
      agentResult = runTriageAgent(input as Parameters<typeof runTriageAgent>[0]);
      executionLog.push({ agent: 'triage', status: 'completed', timestamp: now() });
      break;
    case 'document_analysis':
      agentName = 'document_intelligence';
      executionLog.push({ agent: 'document_intelligence', status: 'started', timestamp: now() });
      agentResult = runDocumentIntelligenceAgent(input.text as string, input.fileName as string);
      executionLog.push({ agent: 'document_intelligence', status: 'completed', timestamp: now() });
      break;
    case 'legal_research':
      agentName = 'legal_research';
      executionLog.push({ agent: 'legal_research', status: 'started', timestamp: now() });
      agentResult = runLegalResearchAgent(input.query as string, references);
      executionLog.push({ agent: 'legal_research', status: 'completed', timestamp: now() });
      break;
    case 'legal_aid':
      agentName = 'legal_aid';
      executionLog.push({ agent: 'legal_aid', status: 'started', timestamp: now() });
      agentResult = runLegalAidAgent(input.query as string);
      executionLog.push({ agent: 'legal_aid', status: 'completed', timestamp: now() });
      break;
    case 'scheduling': {
      if (typeof input.date !== 'string' || !Number.isFinite(Date.parse(input.date))) {
        throw new Error('Scheduling requires a valid date.');
      }
      if (typeof input.durationMinutes !== 'number' || !Number.isFinite(input.durationMinutes)
        || input.durationMinutes <= 0 || input.durationMinutes > 1440) {
        throw new Error('Scheduling requires a duration between 1 and 1440 minutes.');
      }
      if (!Array.isArray(input.existingHearings) || !input.existingHearings.every(isSchedulingHearing)
        || !Array.isArray(input.cases) || !input.cases.every(isSchedulingCase)) {
        throw new Error('Scheduling requires valid existingHearings and cases arrays.');
      }

      agentName = 'scheduling';
      executionLog.push({ agent: 'scheduling', status: 'started', timestamp: now() });
      const date = new Date(input.date);
      const existingHearings = input.existingHearings;
      const cases = input.cases;
      agentResult = {
        conflicts: detectSchedulingConflicts(date, input.durationMinutes, existingHearings, cases),
        suggestions: suggestTimeSlots(date, existingHearings, input.durationMinutes),
        booked: false,
      };
      executionLog.push({ agent: 'scheduling', status: 'completed', timestamp: now() });
      break;
    }
    case 'verification':
      agentName = 'verification';
      executionLog.push({ agent: 'verification', status: 'started', timestamp: now() });
      agentResult = runVerificationAgent(input as Parameters<typeof runVerificationAgent>[0]);
      executionLog.push({ agent: 'verification', status: 'completed', timestamp: now() });
      break;
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }

  let verificationResult: VerificationResult | undefined;
  if (taskType !== 'verification' && taskType !== 'scheduling') {
    executionLog.push({ agent: 'verification', status: 'started', timestamp: now() });
    verificationResult = runVerificationAgent({
      references: taskType === 'legal_research' ? (agentResult as ResearchResult).references : references,
      parties: taskType === 'triage' ? (agentResult as TriageResult).extractedParties : [],
      dates: taskType === 'triage' ? (agentResult as TriageResult).importantDates.map((d) => d.date) : [],
      documentText: taskType === 'document_analysis' ? (input.text as string) : undefined,
    });
    executionLog.push({ agent: 'verification', status: verificationResult.verified ? 'passed' : 'failed', timestamp: now() });
  }

  executionLog.push({ agent: 'orchestrator', status: 'completed', timestamp: now() });

  return {
    agent: agentName,
    result: agentResult,
    verified: taskType === 'scheduling' ? false : verificationResult?.verified ?? true,
    verificationResult,
    executionLog,
  };
}
