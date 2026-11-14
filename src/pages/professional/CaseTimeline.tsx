import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { useCases, useCaseEvents } from '@/lib/hooks';

export function CaseTimeline() {
  const { cases, loading: casesLoading, error: casesError } = useCases();
  const [caseId, setCaseId] = useState('');
  const { events, loading, error } = useCaseEvents(caseId || undefined);
  const selectedCase = cases.find((item) => item.id === caseId);

  return (
    <>
      <PageHeader title="Case Timeline" subtitle="Review events recorded against an assigned case." />
      <Card className="p-5">
        <label className="label" htmlFor="timeline-case">Select case</label>
        {casesError ? <p role="alert" className="text-sm text-danger-700 mb-4">Cases could not be loaded: {casesError}</p> : casesLoading ? <LoadingState message="Loading cases..." /> : (
          <select id="timeline-case" className="input mb-5" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            <option value="">Choose a case</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} · {item.title}</option>)}
          </select>
        )}
        {!caseId ? <EmptyState icon={<GitBranch size={28} />} title="Choose a case to view its timeline" /> : error ? <p role="alert" className="text-sm text-danger-700">Timeline events could not be loaded: {error}</p> : loading ? <LoadingState message="Loading case events..." /> : events.length === 0 ? (
          <EmptyState icon={<GitBranch size={28} />} title="No timeline events" description={`No events are recorded for ${selectedCase?.case_number || 'this case'}.`} />
        ) : (
          <ol className="space-y-5">
            {events.map((event) => <li key={event.id} className="relative border-l-2 border-accent-200 pl-5"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-accent-500" /><p className="font-medium text-navy-900">{event.title}</p><p className="text-xs text-navy-500 mt-1">{new Date(event.event_date).toLocaleString()} · {event.category} · {event.source_type}</p>{event.description && <p className="text-sm text-navy-600 mt-2">{event.description}</p>}</li>)}
          </ol>
        )}
      </Card>
    </>
  );
}
