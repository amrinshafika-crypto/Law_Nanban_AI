import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader, priorityBadge, statusBadge } from '@/components/ui';
import { useCases } from '@/lib/hooks';

export function Cases() {
  const { cases, loading, error, reload } = useCases();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return cases.filter((item) => !term || [item.title, item.case_number, item.court_name, item.description].some((value) => value?.toLowerCase().includes(term)));
  }, [cases, query]);

  return (
    <>
      <PageHeader title="Cases" subtitle="Cases assigned to your professional account." action={<div className="flex flex-wrap gap-2"><Link to="/app/triage" className="btn-outline">Case triage</Link><Link to="/app/cases/new" className="btn-primary"><Plus size={16} /> New case</Link></div>} />
      <label className="relative block mb-5">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        <input className="input pl-10" type="search" value={query} onChange={(event) => setSearchParams(event.target.value ? { q: event.target.value } : {})} placeholder="Search title, case number, court..." aria-label="Search cases" />
      </label>
      {error ? <div role="alert" className="mb-4 flex items-center justify-between rounded-lg bg-danger-50 p-3 text-sm text-danger-700"><span>Could not load cases: {error}</span><button className="btn-outline" onClick={() => void reload()}>Retry</button></div> : loading ? <LoadingState message="Loading cases..." /> : filtered.length === 0 ? (
        <EmptyState icon={<FolderKanban size={30} />} title={query ? 'No matching cases' : 'No cases assigned'} description={query ? 'Try another search term.' : 'Assigned cases will appear here when available.'} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase text-navy-500"><tr><th className="px-4 py-3">Case</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Next hearing</th></tr></thead>
              <tbody className="divide-y divide-navy-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-navy-50/60">
                    <td className="px-4 py-3"><Link to={`/app/cases/${item.id}`} className="font-medium text-navy-900 hover:text-accent-700">{item.title}</Link><p className="text-xs text-navy-500 mt-1">{item.case_number}</p></td>
                    <td className="px-4 py-3 capitalize text-navy-600">{item.category}</td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3">{priorityBadge(item.priority)}</td>
                    <td className="px-4 py-3 text-navy-600">{item.next_hearing_date ? new Date(item.next_hearing_date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
