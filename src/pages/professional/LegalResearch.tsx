import { FormEvent, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { orchestrate, type OrchestratorResult, type ResearchResult } from '@/lib/agents';
import { useLegalReferences } from '@/lib/hooks';

export function LegalResearch() {
  const { references, loading, error } = useLegalReferences();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await orchestrate('legal_research', { query }, references);
    setOrchestratorResult(response);
    setResult(response.result as ResearchResult);
  }

  return (
    <>
      <PageHeader title="Legal Research" subtitle="Search the curated legal reference records available to this application." />
      <Card className="p-5 mb-5">
        {error ? <p role="alert" className="text-sm text-danger-700">Legal references could not be loaded: {error}</p> : loading ? <LoadingState message="Loading legal references..." /> : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
            <input className="input" required value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a topic, right, statute, or citation..." aria-label="Research query" />
            <button className="btn-primary shrink-0" type="submit"><Search size={16} /> Search references</button>
          </form>
        )}
        {!loading && !error && <p className="text-xs text-navy-500 mt-3">{references.length} reference record(s) available. Matching uses local keyword retrieval, not live legal research.</p>}
      </Card>
      {result ? (
        <div className="space-y-4">
          <Card className="p-5"><div className="flex items-center gap-2"><BookOpen size={18} className="text-accent-700" /><h2 className="font-semibold text-navy-900">{result.identifiedTopic}</h2></div><p className="text-sm text-navy-700 mt-3 whitespace-pre-line">{result.explanation}</p><p className="text-xs text-navy-500 mt-4 border-t border-navy-100 pt-3">{result.limitations}</p></Card>
          {orchestratorResult?.verificationResult && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-navy-900">Verification gate</h3>
                <Badge color={orchestratorResult.verified ? 'success' : 'warning'}>{orchestratorResult.verified ? 'Verified' : 'Needs review'}</Badge>
              </div>
              <p className="mt-2 text-xs text-navy-600">{orchestratorResult.verificationResult.summary}</p>
            </Card>
          )}
          {result.references.map((reference) => <Card key={reference.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium text-navy-900">{reference.title}</h3><Badge color={reference.verified ? 'success' : 'warning'}>{reference.verified ? 'Marked verified in database' : 'Unverified record'}</Badge></div><p className="text-xs text-navy-500 mt-1">{reference.citation || reference.source} · {reference.jurisdiction}</p>{reference.summary && <p className="text-sm text-navy-700 mt-2">{reference.summary}</p>}{reference.source_url && <a className="text-sm text-accent-700 hover:underline mt-2 inline-block" href={reference.source_url} target="_blank" rel="noreferrer">Open source</a>}</Card>)}
        </div>
      ) : <EmptyState icon={<BookOpen size={28} />} title="Search the available references" description="Results are limited to the curated records present in the reference database; no citation or current-law verification is performed here." />}
    </>
  );
}
