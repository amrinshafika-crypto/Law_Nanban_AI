import { FormEvent, useState } from 'react';
import { AlertTriangle, Brain } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { orchestrate, type OrchestratorResult, type TriageResult } from '@/lib/agents';
import { runProfessionalAgents } from '@/lib/professionalAi';
import type { CaseCategory } from '@/types';
import { ProfessionalMarkdownMessage } from '@/components/ProfessionalMarkdownMessage';

const categories: CaseCategory[] = ['criminal', 'civil', 'family', 'property', 'consumer', 'cyber', 'labor', 'constitutional', 'corporate', 'tax', 'other'];

export function CaseTriage() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CaseCategory>('other');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiError, setAiError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await orchestrate('triage', { description, category }, []);
      setOrchestratorResult(response);
      setResult(response.result as TriageResult);
      setAiAnalysis('');
      setAiError('');
      setAnalyzing(true);
      try {
        const batch = await runProfessionalAgents(['triage'], { description, selectedCategory: category });
        setAiAnalysis(batch.results[0]?.answer || '');
        if (batch.failures.length) setAiError(batch.failures[0].message);
      } catch (error) {
        setAiError(error instanceof Error ? error.message : 'Professional AI triage could not be completed.');
      } finally {
        setAnalyzing(false);
      }
    } catch (error) {
      setOrchestratorResult(null);
      setResult(null);
      console.error('Triage orchestration failed', error);
    }
  }

  return (
    <>
      <PageHeader title="Smart Case Triage" subtitle="Combine local fact-pattern checks with server-side AI analysis. Review every finding before use." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label" htmlFor="triage-description">Case description</label><textarea id="triage-description" className="input min-h-44" required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue, key events, urgency, and any known deadlines..." /></div>
            <div><label className="label" htmlFor="triage-category">Known category (optional)</label><select id="triage-category" className="input" value={category} onChange={(event) => setCategory(event.target.value as CaseCategory)}>{categories.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>
            <button type="submit" className="btn-primary" disabled={analyzing}><Brain size={16} />{analyzing ? 'Analyzing...' : 'Analyze description'}</button>
          </form>
        </Card>
        <Card className="p-5">
          {!result ? <EmptyState icon={<Brain size={30} />} title="Triage results will appear here" description="Analysis is run in your browser and is not saved to a case record." /> : (
            <div className="space-y-4">
              <div><p className="text-xs uppercase font-semibold text-navy-500">Suggested category</p><p className="text-lg font-semibold capitalize text-navy-900">{result.category}</p></div>
              <div><p className="text-xs uppercase font-semibold text-navy-500">Suggested priority</p><Badge color={result.priority === 'urgent' ? 'danger' : result.priority === 'high' ? 'warning' : 'accent'}>{result.priority}</Badge></div>
              <div><h2 className="font-semibold text-navy-800">Reasoning</h2><p className="mt-1 text-sm text-navy-600">{result.reasoning}</p></div>
              {result.missingInfo.length > 0 && <div><h2 className="font-semibold text-navy-800">Information to confirm</h2><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{result.missingInfo.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              <div><h2 className="font-semibold text-navy-800">Suggested next steps</h2><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{result.nextSteps.map((item) => <li key={item}>{item}</li>)}</ul></div>
              {result.urgencyIndicators.length > 0 && <p className="flex gap-2 text-sm text-warning-800"><AlertTriangle size={17} /> Indicators detected: {result.urgencyIndicators.join(', ')}</p>}
              <div className="border-t border-navy-100 pt-3"><h2 className="font-semibold text-navy-800">AI case triage</h2>{analyzing ? <LoadingState message="Running the authenticated professional triage agent..." /> : aiError ? <p role="alert" className="mt-2 text-sm text-danger-700">{aiError}</p> : aiAnalysis ? <ProfessionalMarkdownMessage content={aiAnalysis} className="mt-2 text-sm leading-6 text-navy-700" /> : null}</div>
              {orchestratorResult?.verificationResult && (
                <div className="border-t border-navy-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase font-semibold text-navy-500">Verification gate</p>
                    <Badge color={orchestratorResult.verified ? 'success' : 'warning'}>{orchestratorResult.verified ? 'Verified' : 'Needs review'}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-navy-600">{orchestratorResult.verificationResult.summary}</p>
                </div>
              )}
              <p className="text-xs text-navy-500 border-t border-navy-100 pt-3">Heuristic informational support only. Not legal advice or an autonomous decision; verify the original facts and use professional judgment.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
