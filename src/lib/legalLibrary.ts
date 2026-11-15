import centralActsJson from '../../legal-datasets/metadata/central-acts.json';
import stateActsJson from '../../legal-datasets/metadata/tamil-nadu-acts.json';

export type LibraryJurisdiction = 'Tamil Nadu State Law' | 'Central Law applicable in Tamil Nadu';

export const LEGAL_LIBRARY_CATEGORIES = [
  'Education and Student Rights',
  'Women and Child Protection',
  'Employment and Workplace Rights',
  'Disability Rights',
  'Consumer Rights',
  'Constitutional Rights',
  'Criminal Law and Public Safety',
  'Family and Social Welfare',
  'Other Legislation',
] as const;

export type LibraryCategory = (typeof LEGAL_LIBRARY_CATEGORIES)[number];

export interface LegalLibrarySection {
  id: string;
  number: string;
  title: string;
  legalText: string;
  sourcePageStart?: number | null;
  sourcePageEnd?: number | null;
  sourceUrl?: string | null;
  consolidatedAsOf?: string | null;
  extractionStatus: string;
  reviewStatus: string;
  verified: boolean;
}

export interface LegalLibraryAct {
  id: string;
  slug: string;
  title: string;
  shortTitle: string | null;
  actNumber: string | null;
  actYear: string | null;
  jurisdiction: LibraryJurisdiction;
  category: LibraryCategory;
  applicableTerritory: string | null;
  officialSourceName: string | null;
  officialSourceUrl: string | null;
  effectiveDate: string | null;
  consolidationDate: string | null;
  verificationStatus: string;
  verified: boolean;
  summary: string | null;
  keywords: string[];
  sections: LegalLibrarySection[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCamelRecord(record: JsonRecord | null | undefined): JsonRecord {
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()), value,
  ]));
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeSection(rawSection: JsonRecord | null | undefined): LegalLibrarySection {
  const section = toCamelRecord(rawSection ?? {});
  const number = String(section.number ?? '');
  const start = typeof section.sourcePageStart === 'number' ? section.sourcePageStart : typeof section.sourcePageStart === 'string' ? Number(section.sourcePageStart) : null;
  const end = typeof section.sourcePageEnd === 'number' ? section.sourcePageEnd : typeof section.sourcePageEnd === 'string' ? Number(section.sourcePageEnd) : null;
  return {
    id: String(section.id ?? `${number}-section`),
    number,
    title: String(section.title ?? 'Untitled section'),
    legalText: String(section.legalText ?? ''),
    sourcePageStart: Number.isFinite(start) ? start : null,
    sourcePageEnd: Number.isFinite(end) ? end : null,
    sourceUrl: textOrNull(section.sourceUrl ?? section.sourceURL),
    consolidatedAsOf: textOrNull(section.consolidatedAsOf),
    extractionStatus: typeof section.extractionStatus === 'string' ? section.extractionStatus : 'needs_manual_review',
    reviewStatus: typeof section.reviewStatus === 'string' ? section.reviewStatus : (section.verified ? 'Verified' : 'Under review'),
    verified: Boolean(section.verified),
  };
}

function normalizeAct(rawAct: JsonRecord | null | undefined): LegalLibraryAct {
  const act = toCamelRecord(rawAct ?? {});
  const rawCategory = typeof act.category === 'string' ? act.category : '';
  const category = LEGAL_LIBRARY_CATEGORIES.includes(rawCategory as LibraryCategory)
    ? (rawCategory as LibraryCategory)
    : 'Other Legislation';

  return {
    id: String(act.id ?? ''),
    slug: String(act.slug ?? ''),
    title: String(act.title ?? 'Untitled Act'),
    shortTitle: textOrNull(act.shortTitle ?? act.short_title),
    actNumber: textOrNull(act.actNumber ?? act.act_number),
    actYear: textOrNull(act.actYear ?? act.act_year),
    jurisdiction: act.jurisdiction === 'Tamil Nadu State Law'
      ? 'Tamil Nadu State Law'
      : 'Central Law applicable in Tamil Nadu',
    category,
    applicableTerritory: textOrNull(act.applicableTerritory ?? act.applicable_territory),
    officialSourceName: textOrNull(act.officialSourceName ?? act.official_source_name),
    officialSourceUrl: textOrNull(act.officialSourceUrl ?? act.official_source_url),
    effectiveDate: textOrNull(act.effectiveDate ?? act.effective_date),
    consolidationDate: textOrNull(act.consolidationDate ?? act.consolidation_date),
    verificationStatus: typeof (act.verificationStatus ?? act.verification_status) === 'string' ? String(act.verificationStatus ?? act.verification_status) : 'Metadata only',
    verified: Boolean(act.verified),
    summary: textOrNull(act.summary),
    keywords: Array.isArray(act.keywords) ? act.keywords.map((keyword) => String(keyword)) : [],
    sections: Array.isArray(act.sections) ? act.sections.filter(isRecord).map((section) => normalizeSection(section)) : [],
  };
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

const datasetActs = [
  ...records(centralActsJson).map((entry) => normalizeAct(entry)),
  ...records(stateActsJson).map((entry) => normalizeAct(entry)),
];

export const legalLibraryActs: LegalLibraryAct[] = datasetActs;

export function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function getJurisdictionName(jurisdiction: LibraryJurisdiction) {
  return jurisdiction === 'Tamil Nadu State Law' ? 'Tamil Nadu State Laws' : 'Central Laws';
}

export function generateSectionExplanation(act: LegalLibraryAct, section: LegalLibrarySection, lang: 'en' | 'ta') {
  const sectionText = section.legalText || 'Official legal text is not available for this section in the current source material.';
  const lead = lang === 'ta'
    ? `இந்தப் பிரிவு ${act.title} (${section.number})-இன் உண்மையான சட்ட உரையில் இருந்து எளிய மொழியில் சுருக்கமாக விளக்கப்படுகிறது. இது சட்ட ஆலோசனை அல்ல. தற்போது கிடைக்கும் மூலத்தில் உறுதிப்படுத்தப்பட்ட தகவலைத் தவிர மற்ற விவரங்கள் இல்லை.`
    : `This section is a plain-language explanation of Section ${section.number} of ${act.title}. It is not legal advice. Where the available source material does not confirm a point, the explanation says so instead of guessing.`;

  const summary = lang === 'ta'
    ? `பிரிவு ${section.number} - ${section.title} என்பது ${act.category} பிரிவில் வரும் முக்கியப் பொறிமுறையைப் பற்றி பேசுகிறது. ஒரு குடிமகன், காவல்துறை அல்லது பள்ளி/சேவை வழங்குநர் போன்ற தரப்பினருக்கு இது எப்போது பொருந்தும் என்பதை உரையில் இருந்து புரிந்துகொள்ள முடியும்.`
    : `Section ${section.number} (${section.title}) is a key provision under ${act.category}. It matters because it sets out the legal standard, who it applies to, and what the law expects from the responsible person or institution.`;

  const guidance = lang === 'ta'
    ? `இந்தச் சட்டத்தைப் பயன்படுத்தும் போது, அசல் சட்ட உரையை அடிப்படையாகக் கொண்டு, வழங்கப்பட்டால் உடனடி உதவிக்கு மாவட்ட நிபுணர், காவல்துறை, அல்லது சட்ட உதவி அமைப்பைத் தொடர்புகொள்ளவும். அசல் ஆதாரத்தில் விளக்கம் இல்லாத தகவல்களை நம்ப வேண்டாம்.`
    : `If you need practical next steps, verify the exact wording in the official source and seek help from a legal aid service, local police station, or a qualified lawyer if the issue is urgent. Do not rely on assumptions where the source text is silent.`;

  return `${lead}\n\n${summary}\n\n${guidance}\n\nOfficial source: ${act.officialSourceName || 'Not available'}\nSection text reference: ${section.number} - ${section.title}\n\nSelected legal text excerpt:\n${sectionText.slice(0, 800)}`;
}
