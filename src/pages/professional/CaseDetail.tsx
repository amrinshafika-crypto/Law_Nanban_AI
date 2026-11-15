import { Link, useParams } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Brain, CalendarDays, FileText, GitBranch, Pencil } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader, priorityBadge, statusBadge } from '@/components/ui';
import { useCase, useCaseEvents } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import type { CaseParty } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { runProfessionalAgents, type ProfessionalAgentName } from '@/lib/professionalAi';

export function CaseDetail() {
  const { id } = useParams();
  const { caseData, loading, error } = useCase(id);
  const { events, loading: eventsLoading, error: eventsError, reload: reloadEvents } = useCaseEvents(id);
  const { user } = useAuth();
  const [parties, setParties] = useState<CaseParty[]>([]);
  const [partyError, setPartyError] = useState('');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [relatedDocs, setRelatedDocs] = useState<Array<{id:string;title:string;file_name:string;created_at:string}>>([]);
  const [relatedDrafts, setRelatedDrafts] = useState<Array<{id:string;title:string;document_type:string;updated_at:string}>>([]);
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTitle, setHearingTitle] = useState('Hearing');
  const [hearingError, setHearingError] = useState('');
  const [aiResults, setAiResults] = useState<Partial<Record<ProfessionalAgentName, string>>>({});
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void supabase.from('case_parties').select('*').eq('case_id', id).order('created_at')
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setPartyError(queryError.message);
        else setParties((data || []) as CaseParty[]);
      });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!id) return;
    void Promise.all([
      supabase.from('documents').select('id,title,file_name,created_at').eq('case_id', id).order('created_at', { ascending: false }),
      supabase.from('legal_drafts').select('id,title,document_type,updated_at').eq('case_id', id).order('updated_at', { ascending: false }),
    ]).then(([docs, drafts]) => { if (!docs.error) setRelatedDocs(docs.data || []); if (!drafts.error) setRelatedDrafts(drafts.data || []); });
  }, [id]);

  async function saveHearing(event: FormEvent) {
    event.preventDefault();
    if (!id || !hearingDate) return;
    const { error: saveError } = await supabase.from('hearings').insert({ case_id: id, title: hearingTitle.trim() || 'Hearing', hearing_date: new Date(hearingDate).toISOString(), court_name: caseData?.court_name || null });
    if (saveError) { setHearingError(saveError.message); return; }
    setHearingDate(''); setHearingError('');
    await supabase.from('cases').update({ next_hearing_date: new Date(hearingDate).toISOString() }).eq('id', id);
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!id || !user || !note.trim() || savingNote) return;
    setSavingNote(true); setNoteError('');
    const { error: insertError } = await supabase.from('case_events').insert({
      case_id: id, title: note.trim().slice(0, 140), description: note.trim(), category: 'note', source_type: 'user', recorded_by: user.id,
    });
    setSavingNote(false);
    if (insertError) { setNoteError(insertError.message); return; }
    setNote(''); void reloadEvents();
  }

  async function runCaseAnalysis() {
    if (!caseData || aiLoading) return;
    setAiLoading(true); setAiError(''); setAiResults({});
    try {
      const batch = await runProfessionalAgents(['case_summary', 'case_strategy'], {
        case: { caseNumber: caseData.case_number, title: caseData.title, description: caseData.description, category: caseData.category, status: caseData.status, priority: caseData.priority, priorityNotes: caseData.priority_reason, filingDate: caseData.filing_date, nextHearingDate: caseData.next_hearing_date, court: caseData.court_name, tags: caseData.tags },
        parties: parties.map((party) => ({ name: party.name, role: party.role })),
        timeline: events.map((event) => ({ title: event.title, description: event.description, date: event.event_date, category: event.category, sourceType: event.source_type })),
      });
      setAiResults(Object.fromEntries(batch.results.map((result) => [result.agent, result.answer])));
      if (batch.failures.length) setAiError(batch.failures.map((failure) => failure.message).join(' '));
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : 'AI case analysis could not be completed.');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <LoadingState message="Loading case..." />;
  if (error) return <EmptyState icon={<FileText size={30} />} title="Case could not be loaded" description={error} action={<Link className="btn-outline" to="/app/cases"><ArrowLeft size={16} /> Back to cases</Link>} />;
  if (!caseData) return <EmptyState icon={<FileText size={30} />} title="Case not found" description="This case may not exist or may not be assigned to your account." action={<Link className="btn-outline" to="/app/cases"><ArrowLeft size={16} /> Back to cases</Link>} />;

  return (
    <>
      <Link to="/app/cases" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-accent-700 mb-4"><ArrowLeft size={16} /> All cases</Link>
      <PageHeader title={caseData.title} subtitle={caseData.case_number} action={<Link to={`/app/cases/${caseData.id}/edit`} className="btn-outline"><Pencil size={15} /> Edit case</Link>} />
      <div className="flex flex-wrap gap-2 mb-6">{statusBadge(caseData.status)}{priorityBadge(caseData.priority)}<Badge>{caseData.category}</Badge></div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-semibold text-navy-900 mb-3">Case summary</h2>
          <p className="text-sm leading-6 text-navy-600 whitespace-pre-wrap">{caseData.description || 'No case description has been recorded.'}</p>
          {caseData.priority_reason && <div className="mt-5 rounded-lg bg-gold-50 p-4"><p className="text-xs font-semibold uppercase text-gold-800">Priority notes</p><p className="text-sm text-navy-700 mt-1">{caseData.priority_reason}</p></div>}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-navy-900 mb-3">Case details</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-navy-500">Court</dt><dd className="text-navy-800">{caseData.court_name || 'Not recorded'}</dd></div>
            <div><dt className="text-navy-500">Filing date</dt><dd className="text-navy-800">{caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'Not recorded'}</dd></div>
            <div><dt className="text-navy-500">Next hearing</dt><dd className="text-navy-800">{caseData.next_hearing_date ? new Date(caseData.next_hearing_date).toLocaleString() : 'Not recorded'}</dd></div>
            <div><dt className="text-navy-500">Created</dt><dd className="text-navy-800">{new Date(caseData.created_at).toLocaleDateString()}</dd></div>
          </dl>
          {caseData.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{caseData.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}
        </Card>
      </div>
      <Card className="mt-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy-900">AI case summary and strategy</h2><p className="mt-1 text-sm text-navy-500">The summary and strategy agents review this case, its recorded parties, and its timeline.</p></div><button type="button" className="btn-primary" onClick={() => void runCaseAnalysis()} disabled={aiLoading}><Brain size={16} />{aiLoading ? 'Analyzing...' : 'Run case analysis'}</button></div>{aiLoading && <div className="mt-4"><LoadingState message="Running the case summary and strategy agents..." /></div>}{aiError && <p role="alert" className="mt-3 text-sm text-danger-700">{aiError}</p>}{(['case_summary', 'case_strategy'] as const).map((agent) => aiResults[agent] && <section key={agent} className="mt-4 border-t border-navy-100 pt-4"><h3 className="font-medium capitalize text-navy-800">{agent.replace(/_/g, ' ')}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-navy-700">{aiResults[agent]}</p></section>)}<p className="mt-4 border-t border-navy-100 pt-3 text-xs text-navy-500">AI suggestions are not verified legal conclusions or predictions. Review every fact, authority, deadline, and recommendation before use.</p></Card>
      <Card className="mt-5 p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Parties</h2>
        {partyError ? <p role="alert" className="text-sm text-danger-700">Parties could not be loaded: {partyError}</p> : parties.length === 0 ? <p className="text-sm text-navy-500">No party details are recorded.</p> : <ul className="grid gap-3 sm:grid-cols-2">{parties.map((party) => <li key={party.id} className="rounded-lg bg-navy-50 p-3"><p className="font-medium text-sm text-navy-800">{party.name}</p><p className="mt-1 text-xs capitalize text-navy-500">{party.role}{party.counsel ? ` · Counsel: ${party.counsel}` : ''}</p></li>)}</ul>}
      </Card>
      <Card className="p-5 mt-5">
        <div className="flex items-center gap-2 mb-3"><GitBranch size={18} className="text-accent-700" /><h2 className="font-semibold text-navy-900">Case timeline</h2></div>
        <form onSubmit={(event) => void saveNote(event)} className="mb-5 border-b border-navy-100 pb-5">
          <label htmlFor="case-note" className="label">Add a case note</label>
          <textarea id="case-note" className="input" rows={3} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record a work note or next action..." />
          {noteError && <p role="alert" className="mt-2 text-sm text-danger-700">Note was not saved: {noteError}</p>}
          <div className="mt-2 flex justify-end"><button type="submit" className="btn-primary" disabled={savingNote || !note.trim()}>{savingNote ? 'Saving...' : 'Save note'}</button></div>
        </form>
        {eventsError ? <p role="alert" className="text-sm text-danger-700">Timeline events could not be loaded: {eventsError}</p> : eventsLoading ? <LoadingState message="Loading timeline..." /> : events.length === 0 ? (
          <EmptyState icon={<CalendarDays size={26} />} title="No timeline events" description="Events recorded for this case will appear here." />
        ) : (
          <ol className="space-y-4">
            {events.map((event) => <li key={event.id} className="border-l-2 border-accent-200 pl-4"><p className="font-medium text-sm text-navy-800">{event.title} <Badge className="ml-1">{event.category}</Badge></p><p className="text-xs text-navy-500 mt-1">{new Date(event.event_date).toLocaleString()} · {event.source_type} entry</p>{event.description && <p className="text-sm text-navy-600 mt-1">{event.description}</p>}</li>)}
          </ol>
        )}
      </Card>
      <Card className="p-5 mt-5">
        <h2 className="font-semibold text-navy-900 mb-3">Hearings</h2>
        <form onSubmit={(event) => void saveHearing(event)} className="mb-4 flex flex-wrap items-end gap-3"><label><span className="label">Date and time</span><input className="input" type="datetime-local" required value={hearingDate} onChange={(event) => setHearingDate(event.target.value)} /></label><label><span className="label">Purpose</span><input className="input" value={hearingTitle} onChange={(event) => setHearingTitle(event.target.value)} maxLength={160} /></label><button className="btn-primary" type="submit">Save hearing</button></form>
        {hearingError && <p role="alert" className="text-sm text-danger-700">Hearing was not saved: {hearingError}</p>}
        <Link className="text-sm text-accent-700 underline" to="/app/calendar">Open hearing calendar</Link>
      </Card>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><Card className="p-5"><h2 className="font-semibold text-navy-900 mb-3">Case documents</h2>{relatedDocs.length ? <ul className="space-y-2">{relatedDocs.map((doc) => <li key={doc.id} className="text-sm"><span className="font-medium">{doc.title}</span><span className="block text-xs text-navy-500">{doc.file_name} · {new Date(doc.created_at).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-navy-500">No documents are linked to this case.</p>}<Link className="mt-3 inline-block text-sm text-accent-700 underline" to="/app/documents">Manage documents</Link></Card><Card className="p-5"><h2 className="font-semibold text-navy-900 mb-3">Case drafts</h2>{relatedDrafts.length ? <ul className="space-y-2">{relatedDrafts.map((draft) => <li key={draft.id} className="text-sm"><Link className="font-medium text-accent-700 underline" to={`/app/drafting?draft=${draft.id}`}>{draft.title}</Link><span className="block text-xs text-navy-500">{draft.document_type} · Updated {new Date(draft.updated_at).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-navy-500">No drafts are linked to this case.</p>}<Link className="mt-3 inline-block text-sm text-accent-700 underline" to="/app/drafting">Open drafting workspace</Link></Card></div>
    </>
  );
}
