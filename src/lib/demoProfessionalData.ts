import type { CaseCategory, CaseStatus, Priority } from '@/types';

export const demoProfessionalProfile = {
  name: 'Adv. Arjun Raman',
  location: 'Madurai, Tamil Nadu',
  specialisations: ['Civil', 'Criminal', 'Family Law'],
  experienceYears: 8,
  barCouncilId: 'DEMO-TN-2026 (fictional; not a real registration)',
  languages: ['Tamil', 'English'],
  fictional: true as const,
};

export interface DemoEvidence {
  title: string;
  fileName: string;
  kind: string;
  date: string;
  description: string;
  extractedText: string;
  sampleOnly: true;
}

export interface DemoCase {
  id: string;
  caseNumber: string;
  title: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: Priority;
  priorityReason: string;
  filingDate: string;
  nextHearingDate: string | null;
  court: string;
  description: string;
  client: { name: string; role: string; contact: string };
  evidence: DemoEvidence[];
  fictional: true;
}

const fictionalCourt = 'Fictional Madurai District Court setting (demo only)';

export const demoCases: DemoCase[] = [
  {
    id: 'demo-case-property-01', caseNumber: 'DEMO-CIV-2026-001', title: 'Ancestral land boundary and partition dispute', category: 'property', status: 'active', priority: 'high', priorityReason: 'Competing boundary survey requests; dates and ownership records require verification.', filingDate: '2026-02-12', nextHearingDate: '2026-12-08', court: fictionalCourt,
    description: 'Fictional clients Meena Selvaraj and Karthik Selvaraj disagree about the boundary and proposed partition of a small ancestral plot near Madurai. Meena says a family arrangement from 2018 reserved a shared access path; Karthik disputes the map attached to her copy. No original title chain or official survey has been independently checked.',
    client: { name: 'Meena Selvaraj (fictional)', role: 'Claimant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Family arrangement extract', fileName: 'DEMO_property_family_arrangement.txt', kind: 'Synthetic text excerpt', date: '2026-01-28', description: 'Invented excerpt for workflow demonstration; not an executed deed.', extractedText: 'FICTIONAL SAMPLE ONLY — Family arrangement dated 14 June 2018. The parties refer to a shared access path along the eastern boundary. The attached sketch is illustrative and is not a survey plan.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-cheque-02', caseNumber: 'DEMO-COM-2026-002', title: 'Disputed cheque after equipment advance', category: 'civil', status: 'review', priority: 'normal', priorityReason: 'Notice dates and bank return memo are missing from the fictional file.', filingDate: '2026-03-04', nextHearingDate: '2026-12-14', court: fictionalCourt,
    description: 'Fictional small-business owner R. Nandhini says a cheque was issued by fictional supplier S. Prakash toward a refundable equipment advance. The supplier says the cheque related to a separate invoice. The amount, presentation date, notice service, and limitation facts are intentionally left for review rather than assumed.',
    client: { name: 'R. Nandhini (fictional)', role: 'Complainant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Bank return memo metadata', fileName: 'DEMO_cheque_return_memo.pdf', kind: 'Placeholder PDF metadata; no real file', date: '2026-02-19', description: 'Sample document record only; no bank or account details.', extractedText: 'FICTIONAL SAMPLE ONLY — Cheque returned; reason and presentation date not supplied. Obtain and verify the original bank memo before assessing any notice or limitation issue.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-family-03', caseNumber: 'DEMO-FAM-2026-003', title: 'Parenting schedule and maintenance information request', category: 'family', status: 'active', priority: 'high', priorityReason: 'A temporary schedule is requested; child safety and current orders must be checked.', filingDate: '2026-01-21', nextHearingDate: '2026-12-03', court: fictionalCourt,
    description: 'Fictional spouses Divya Kumar and S. Arun have lived separately for several months. They disagree on a school-week parenting schedule and what financial records should be exchanged. The fictional file contains no existing court order and does not describe any verified safety assessment.',
    client: { name: 'Divya Kumar (fictional)', role: 'Applicant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Proposed parenting calendar', fileName: 'DEMO_parenting_calendar.csv', kind: 'Synthetic schedule metadata', date: '2026-01-15', description: 'Invented proposed calendar; not a court-approved arrangement.', extractedText: 'FICTIONAL SAMPLE ONLY — Proposed weekday and alternate-weekend schedule. School holidays, travel consent, and handover arrangements are not specified.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-cyber-04', caseNumber: 'DEMO-CYB-2026-004', title: 'UPI impersonation and disputed transfer sequence', category: 'cyber', status: 'intake', priority: 'urgent', priorityReason: 'Prompt preservation and bank/platform reporting may matter; all times and transaction facts are fictional.', filingDate: '2026-05-09', nextHearingDate: null, court: fictionalCourt,
    description: 'Fictional shop owner P. Ilango reports receiving an impersonation call followed by two disputed UPI transfers. He says he contacted his bank the same day but has not supplied a verified complaint acknowledgement, device record, or transaction statement. No real account identifiers are included.',
    client: { name: 'P. Ilango (fictional)', role: 'Complainant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Incident chronology', fileName: 'DEMO_cyber_incident_notes.txt', kind: 'Synthetic text', date: '2026-05-10', description: 'Invented chronology without account numbers, phone numbers, or actual evidence.', extractedText: 'FICTIONAL SAMPLE ONLY — 09:10: Client recalls an impersonation call. 09:42 and 09:47: Two disputed transfers are reported. 10:20: Client says a bank support call was made. Verify the original transaction records and complaint acknowledgement.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-employment-05', caseNumber: 'DEMO-LAB-2026-005', title: 'Unpaid final wages and experience certificate', category: 'labor', status: 'review', priority: 'normal', priorityReason: 'Employment dates, wage records, and employer details need source documents.', filingDate: '2026-04-17', nextHearingDate: null, court: fictionalCourt,
    description: 'Fictional former technician M. Kavitha says her final month wages and an experience certificate remain outstanding after leaving a private workshop. The employer disputes the last working date. The file does not establish employee classification, applicable establishment details, or amounts due.',
    client: { name: 'M. Kavitha (fictional)', role: 'Worker / applicant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Draft wage reconciliation', fileName: 'DEMO_wage_reconciliation.xlsx', kind: 'Placeholder spreadsheet metadata; no real file', date: '2026-04-12', description: 'Fictional summary with amounts deliberately omitted.', extractedText: 'FICTIONAL SAMPLE ONLY — Wage period and final working date are disputed. Obtain payslips, attendance records, bank entries, appointment terms, and a verified calculation before advising on relief.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-consumer-06', caseNumber: 'DEMO-CON-2026-006', title: 'Repair delay after replacement-part promise', category: 'consumer', status: 'active', priority: 'low', priorityReason: 'Preserve purchase, service, and communication records; remedy depends on verified terms.', filingDate: '2026-02-28', nextHearingDate: '2026-12-21', court: fictionalCourt,
    description: 'Fictional consumer J. Suresh says a home appliance remained at a service centre after a replacement-part promise. The service centre says the part was unavailable and offered a later collection date. Purchase date, warranty language, service job sheet, and loss are not verified.',
    client: { name: 'J. Suresh (fictional)', role: 'Consumer / complainant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Service job-sheet summary', fileName: 'DEMO_service_job_sheet.txt', kind: 'Synthetic summary', date: '2026-02-20', description: 'Invented metadata; no brand, serial number, or real service record.', extractedText: 'FICTIONAL SAMPLE ONLY — Service intake recorded; replacement part expected later. No signed delivery date, repair completion note, or warranty terms are supplied.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-bail-07', caseNumber: 'DEMO-CRI-2026-007', title: 'Bail preparation and custody timeline review', category: 'criminal', status: 'active', priority: 'urgent', priorityReason: 'Custody and next listing dates must be confirmed from official records; no factual finding is made.', filingDate: '2026-06-02', nextHearingDate: '2026-12-01', court: fictionalCourt,
    description: 'Fictional accused person V. Dinesh is represented in a bail-preparation scenario. The demo file gives only a general allegation of a street altercation and an unverified custody timeline. It includes no real FIR, sections, injury record, prior history, or court order. Do not infer guilt or procedural entitlement.',
    client: { name: 'V. Dinesh (fictional)', role: 'Accused person', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Custody timeline checklist', fileName: 'DEMO_custody_timeline.txt', kind: 'Synthetic checklist', date: '2026-06-03', description: 'Not an FIR, remand report, or court record.', extractedText: 'FICTIONAL SAMPLE ONLY — Arrest, production, remand, and next listing times are all marked VERIFY. Obtain certified or otherwise reliable records; this checklist is not evidence.', sampleOnly: true }], fictional: true,
  },
  {
    id: 'demo-case-contract-08', caseNumber: 'DEMO-CIV-2026-008', title: 'Small works contract: scope and delayed payment', category: 'civil', status: 'hearing', priority: 'normal', priorityReason: 'Payment milestones and acceptance records are incomplete.', filingDate: '2025-11-19', nextHearingDate: '2026-12-18', court: fictionalCourt,
    description: 'Fictional contractor A. Faizal says a local business has not paid the final milestone for renovation work. The business says several items were unfinished. The scope, change requests, completion date, and acceptance notes in this scenario are intentionally incomplete.',
    client: { name: 'A. Faizal (fictional)', role: 'Contractor / claimant', contact: 'Fictional contact details omitted' },
    evidence: [{ title: 'Work completion checklist', fileName: 'DEMO_work_completion_checklist.txt', kind: 'Synthetic checklist', date: '2025-11-12', description: 'Invented completion checklist; not signed by any real person.', extractedText: 'FICTIONAL SAMPLE ONLY — Listed work items have mixed status: reported complete, disputed, or unconfirmed. Match each item against the signed scope, change records, inspection notes, and payment schedule.', sampleOnly: true }], fictional: true,
  },
];
