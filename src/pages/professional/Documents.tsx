import { ChangeEvent, useState } from 'react';
import { FileText, Upload, Download } from 'lucide-react';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { analyzeDocument, type DocumentAnalysisResult, type DocumentAnalysisRun } from '@/lib/documentAnalysis';
import { useCases, useDocuments } from '@/lib/hooks';
import { detectFileType, extractTextFromFile } from '@/lib/fileExtraction';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { runProfessionalAgents } from '@/lib/professionalAi';

export function Documents() {
  const { documents, loading, error: documentsError } = useDocuments();
  const { cases } = useCases();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [analysisRun, setAnalysisRun] = useState<DocumentAnalysisRun | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiError, setAiError] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState('');
  const [saveOriginal, setSaveOriginal] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadDocId, setDownloadDocId] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setAnalysis(null);
    setAnalysisRun(null);
    setAiAnalysis('');
    setAiError('');
    setFileName(file.name);
    setError(null);
    const fileType = detectFileType(file.name);
    const allowedMime = fileType === 'pdf' ? ['application/pdf', 'application/octet-stream']
      : fileType === 'docx' ? ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']
        : fileType === 'txt' ? ['text/plain', 'application/octet-stream'] : [];
    if (fileType === 'unknown' || (file.type && !allowedMime.includes(file.type))) {
      setError('Choose a PDF, DOCX, or TXT file.');
      setSelectedFile(null);
      return;
    }
  }

  async function analyzeFile() {
    if (!selectedFile || busy) return;
    const file = selectedFile;
    setBusy(true); setAnalysis(null); setAnalysisRun(null); setAiAnalysis(''); setAiError(''); setError(null); setDownloadUrl('');
    let recordId = '';
    try {
      const text = await extractTextFromFile(file);
      if (saveOriginal) {
        if (!user) throw new Error('Sign in to save an original to your private workspace. You can uncheck the save option to analyze this file locally.');
        const fileType = detectFileType(file.name);
        if (fileType === 'unknown') throw new Error('Unsupported file format.');
        recordId = crypto.randomUUID();
        const safeFileName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-180);
        const path = `${user.id}/${recordId}-${safeFileName}`;
        const { error: uploadError } = await supabase.storage.from('professional-documents').upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw new Error(`The original could not be saved: ${uploadError.message}`);
        const { error: recordError } = await supabase.from('documents').insert({
          id: recordId, case_id: caseId || null, title: file.name, file_name: file.name, file_type: fileType,
          file_size: file.size, storage_path: path, extracted_text: text, uploaded_by: user.id, status: 'uploaded',
        });
        if (recordError) {
          await supabase.storage.from('professional-documents').remove([path]);
          throw new Error(`The original was uploaded but its record could not be saved: ${recordError.message}`);
        }
      }
      const response = analyzeDocument(text, file.name);
      setAnalysisRun(response);
      const result = response.result;
      setAnalysis(result);
      let generatedAnalysis = '';
      if (!text.trim()) {
        setAiError('No readable document text was extracted. Professional AI analysis needs text and cannot run OCR here.');
      } else {
        try {
          const batch = await runProfessionalAgents(['document_intelligence'], { fileName: file.name, extractedText: text });
          generatedAnalysis = batch.results[0]?.answer || '';
          setAiAnalysis(generatedAnalysis);
          if (batch.failures.length) setAiError(batch.failures[0].message);
        } catch (caught) {
          setAiError(caught instanceof Error ? caught.message : 'Professional AI document analysis could not be completed.');
        }
      }
      if (recordId) {
        const summary = JSON.stringify({ quickSummary: result.quickSummary, detailedSummary: result.detailedSummary, professionalAiAnalysis: generatedAnalysis || null, parties: result.partyRoles, identifiers: result.identifiers, product: result.product, timeline: result.timeline, financialAmounts: result.financialAmounts, keyPoints: result.keyPoints, reviewIssues: result.reviewIssues, evidence: result.evidence, missingInfo: result.missingInfo, wordCount: result.wordCount, verification: response.verificationResult }, null, 2);
        const { error: summaryError } = await supabase.from('document_summaries').insert({ document_id: recordId, summary_type: 'quick', content: summary });
        const { error: statusError } = await supabase.from('documents').update({ status: 'analyzed' }).eq('id', recordId);
        if (summaryError || statusError) setError('Analysis completed, but its saved record could not be fully updated.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The document could not be processed.');
      if (recordId) await supabase.from('documents').update({ status: 'failed' }).eq('id', recordId);
    } finally {
      setBusy(false);
    }
  }

  async function getOriginal(storagePath: string) {
    const { data, error: linkError } = await supabase.storage.from('professional-documents').createSignedUrl(storagePath, 60);
    if (linkError || !data?.signedUrl) { setError('A secure download link could not be created.'); return; }
    setDownloadUrl(data.signedUrl);
    const pathParts = storagePath.split('/');
    setDownloadDocId(pathParts[pathParts.length - 1]?.split('.')[0] || '');
  }

  function downloadSummary() {
    if (!analysis) return;
    const content = [`Document: ${fileName}`, `Extracted words: ${analysis.wordCount}`, '', 'Summary', analysis.detailedSummary, '', 'Identifiers', ...analysis.identifiers.map((item) => `- ${item.label}: ${item.value}`), '', 'Key issues', ...analysis.reviewIssues.map((item) => `- ${item}`), '', 'Questions for review', ...analysis.questions.map((item) => `- ${item}`), '', 'Automated extraction requires review against the original document. This is not legal advice.'].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${fileName}.summary.txt`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Documents" subtitle="Analyze PDF or DOCX files and save originals to your private workspace." />
      <Card className="p-5 mb-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-8 text-center hover:border-accent-400">
          <Upload size={24} className="text-accent-700" />
          <span className="font-medium text-navy-800">Choose a PDF, DOCX, or TXT file</span>
          <span className="text-xs text-navy-500">Maximum 10 MB. Extraction and analysis run in this browser.</span>
          <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(event) => void handleFile(event)} />
        </label>
        {selectedFile && <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label><span className="label">Attach to case (optional)</span><select className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">No case</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number} · {item.title}</option>)}</select></label>
          <div className="flex items-end"><label className="flex items-center gap-2 pb-3 text-sm text-navy-700"><input type="checkbox" checked={saveOriginal} onChange={(event) => setSaveOriginal(event.target.checked)} />Save original to private workspace</label></div>
          {saveOriginal && <p className="md:col-span-2 text-xs leading-5 text-navy-500">The original and extracted text will be stored in your private Supabase workspace. Only your account can access the file. If unchecked, analysis stays in this browser and is not saved.</p>}
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-navy-700">{selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB</span><button className="btn-primary" type="button" onClick={() => void analyzeFile()} disabled={busy}>{busy ? 'Analyzing...' : 'Analyze document'}</button></div>
        </div>}
        {error && <p role="alert" className="mt-3 text-sm text-danger-700">{error}</p>}
        {busy && <div className="mt-4"><LoadingState message={`Analyzing ${fileName}...`} /></div>}
      </Card>
      {analysis && (
        <Card className="p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-navy-900">{fileName} · {analysis.wordCount} extracted words</h2>
            {analysisRun && <Badge color={analysisRun.verified ? 'success' : 'warning'}>{analysisRun.verified ? 'Verified enough for review' : 'Needs review'}</Badge>}
          </div>
          <button type="button" onClick={downloadSummary} className="btn-outline mt-3"><Download size={15} />Download summary</button>
          <section className="mt-4 rounded-lg border border-accent-100 bg-accent-50/40 p-4"><h3 className="font-semibold text-navy-900">Professional AI document analysis</h3>{busy ? <LoadingState message="Running the authenticated document analysis agent..." /> : aiError ? <p role="alert" className="mt-2 text-sm text-danger-700">{aiError}</p> : aiAnalysis ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-navy-700">{aiAnalysis}</p> : <p className="mt-2 text-sm text-navy-600">AI analysis has not been completed for this document.</p>}<p className="mt-3 text-xs text-navy-500">AI output is a working analysis. Confirm facts, provisions, and deadlines against the original document.</p></section>
          <p className="mt-3 text-sm leading-6 text-navy-700">{analysis.overview}</p>
          {analysis.identifiers.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Identifiers and subject</h3>{analysis.identifiers.map((item) => <p key={`${item.label}-${item.value}`} className="text-sm text-navy-600 mt-1"><strong>{item.label}:</strong> {item.value}</p>)}{analysis.product.value && <p className="text-sm text-navy-600 mt-1"><strong>Product / subject:</strong> {analysis.product.value}</p>}</section>}
          {analysis.financialAmounts.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Financial amounts</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.financialAmounts.map((amount, index) => <li key={`${amount.kind}-${amount.original}-${index}`}>{amount.kind.replace(/_/g, ' ')}: {amount.original}{amount.currency ? '' : ' · currency uncertain; verify original'}</li>)}</ul></section>}
          {analysis.keyPoints.length > 0 && <><h3 className="font-medium text-navy-800 mt-4">Extracted key passages</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></>}
          {analysis.timeline.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Chronology</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.timeline.map((item, index) => <li key={`${item.isoDate}-${index}`}>{item.event}: {item.originalDate}{item.status === 'uncertain' ? ' · review date/context' : ''}</li>)}</ul></section>}
          {analysis.reviewIssues.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Issues requiring review</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.reviewIssues.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {analysis.evidence.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Evidence mentioned in the text</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.evidence.map((item) => <li key={item.name}>{item.name}: {item.status === 'mentioned_not_attached' ? 'the text says not attached' : 'attachment presence not verified by text extraction'}</li>)}</ul></section>}
          {analysis.missingInfo.length > 0 && <section className="mt-4"><h3 className="font-medium text-navy-800">Missing information and factual gaps</h3><ul className="list-disc pl-5 text-sm text-navy-600 mt-1">{analysis.missingInfo.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {analysisRun?.verificationResult && <div className="mt-4 border-t border-navy-100 pt-3"><p className="text-xs text-navy-600">{analysisRun.verificationResult.summary}</p><ul className="mt-2 space-y-2">{analysisRun.verificationResult.checks.map((check) => <li key={check.name} className="text-xs text-navy-600"><strong>{check.name} · {check.status.replace(/_/g, ' ')}</strong><span className="block">{check.detail}</span></li>)}</ul></div>}
          <p className="text-xs text-navy-500 mt-4 border-t border-navy-100 pt-3">Automated text extraction and pattern-based summary can miss or misread information. Check the original document; this is not legal advice.</p>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="font-semibold text-navy-900 mb-3">Saved document records</h2>
        {documentsError ? <p role="alert" className="text-sm text-danger-700">Saved documents could not be loaded: {documentsError}</p> : loading ? <LoadingState message="Loading saved documents..." /> : documents.length === 0 ? <EmptyState icon={<FileText size={28} />} title="No saved documents" description="Records associated with your account or assigned cases will appear here." /> : (
          <ul className="divide-y divide-navy-100">{documents.map((doc) => <li key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-sm text-navy-800">{doc.title}</p><p className="text-xs text-navy-500">{doc.file_name} · {doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><span className="badge bg-navy-100 text-navy-700">{doc.status}</span>{doc.storage_path && <button type="button" className="btn-outline" onClick={() => void getOriginal(doc.storage_path!)}>Secure download link</button>}</div>{downloadUrl && downloadDocId === doc.id && <a className="w-full text-right text-sm text-accent-700 underline" target="_blank" rel="noreferrer" href={downloadUrl}>Open original (link expires in 1 minute)</a>}</li>)}</ul>
        )}
      </Card>
    </>
  );
}
