import { useMemo, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Badge, Card, LoadingState, PageHeader } from '@/components/ui';
import { demoCases, demoProfessionalProfile } from '@/lib/demoProfessionalData';
import { runProfessionalAgents, type ProfessionalAgentName } from '@/lib/professionalAi';
import { ProfessionalMarkdownMessage } from '@/components/ProfessionalMarkdownMessage';

const demoWorkflows: Array<{ id: ProfessionalAgentName | 'central_orchestrator'; label: string; description: string }> = [
  { id: 'triage', label: 'Case Triage Agent', description: 'Classify the matter, urgency, missing facts and next steps.' },
  { id: 'legal_research', label: 'Legal Research Agent', description: 'Review only supplied legal reference records; none are fabricated for this demo.' },
  { id: 'document_intelligence', label: 'Document Analysis Agent', description: 'Analyze the selected case’s synthetic sample excerpt.' },
  { id: 'legal_drafting', label: 'Drafting Agent', description: 'Prepare a review-only draft using supplied facts and [VERIFY] placeholders.' },
  { id: 'case_summary', label: 'Case Summary Agent', description: 'Summarize supplied case facts, parties, dates and evidence gaps.' },
  { id: 'case_strategy', label: 'Strategy Agent', description: 'Outline possible issues, questions and risks for professional review.' },
  { id: 'central_orchestrator', label: 'Central Orchestrator', description: 'Coordinate a bounded triage + case-summary batch and report completion status.' },
];

export function DemoEnvironment() {
  const [caseId, setCaseId] = useState(demoCases[0].id);
  const [results, setResults] = useState<Array<{ label: string; answer: string }>>([]);
  const [orchestration, setOrchestration] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const selectedCase = useMemo(() => demoCases.find((item) => item.id === caseId) ?? demoCases[0], [caseId]);

  function resetDemo() {
    setCaseId(demoCases[0].id);
    setResults([]);
    setOrchestration([]);
    setError('');
    setRunningWorkflow(null);
  }

  async function runWorkflow(workflow: typeof demoWorkflows[number]) {
    if (busy) return;
    const agents: ProfessionalAgentName[] = workflow.id === 'central_orchestrator'
      ? ['triage', 'case_summary']
      : [workflow.id];
    setBusy(true);
    setRunningWorkflow(workflow.label);
    setError('');
    setResults([]);
    setOrchestration([]);
    try {
      const batch = await runProfessionalAgents(agents, {
        demo: { fictional: true, label: 'FICTIONAL DEMO DATA — NOT A REAL CLIENT, CASE, COURT RECORD, OR EVIDENCE' },
        professional: demoProfessionalProfile,
        case: {
          caseNumber: selectedCase.caseNumber,
          title: selectedCase.title,
          description: selectedCase.description,
          category: selectedCase.category,
          status: selectedCase.status,
          priority: selectedCase.priority,
          priorityNotes: selectedCase.priorityReason,
          filingDate: selectedCase.filingDate,
          nextHearingDate: selectedCase.nextHearingDate,
          court: selectedCase.court,
        },
        parties: [{ ...selectedCase.client, fictional: true }],
        documents: selectedCase.evidence.map((item) => ({ title: item.title, fileName: item.fileName, kind: item.kind, date: item.date, description: item.description, extractedText: item.extractedText, sampleOnly: true })),
        legalReferences: [],
      });
      setResults(batch.results.map((result) => ({
        label: demoWorkflows.find((item) => item.id === result.agent)?.label ?? result.agent,
        answer: result.answer,
      })));
      setOrchestration([
        `Selected: ${batch.orchestrator.selectedAgents.join(', ') || 'none'}`,
        `Completed: ${batch.orchestrator.completedAgents.join(', ') || 'none'}`,
        `Failed: ${batch.orchestrator.failedAgents.join(', ') || 'none'}`,
      ]);
      if (batch.failures.length) setError(batch.failures.map((failure) => failure.message).join(' '));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The demo AI workflow could not be completed.');
    } finally {
      setBusy(false);
      setRunningWorkflow(null);
    }
  }

  return (
    <>
      <PageHeader title="Demo Legal Professional Environment" subtitle="A read-only showcase using fictional profile, client, case, and evidence data." action={<button type="button" className="btn-outline" onClick={resetDemo} disabled={busy}><RotateCcw size={15} />Reset demo</button>} />
      <div role="note" className="mb-5 rounded-xl border border-gold-300 bg-gold-50 p-4 text-sm leading-6 text-gold-950">
        <strong>FICTIONAL DEMO — NOT REAL LEGAL RECORDS.</strong> Adv. Arjun Raman, every client and case, the Bar Council identifier, court setting, dates, document names, and excerpts below are invented. The identifier is not a real registration. Nothing here should be filed, relied on as evidence, or treated as a real matter. AI output is advisory and requires qualified review.
      </div>

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-navy-900">{demoProfessionalProfile.name}</h2><Badge color="warning">Fictional profile</Badge></div><p className="mt-1 text-sm text-navy-600">{demoProfessionalProfile.location} · {demoProfessionalProfile.experienceYears} fictional years of experience</p></div>
          <p className="text-sm text-navy-600">{demoProfessionalProfile.barCouncilId}</p>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs uppercase text-navy-500">Specialisations</p><p className="mt-1 text-navy-800">{demoProfessionalProfile.specialisations.join(', ')}</p></div><div><p className="text-xs uppercase text-navy-500">Languages</p><p className="mt-1 text-navy-800">{demoProfessionalProfile.languages.join(' and ')}</p></div><div><p className="text-xs uppercase text-navy-500">Storage and account</p><p className="mt-1 text-navy-800">Local demo data only; no demo login or database rows</p></div></div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-5">
          <h2 className="font-semibold text-navy-900">Fictional case files ({demoCases.length})</h2>
          <label className="mt-3 block"><span className="label">Select a demo case</span><select className="input" value={caseId} onChange={(event) => { setCaseId(event.target.value); setResults([]); setOrchestration([]); setError(''); }} disabled={busy}>{demoCases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} · {item.title}</option>)}</select></label>
          <div className="mt-4 flex flex-wrap gap-2"><Badge>{selectedCase.category}</Badge><Badge color={selectedCase.priority === 'urgent' ? 'danger' : selectedCase.priority === 'high' ? 'warning' : 'accent'}>{selectedCase.priority} priority</Badge><Badge color="warning">{selectedCase.status}</Badge></div>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs uppercase text-navy-500">Fictional client</dt><dd className="text-navy-800">{selectedCase.client.name} · {selectedCase.client.role}</dd><dd className="text-xs text-navy-500">{selectedCase.client.contact}</dd></div><div><dt className="text-xs uppercase text-navy-500">Description</dt><dd className="mt-1 leading-6 text-navy-700">{selectedCase.description}</dd></div><div><dt className="text-xs uppercase text-navy-500">Filing / next date</dt><dd className="text-navy-800">{selectedCase.filingDate} / {selectedCase.nextHearingDate ?? 'Not scheduled'}</dd></div><div><dt className="text-xs uppercase text-navy-500">Venue</dt><dd className="text-navy-800">{selectedCase.court}</dd></div><div><dt className="text-xs uppercase text-navy-500">Priority context</dt><dd className="text-navy-700">{selectedCase.priorityReason}</dd></div></dl>
          <div className="mt-4 border-t border-navy-100 pt-4"><h3 className="text-sm font-semibold text-navy-800">Sample evidence metadata</h3>{selectedCase.evidence.map((item) => <div key={item.fileName} className="mt-2 rounded-lg bg-navy-50 p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-navy-800">{item.title}</span><Badge color="warning">Synthetic sample</Badge></div><p className="mt-1 text-xs text-navy-600">{item.fileName} · {item.kind} · {item.date}</p><p className="mt-1 text-xs text-navy-600">{item.description}</p></div>)}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><Sparkles size={19} className="text-accent-700"/><h2 className="font-semibold text-navy-900">Seven Professional AI workflows</h2></div>
          <p className="mt-1 text-sm text-navy-500">Runs use the existing authenticated Professional AI function. Choosing a workflow sends only the selected fictional case context.</p>
          <div className="mt-4 space-y-2">{demoWorkflows.map((workflow) => <div key={workflow.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-100 p-3"><div className="min-w-0"><h3 className="text-sm font-medium text-navy-900">{workflow.label}</h3><p className="mt-1 text-xs leading-5 text-navy-500">{workflow.description}</p></div><button type="button" className="btn-outline shrink-0" onClick={() => void runWorkflow(workflow)} disabled={busy}>{busy && runningWorkflow === workflow.label ? 'Running...' : 'Run'}</button></div>)}</div>
          {busy && <div className="mt-4"><LoadingState message={`Running ${runningWorkflow} on fictional case data...`} /></div>}
          {error && <p role="alert" className="mt-4 text-sm text-danger-700">{error}</p>}
          {orchestration.length > 0 && <div className="mt-4 rounded-lg bg-accent-50 p-3 text-xs text-accent-900"><p className="font-semibold">Central Orchestrator report</p>{orchestration.map((item) => <p key={item} className="mt-1">{item}</p>)}</div>}
          {results.map((result) => <section key={result.label} className="mt-4 border-t border-navy-100 pt-4"><h3 className="font-semibold text-navy-900">{result.label}</h3><ProfessionalMarkdownMessage content={result.answer} className="mt-2 text-sm leading-6 text-navy-700" /></section>)}
          {(results.length > 0 || error) && <p className="mt-4 border-t border-navy-100 pt-3 text-xs text-navy-500">Fictional-data demonstration only. Verify all law, sources, facts, and procedure independently. AI output is not legal advice or a substitute for professional judgment.</p>}
        </Card>
      </div>
    </>
  );
}
