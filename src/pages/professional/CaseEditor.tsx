import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, LoadingState, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useCase, generateCaseNumber } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import type { CaseCategory, CaseStatus, Priority } from '@/types';

const categories: CaseCategory[] = ['criminal', 'civil', 'family', 'property', 'consumer', 'cyber', 'labor', 'constitutional', 'corporate', 'tax', 'other'];
const statuses: CaseStatus[] = ['intake', 'active', 'review', 'hearing', 'disposed', 'closed', 'archived'];
const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
type FormState = { case_number: string; title: string; description: string; category: CaseCategory; status: CaseStatus; priority: Priority; court_name: string; filing_date: string; next_hearing_date: string; plaintiff: string; respondent: string; plaintiffId: string; respondentId: string };
const blank: FormState = { case_number: '', title: '', description: '', category: 'other', status: 'intake', priority: 'normal', court_name: '', filing_date: '', next_hearing_date: '', plaintiff: '', respondent: '', plaintiffId: '', respondentId: '' };

export function CaseEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { caseData, loading: caseLoading, error: caseError } = useCase(id);
  const [form, setForm] = useState<FormState>(blank);
  const [loadingNumber, setLoadingNumber] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (editing && caseData) {
      void supabase.from('case_parties').select('id,name,role').eq('case_id', caseData.id).then(({ data }) => {
        if (!active) return;
        const plaintiff = data?.find((party) => party.role === 'plaintiff' || party.role === 'petitioner');
        const respondent = data?.find((party) => party.role === 'defendant' || party.role === 'respondent');
        setForm({ case_number: caseData.case_number, title: caseData.title, description: caseData.description || '', category: caseData.category, status: caseData.status, priority: caseData.priority, court_name: caseData.court_name || '', filing_date: caseData.filing_date || '', next_hearing_date: caseData.next_hearing_date ? caseData.next_hearing_date.slice(0, 16) : '', plaintiff: plaintiff?.name || '', respondent: respondent?.name || '', plaintiffId: plaintiff?.id || '', respondentId: respondent?.id || '' });
      });
    } else if (!editing) {
      void generateCaseNumber().then((case_number) => { if (active) setForm((current) => ({ ...current, case_number })); }).finally(() => { if (active) setLoadingNumber(false); });
    }
    return () => { active = false; };
  }, [editing, caseData]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true); setError('');
    const payload = {
      case_number: form.case_number.trim(), title: form.title.trim(), description: form.description.trim() || null,
      category: form.category, status: form.status, priority: form.priority, court_name: form.court_name.trim() || null,
      filing_date: form.filing_date || null, next_hearing_date: form.next_hearing_date ? new Date(form.next_hearing_date).toISOString() : null,
      assigned_to: user.id,
    };
    const result = editing
      ? await supabase.from('cases').update(payload).eq('id', id!).select('id').single()
      : await supabase.from('cases').insert(payload).select('id').single();
    if (result.error || !result.data) { setError(result.error?.message || 'Case could not be saved.'); setSaving(false); return; }
    const caseId = result.data.id;
    const partyEdits = [
      { id: form.plaintiffId, name: form.plaintiff.trim(), role: 'plaintiff' },
      { id: form.respondentId, name: form.respondent.trim(), role: 'respondent' },
    ].filter((party) => party.name);
    let partyError = false;
    for (const party of partyEdits) {
      const { error: editError } = party.id
        ? await supabase.from('case_parties').update({ name: party.name, role: party.role }).eq('id', party.id)
        : await supabase.from('case_parties').insert({ case_id: caseId, name: party.name, role: party.role });
      if (editError) partyError = true;
    }
    if (partyError) setError('The case was saved, but party details could not be updated. You can retry by editing the case.');
    const eventTitle = editing ? 'Case details updated' : 'Case created';
    const { error: eventError } = await supabase.from('case_events').insert({ case_id: caseId, title: eventTitle, category: 'status', source_type: 'user', recorded_by: user.id, description: `${payload.case_number} · ${payload.status}` });
    setSaving(false);
    navigate(`/app/cases/${caseId}`, { replace: true, state: eventError ? { notice: 'Case saved; the activity timeline entry could not be recorded.' } : undefined });
  }

  if (editing && caseLoading) return <LoadingState message="Loading case details..." />;
  if (editing && (caseError || !caseData)) return <div role="alert" className="rounded-lg bg-danger-50 p-4 text-sm text-danger-700">{caseError || 'Case not found or unavailable.'}</div>;
  const set = (key: keyof FormState, value: string) => setForm((previous) => ({ ...previous, [key]: value } as FormState));

  return <>
    <Link to={editing ? `/app/cases/${id}` : '/app/cases'} className="mb-4 inline-flex items-center gap-2 text-sm text-navy-600 hover:text-accent-700"><ArrowLeft size={16} />{editing ? 'Back to case' : 'All cases'}</Link>
    <PageHeader title={editing ? 'Edit case' : 'Create case'} subtitle="Save case information to your authenticated professional workspace." />
    <Card className="p-5">
      <form onSubmit={(event) => void save(event)} className="grid gap-4 md:grid-cols-2">
        <label><span className="label">Case number *</span><input required maxLength={80} className="input" value={form.case_number} onChange={(event) => set('case_number', event.target.value)} disabled={loadingNumber} /></label>
        <label><span className="label">Case title *</span><input required maxLength={180} className="input" value={form.title} onChange={(event) => set('title', event.target.value)} /></label>
        <label><span className="label">Category</span><select className="input" value={form.category} onChange={(event) => set('category', event.target.value)}>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span className="label">Status</span><select className="input" value={form.status} onChange={(event) => set('status', event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span className="label">Priority</span><select className="input" value={form.priority} onChange={(event) => set('priority', event.target.value)}>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span className="label">Court</span><input maxLength={180} className="input" value={form.court_name} onChange={(event) => set('court_name', event.target.value)} /></label>
        <label><span className="label">Filing date</span><input type="date" className="input" value={form.filing_date} onChange={(event) => set('filing_date', event.target.value)} /></label>
        <label><span className="label">Next hearing</span><input type="datetime-local" className="input" value={form.next_hearing_date} onChange={(event) => set('next_hearing_date', event.target.value)} /></label>
        <label><span className="label">Petitioner / plaintiff</span><input maxLength={180} className="input" value={form.plaintiff} onChange={(event) => set('plaintiff', event.target.value)} /></label>
        <label><span className="label">Respondent / defendant</span><input maxLength={180} className="input" value={form.respondent} onChange={(event) => set('respondent', event.target.value)} /></label>
        <label className="md:col-span-2"><span className="label">Case summary / facts</span><textarea maxLength={12000} rows={6} className="input" value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
        {error && <p role="alert" className="md:col-span-2 text-sm text-danger-700">{error}</p>}
        <div className="md:col-span-2 flex justify-end"><button className="btn-primary" type="submit" disabled={saving || loadingNumber}><Save size={16} />{saving ? 'Saving...' : editing ? 'Save changes' : 'Create case'}</button></div>
      </form>
    </Card>
  </>;
}
