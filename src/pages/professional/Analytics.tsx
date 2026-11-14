import { BarChart3, FolderKanban } from 'lucide-react';
import { Card, EmptyState, LoadingState, PageHeader, StatCard } from '@/components/ui';
import { useCases } from '@/lib/hooks';

export function Analytics() {
  const { cases, loading, error } = useCases();
  const statusCounts = cases.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  const priorityCounts = cases.reduce<Record<string, number>>((counts, item) => {
    counts[item.priority] = (counts[item.priority] || 0) + 1;
    return counts;
  }, {});

  return (
    <>
      <PageHeader title="Analytics" subtitle="Counts derived from case records visible to your account." />
      {error ? <p role="alert" className="mb-4 text-sm text-danger-700">Could not load case data: {error}</p> : loading ? <LoadingState message="Calculating case counts..." /> : cases.length === 0 ? <EmptyState icon={<BarChart3 size={30} />} title="No case data to summarize" description="Analytics will appear when case records are available." /> : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5"><StatCard label="Total visible cases" value={cases.length} icon={<FolderKanban size={20} />} /><StatCard label="Urgent cases" value={priorityCounts.urgent || 0} color="danger" /><StatCard label="Upcoming hearing dates" value={cases.filter((item) => item.next_hearing_date && new Date(item.next_hearing_date) >= new Date()).length} color="gold" /></div>
          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-5"><h2 className="font-semibold text-navy-900 mb-4">Cases by status</h2><ul className="space-y-3">{Object.entries(statusCounts).map(([status, count]) => <li key={status}><div className="flex justify-between text-sm"><span className="capitalize text-navy-700">{status}</span><span className="font-medium">{count}</span></div><div className="h-2 rounded-full bg-navy-100 mt-1"><div className="h-2 rounded-full bg-accent-500" style={{ width: `${(count / cases.length) * 100}%` }} /></div></li>)}</ul></Card>
            <Card className="p-5"><h2 className="font-semibold text-navy-900 mb-4">Cases by priority</h2><ul className="space-y-3">{Object.entries(priorityCounts).map(([priority, count]) => <li key={priority}><div className="flex justify-between text-sm"><span className="capitalize text-navy-700">{priority}</span><span className="font-medium">{count}</span></div><div className="h-2 rounded-full bg-navy-100 mt-1"><div className="h-2 rounded-full bg-gold-500" style={{ width: `${(count / cases.length) * 100}%` }} /></div></li>)}</ul></Card>
          </div>
          <p className="text-xs text-navy-500 mt-4">These counts reflect accessible records only and are not an operational or court-wide backlog metric.</p>
        </>
      )}
    </>
  );
}
