import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, FileText, GitBranch } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader, priorityBadge, statusBadge } from '@/components/ui';
import { useCase, useCaseEvents } from '@/lib/hooks';

export function CaseDetail() {
  const { id } = useParams();
  const { caseData, loading, error } = useCase(id);
  const { events, loading: eventsLoading, error: eventsError } = useCaseEvents(id);

  if (loading) return <LoadingState message="Loading case..." />;
  if (error) return <EmptyState icon={<FileText size={30} />} title="Case could not be loaded" description={error} action={<Link className="btn-outline" to="/app/cases"><ArrowLeft size={16} /> Back to cases</Link>} />;
  if (!caseData) return <EmptyState icon={<FileText size={30} />} title="Case not found" description="This case may not exist or may not be assigned to your account." action={<Link className="btn-outline" to="/app/cases"><ArrowLeft size={16} /> Back to cases</Link>} />;

  return (
    <>
      <Link to="/app/cases" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-accent-700 mb-4"><ArrowLeft size={16} /> All cases</Link>
      <PageHeader title={caseData.title} subtitle={caseData.case_number} />
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
      <Card className="p-5 mt-5">
        <div className="flex items-center gap-2 mb-3"><GitBranch size={18} className="text-accent-700" /><h2 className="font-semibold text-navy-900">Case timeline</h2></div>
        {eventsError ? <p role="alert" className="text-sm text-danger-700">Timeline events could not be loaded: {eventsError}</p> : eventsLoading ? <LoadingState message="Loading timeline..." /> : events.length === 0 ? (
          <EmptyState icon={<CalendarDays size={26} />} title="No timeline events" description="Events recorded for this case will appear here." />
        ) : (
          <ol className="space-y-4">
            {events.map((event) => <li key={event.id} className="border-l-2 border-accent-200 pl-4"><p className="font-medium text-sm text-navy-800">{event.title} <Badge className="ml-1">{event.category}</Badge></p><p className="text-xs text-navy-500 mt-1">{new Date(event.event_date).toLocaleString()} · {event.source_type} entry</p>{event.description && <p className="text-sm text-navy-600 mt-1">{event.description}</p>}</li>)}
          </ol>
        )}
      </Card>
    </>
  );
}
