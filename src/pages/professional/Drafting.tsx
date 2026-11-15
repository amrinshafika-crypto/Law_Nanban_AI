import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, FilePlus2, Save } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useCases } from '@/lib/hooks';
import { runProfessionalAgents } from '@/lib/professionalAi';

type DraftRecord = { id: string; case_id: string | null; document_type: string; title: string; content: string; updated_at: string };
const documentTypes = ['Legal notice outline', 'Affidavit structure', 'Written submissions outline', 'Client case brief', 'Case chronology', 'Custom document'];

export function Drafting() {
  const location = useLocation();
  const { user } = useAuth();
  const { cases } = useCases();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [draftId, setDraftId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [type, setType] = useState(documentTypes[0]);
  const [title, setTitle] = useState('');
  const [parties, setParties] = useState('');
  const [facts, setFacts] = useState('');
  const [provisions, setProvisions] = useState('');
  const [instructions, setInstructions] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDrafts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from('legal_drafts').select('id,case_id,document_type,title,content,updated_at').order('updated_at', { ascending: false });
    if (queryError) setError(`Saved drafts could not be loaded: ${queryError.message}`);
    else setDrafts((data || []) as DraftRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  useEffect(() => {
    const requestedId = new URLSearchParams(location.search).get('draft');
    const requestedDraft = requestedId ? drafts.find((draft) => draft.id === requestedId) : undefined;
    if (requestedDraft) openDraft(requestedDraft);
  }, [drafts, location.search]);

  function newDraft() {
    setDraftId(''); setCaseId(''); setType(documentTypes[0]); setTitle(''); setParties(''); setFacts(''); setProvisions(''); setInstructions(''); setContent(''); setError(''); setMessage('');
  }

  function openDraft(draft: DraftRecord) {
    setDraftId(draft.id); setCaseId(draft.case_id || ''); setType(draft.document_type); setTitle(draft.title); setContent(draft.content); setError(''); setMessage('');
    setParties(''); setFacts(''); setProvisions(''); setInstructions('');
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (generating) return;
    const caseItem = cases.find((item) => item.id === caseId);
    const context = { documentType: type, title: title || caseItem?.title || '', case: caseItem ? { caseNumber: caseItem.case_number, title: caseItem.title, court: caseItem.court_name } : null, parties, facts, verifiedProvisions: provisions, instructions };
    setGenerating(true); setError(''); setMessage('');
    try {
      const batch = await runProfessionalAgents(['legal_drafting'], context);
      const draft = batch.results[0]?.answer.trim();
      if (!draft) throw new Error('The AI returned no draft. Please try again.');
      setContent(draft);
      setMessage('AI working draft generated. Verify every fact and provision with the source record before use.');
      if (batch.failures.length) setError(batch.failures[0].message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The AI could not generate this draft. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !content.trim() || saving) return;
    setSaving(true); setError(''); setMessage('');
    const payload = { owner_id: user.id, case_id: caseId || null, document_type: type, title: title.trim(), content };
    const result = draftId
      ? await supabase.from('legal_drafts').update(payload).eq('id', draftId).select('id,case_id,document_type,title,content,updated_at').single()
      : await supabase.from('legal_drafts').insert(payload).select('id,case_id,document_type,title,content,updated_at').single();
    setSaving(false);
    if (result.error || !result.data) { setError(result.error?.message || 'Draft could not be saved.'); return; }
    setDraftId(result.data.id); setMessage('Draft saved to your professional account.'); await loadDrafts();
  }

  function download() {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${title.trim() || 'legal-draft'}.txt`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <>
    <PageHeader title="Legal Drafting Workspace" subtitle="Create editable document structures, link them to cases, and return to saved drafts." action={<button type="button" onClick={newDraft} className="btn-outline"><FilePlus2 size={15} />New draft</button>} />
    <div className="mb-5 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm leading-6 text-gold-900">AI-generated working drafts require advocate review. The assistant must use only supplied facts and verified provisions; check all content and procedure before use.</div>
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="p-4">
        <h2 className="mb-3 font-semibold text-navy-900">Saved drafts</h2>
        {loading ? <LoadingState message="Loading drafts..." /> : drafts.length === 0 ? <EmptyState title="No saved drafts" description="Create and save a draft to return to it here." /> : <ul className="space-y-2">{drafts.map((draft) => <li key={draft.id}><button type="button" onClick={() => openDraft(draft)} className={`w-full rounded-lg border p-3 text-left ${draftId === draft.id ? 'border-accent-400 bg-accent-50' : 'border-navy-100 hover:bg-navy-50'}`}><span className="block truncate text-sm font-medium text-navy-800">{draft.title}</span><span className="mt-1 block text-xs text-navy-500">{draft.document_type} · {new Date(draft.updated_at).toLocaleDateString()}</span></button></li>)}</ul>}
      </Card>
      <div className="space-y-5">
        <Card className="p-5">
          <form onSubmit={generate} className="grid gap-4 md:grid-cols-2">
            <label><span className="label">Document type</span><select className="input" value={type} onChange={(event) => setType(event.target.value)}>{documentTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className="label">Case (optional)</span><select className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">No case linked</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} · {item.title}</option>)}</select></label>
            <label className="md:col-span-2"><span className="label">Draft title *</span><input className="input" required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Client matter — working notice" /></label>
            <label><span className="label">Parties</span><textarea className="input" rows={3} maxLength={3000} value={parties} onChange={(event) => setParties(event.target.value)} placeholder="Names and roles, as verified" /></label>
            <label><span className="label">Facts</span><textarea className="input" rows={3} maxLength={6000} value={facts} onChange={(event) => setFacts(event.target.value)} placeholder="Facts supplied and verified by you" /></label>
            <label><span className="label">Applicable provisions</span><textarea className="input" rows={3} maxLength={3000} value={provisions} onChange={(event) => setProvisions(event.target.value)} placeholder="Only provisions you have verified" /></label>
            <label><span className="label">Instructions / relief requested</span><textarea className="input" rows={3} maxLength={3000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
            <div className="md:col-span-2 flex justify-end"><button type="submit" className="btn-primary" disabled={generating}>{generating ? 'Generating draft...' : 'Generate AI draft'}</button></div>
          </form>
        </Card>
        {content && <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-navy-900">Editable draft <Badge color="warning">Requires professional review</Badge></h2><button type="button" onClick={download} className="btn-outline"><Download size={15} />Export</button></div>
          <textarea aria-label="Editable legal draft" className="input min-h-[28rem] font-mono text-sm leading-6" maxLength={30000} value={content} onChange={(event) => setContent(event.target.value)} />
          <form onSubmit={(event) => void save(event)} className="mt-3 flex justify-end"><button type="submit" className="btn-primary" disabled={saving || !title.trim()}><Save size={15} />{saving ? 'Saving...' : 'Save draft'}</button></form>
        </Card>}
        {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
        {message && <p role="status" className="text-sm text-navy-600">{message}</p>}
      </div>
    </div>
  </>;
}
