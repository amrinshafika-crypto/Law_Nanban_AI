import { useState } from 'react';
import { ArrowRight, Brain, CalendarDays, FileText, FolderKanban, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, LoadingState, PageHeader, StatCard, statusBadge } from '@/components/ui';
import { useAgentTasks, useCases, useDocuments, useHearings } from '@/lib/hooks';
import { runProfessionalAgents } from '@/lib/professionalAi';
import { ProfessionalMarkdownMessage } from '@/components/ProfessionalMarkdownMessage';

export function Dashboard() {
  const { cases, loading, error } = useCases();
  const { hearings, loading: hearingsLoading, error: hearingsError } = useHearings();
  const { tasks, loading: tasksLoading } = useAgentTasks();
  const { documents, loading: documentsLoading, error: documentsError } = useDocuments();
  const [aiInsight, setAiInsight] = useState('');
  const [aiError, setAiError] = useState('');
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const upcoming = hearings.filter((hearing) => new Date(hearing.hearing_date) >= new Date()).slice(0, 5);

  async function generateInsight() {
    if (generatingInsight || cases.length === 0) return;
    setGeneratingInsight(true); setAiInsight(''); setAiError('');
    try {
      const batch = await runProfessionalAgents(['case_summary'], {
        cases: cases.slice(0, 8).map((item) => ({ caseNumber: item.case_number, title: item.title, description: item.description, category: item.category, status: item.status, priority: item.priority, filingDate: item.filing_date, nextHearingDate: item.next_hearing_date })),
        upcomingHearings: upcoming.map((item) => ({ title: item.title, hearingDate: item.hearing_date, court: item.court_name })),
      });
      setAiInsight(batch.results[0]?.answer || '');
      if (batch.failures.length) setAiError(batch.failures[0].message);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : 'AI case insights could not be generated.');
    } finally {
      setGeneratingInsight(false);
    }
  }

  return (
    <>
      <PageHeader title="Professional Overview" subtitle="A current view of your assigned casework." />
      {error ? <p role="alert" className="mb-4 text-sm text-danger-700">Cases could not be loaded: {error}</p> : loading ? <LoadingState message="Loading your casework..." /> : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
            <StatCard label="Assigned cases" value={cases.length} icon={<FolderKanban size={20} />} />
            <StatCard label="Active cases" value={cases.filter((item) => item.status === 'active' || item.status === 'hearing').length} icon={<ArrowRight size={20} />} color="accent" />
            <StatCard label="Urgent priority" value={cases.filter((item) => item.priority === 'urgent').length} icon={<FolderKanban size={20} />} color="danger" />
            <StatCard label="Upcoming hearings" value={hearingsLoading || hearingsError ? '—' : upcoming.length} icon={<CalendarDays size={20} />} color="gold" />
            <StatCard label="Pending agent tasks" value={tasksLoading ? '—' : tasks.filter((task) => task.status === 'pending' || task.status === 'running').length} icon={<ListTodo size={20} />} color="accent" />
          </div>
          <Card className="mb-6 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy-900">AI case insights</h2><p className="mt-1 text-sm text-navy-500">Generate a review summary from up to eight assigned cases and their upcoming hearing dates.</p></div><button type="button" className="btn-primary" onClick={() => void generateInsight()} disabled={generatingInsight || cases.length === 0}><Brain size={16} />{generatingInsight ? 'Generating...' : 'Generate insights'}</button></div>{generatingInsight && <div className="mt-3"><LoadingState message="Running the authenticated case summary agent..." /></div>}{aiError && <p role="alert" className="mt-3 text-sm text-danger-700">{aiError}</p>}{aiInsight && <ProfessionalMarkdownMessage content={aiInsight} className="mt-4 border-t border-navy-100 pt-4 text-sm leading-6 text-navy-700" />}<p className="mt-3 text-xs text-navy-500">AI-generated prioritisation is advisory. Verify each case record and date; this is not an outcome prediction.</p></Card>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-navy-900">Recent cases</h2>
                <Link to="/app/cases" className="text-sm text-accent-700 hover:underline">View all</Link>
              </div>
              {cases.length === 0 ? (
                <EmptyState icon={<FolderKanban size={28} />} title="No assigned cases yet" description="Cases assigned to your account will appear here." />
              ) : (
                <ul className="divide-y divide-navy-100">
                  {cases.slice(0, 5).map((item) => (
                    <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/app/cases/${item.id}`} className="font-medium text-sm text-navy-800 hover:text-accent-700">{item.title}</Link>
                        <p className="text-xs text-navy-500 mt-1">{item.case_number}</p>
                      </div>
                      {statusBadge(item.status)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-navy-900">Recent documents</h2><Link to="/app/documents" className="text-sm text-accent-700 hover:underline">Open workspace</Link></div>
              {documentsError ? <p role="alert" className="text-sm text-danger-700">Documents could not be loaded: {documentsError}</p> : documentsLoading ? <LoadingState message="Loading recent documents..." /> : documents.length === 0 ? <EmptyState icon={<FileText size={26} />} title="No recent documents" description="Documents saved to your workspace will appear here." /> : <ul className="divide-y divide-navy-100">{documents.slice(0, 5).map((document) => <li key={document.id} className="py-3"><p className="truncate text-sm font-medium text-navy-800">{document.title}</p><p className="mt-1 text-xs text-navy-500">{document.file_type.toUpperCase()} · {new Date(document.created_at).toLocaleDateString()} · {document.status}</p></li>)}</ul>}
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-navy-900">Upcoming hearings</h2>
                <Link to="/app/calendar" className="text-sm text-accent-700 hover:underline">Open calendar</Link>
              </div>
              {hearingsError ? <p role="alert" className="text-sm text-danger-700">Hearings could not be loaded: {hearingsError}</p> : hearingsLoading ? <LoadingState message="Loading hearings..." /> : upcoming.length === 0 ? (
                <EmptyState icon={<CalendarDays size={28} />} title="No upcoming hearings" description="Hearings already recorded for your assigned cases will appear here." />
              ) : (
                <ul className="divide-y divide-navy-100">
                  {upcoming.map((hearing) => (
                    <li key={hearing.id} className="py-3 flex items-center gap-3">
                      <div className="rounded-lg bg-navy-50 px-3 py-2 text-center">
                        <p className="text-xs text-navy-500">{new Date(hearing.hearing_date).toLocaleDateString(undefined, { month: 'short' })}</p>
                        <p className="font-semibold text-navy-900">{new Date(hearing.hearing_date).getDate()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-800 truncate">{hearing.title}</p>
                        <p className="text-xs text-navy-500">{new Date(hearing.hearing_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {hearing.court_name || 'Court not specified'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="mt-6">
            <Link to="/app/documents" className="card card-hover p-4 flex items-center gap-3 text-sm text-navy-700">
              <FileText size={18} className="text-accent-700" /> Review the documents workspace <ArrowRight size={16} className="ml-auto" />
            </Link>
          </div>
          {cases.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{Array.from(new Set(cases.map((item) => item.category))).map((category) => <Badge key={category}>{category}</Badge>)}</div>}
        </>
      )}
    </>
  );
}
