import { FormEvent, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { orchestrate, type OrchestratorResult } from '@/lib/agents';
import { useCases, useHearings } from '@/lib/hooks';

export function HearingCalendar() {
  const { hearings, loading: hearingsLoading, error: hearingsError } = useHearings();
  const { cases, loading: casesLoading, error: casesError } = useCases();
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [conflicts, setConflicts] = useState<Array<{ caseId: string; caseTitle: string; conflictDate: string; severity: 'hard' | 'soft'; message: string }> | null>(null);
  const [suggestions, setSuggestions] = useState<{ time: string; available: boolean }[]>([]);
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null);
  const [error, setError] = useState('');

  async function check(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!date || !Number.isFinite(new Date(date).getTime())) {
      setError('Choose a valid date and time.');
      return;
    }
    try {
      const response = await orchestrate('scheduling', { date, durationMinutes: duration, existingHearings: hearings, cases }, []);
      setOrchestratorResult(response);
      const schedulingResult = response.result as { conflicts: typeof conflicts; suggestions: typeof suggestions };
      setConflicts(schedulingResult.conflicts ?? null);
      setSuggestions(schedulingResult.suggestions ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scheduling check failed.');
      setConflicts(null);
      setSuggestions([]);
      setOrchestratorResult(null);
    }
  }

  const upcoming = hearings.filter((hearing) => new Date(hearing.hearing_date) >= new Date()).sort((a, b) => a.hearing_date.localeCompare(b.hearing_date));

  return (
    <>
      <PageHeader title="Hearing Calendar" subtitle="Review recorded hearings and check proposed times against your current case records." />
      <Card className="p-5 mb-5">
        <h2 className="font-semibold text-navy-900 mb-3">Check a proposed time</h2>
        {hearingsError || casesError ? <p role="alert" className="text-sm text-danger-700">Calendar records could not be loaded: {[hearingsError, casesError].filter(Boolean).join(' ')}</p> : hearingsLoading || casesLoading ? <LoadingState message="Loading hearing and case records..." /> : (
          <>
            <form onSubmit={check} className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
              <div><label className="label" htmlFor="proposed-time">Proposed date and time</label><input id="proposed-time" className="input" type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} /></div>
              <div><label className="label" htmlFor="duration">Duration (minutes)</label><input id="duration" className="input" type="number" min={1} max={1440} required value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></div>
              <button type="submit" className="btn-primary"><Clock3 size={16} /> Check conflicts</button>
            </form>
            {error && <p role="alert" className="text-sm text-danger-700 mt-3">{error}</p>}
            {orchestratorResult && (
              <div className="mt-4 rounded-lg border border-navy-200 bg-navy-50 p-3 text-xs text-navy-600">
                <span className="font-semibold text-navy-800">Orchestrator:</span> {orchestratorResult.agent} · {orchestratorResult.executionLog[orchestratorResult.executionLog.length - 1]?.status ?? 'completed'}
              </div>
            )}
            {conflicts !== null && <div className="mt-5 border-t border-navy-100 pt-4"><h3 className="font-medium text-navy-800">Conflict check</h3>{conflicts.length === 0 ? <p className="text-sm text-success-700 mt-2">No conflict detected in the hearing records currently available to this account.</p> : <ul className="space-y-2 mt-2">{conflicts.map((item) => <li key={`${item.caseId}-${item.conflictDate}`} className="text-sm text-navy-700"><Badge color={item.severity === 'hard' ? 'danger' : 'warning'}>{item.severity === 'hard' ? 'Overlap' : 'Close timing'}</Badge> <span className="ml-1">{item.message}</span></li>)}</ul>}<h3 className="font-medium text-navy-800 mt-4">Candidate time slots</h3><div className="flex flex-wrap gap-2 mt-2">{suggestions.map((slot) => <Badge key={slot.time} color={slot.available ? 'success' : 'gray'}>{slot.time} · {slot.available ? 'no conflict detected' : 'conflict'}</Badge>)}</div><p className="text-xs text-navy-500 mt-3">Suggestions are informational only. They are not booked, verified with a court, or sent as reminders.</p></div>}
          </>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold text-navy-900 mb-3">Recorded upcoming hearings</h2>
        {hearingsError ? <p role="alert" className="text-sm text-danger-700">Hearings could not be loaded: {hearingsError}</p> : hearingsLoading ? <LoadingState message="Loading hearings..." /> : upcoming.length === 0 ? <EmptyState icon={<CalendarDays size={28} />} title="No upcoming hearings recorded" description="The calendar displays only hearings present in your accessible case records." /> : (
          <ul className="divide-y divide-navy-100">{upcoming.map((hearing) => <li key={hearing.id} className="py-3 flex flex-wrap justify-between gap-2"><div><p className="font-medium text-sm text-navy-800">{hearing.title}</p><p className="text-xs text-navy-500 mt-1">{hearing.court_name || 'Court not specified'}{hearing.courtroom ? ` · ${hearing.courtroom}` : ''}</p></div><p className="text-sm text-navy-600">{new Date(hearing.hearing_date).toLocaleString()} · {hearing.duration_minutes} min</p></li>)}</ul>
        )}
      </Card>
    </>
  );
}
