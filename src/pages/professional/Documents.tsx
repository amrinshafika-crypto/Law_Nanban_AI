import { ChangeEvent, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { orchestrate, type DocumentAnalysisResult, type OrchestratorResult } from '@/lib/agents';
import { useDocuments, useLegalReferences } from '@/lib/hooks';
import { detectFileType, extractTextFromFile } from '@/lib/fileExtraction';

export function Documents() {
  const { documents, loading, error: documentsError } = useDocuments();
  const { references } = useLegalReferences();
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalysis(null);
    setOrchestratorResult(null);
    setFileName(file.name);
    setError(null);
    if (detectFileType(file.name) === 'unknown') {
      setError('Choose a PDF, DOCX, or TXT file.');
      return;
    }
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      const response = await orchestrate('document_analysis', { text, fileName: file.name }, references);
      setOrchestratorResult(response);
      setAnalysis(response.result as DocumentAnalysisResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The document could not be processed.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <>
      <PageHeader title="Documents" subtitle="Review records already saved to your account or analyze a file locally." />
      <Card className="p-5 mb-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-8 text-center hover:border-accent-400">
          <Upload size={24} className="text-accent-700" />
          <span className="font-medium text-navy-800">Choose a PDF, DOCX, or TXT file</span>
          <span className="text-xs text-navy-500">Text extraction and summary run in this browser; the file is not uploaded or saved.</span>
          <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(event) => void handleFile(event)} />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-danger-700">{error}</p>}
        {busy && <div className="mt-4"><LoadingState message={`Analyzing ${fileName}...`} /></div>}
      </Card>
      {analysis && (
        <Card className="p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-navy-900">{fileName} · {analysis.wordCount} extracted words</h2>
            {orchestratorResult && <Badge color={orchestratorResult.verified ? 'success' : 'warning'}>{orchestratorResult.verified ? 'Verified enough for review' : 'Needs review'}</Badge>}
          </div>
          <p className="mt-3 text-sm leading-6 text-navy-700">{analysis.quickSummary}</p>
          {analysis.keyPoints.length > 0 && <><h3 className="font-medium text-navy-800 mt-4">Extracted key passages</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></>}
          {orchestratorResult?.verificationResult && (
            <p className="mt-3 text-xs text-navy-600 border-t border-navy-100 pt-3">{orchestratorResult.verificationResult.summary}</p>
          )}
          <p className="text-xs text-navy-500 mt-4 border-t border-navy-100 pt-3">Automated text extraction and pattern-based summary can miss or misread information. Check the original document; this is not legal advice.</p>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="font-semibold text-navy-900 mb-3">Saved document records</h2>
        {documentsError ? <p role="alert" className="text-sm text-danger-700">Saved documents could not be loaded: {documentsError}</p> : loading ? <LoadingState message="Loading saved documents..." /> : documents.length === 0 ? <EmptyState icon={<FileText size={28} />} title="No saved documents" description="Records associated with your account or assigned cases will appear here." /> : (
          <ul className="divide-y divide-navy-100">{documents.map((doc) => <li key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-sm text-navy-800">{doc.title}</p><p className="text-xs text-navy-500">{doc.file_name} · {doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString()}</p></div><span className="badge bg-navy-100 text-navy-700">{doc.status}</span></li>)}</ul>
        )}
      </Card>
    </>
  );
}
