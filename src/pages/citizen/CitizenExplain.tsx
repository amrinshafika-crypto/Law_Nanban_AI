import { ChangeEvent, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/ui';
import { analyzeDocument, type DocumentAnalysisResult, type DocumentAnalysisRun } from '@/lib/documentAnalysis';
import { detectFileType, extractTextFromFile } from '@/lib/fileExtraction';

export function CitizenExplain({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [analysisRun, setAnalysisRun] = useState<DocumentAnalysisRun | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalysis(null);
    setAnalysisRun(null);
    setExtractedText('');
    setFileName(file.name);
    setError('');
    if (detectFileType(file.name) === 'unknown') {
      setError(lang === 'ta' ? 'PDF, DOCX அல்லது TXT கோப்பைத் தேர்ந்தெடுக்கவும்.' : 'Choose a PDF, DOCX, or TXT file.');
      event.target.value = '';
      return;
    }
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      const response = analyzeDocument(text, file.name);
      setExtractedText(text);
      setAnalysisRun(response);
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
      <PageHeader title={t.explain.title} subtitle={t.explain.subtitle} />
      <Card className="p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-8 text-center hover:border-accent-400">
          <Upload size={24} className="text-accent-700" />
          <span className="font-medium text-navy-800">{t.explain.upload}</span>
          <span className="text-xs text-navy-500">PDF, DOCX, TXT · Maximum 10 MB. {lang === 'ta' ? 'கோப்பு உங்கள் உலாவியில் மட்டுமே செயலாக்கப்படும்; பதிவேற்றப்படாது.' : 'Processed in your browser; not uploaded.'}</span>
          <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(event) => void handleFile(event)} aria-label={lang === 'ta' ? 'ஆவணத்தைத் தேர்ந்தெடுக்கவும்' : 'Choose a document'} />
        </label>
        {error && <p role="alert" className="text-sm text-danger-700 mt-3">{error}</p>}
        {busy && <div className="mt-4"><LoadingState message={t.explain.analyzing} /></div>}
      </Card>
      {analysis && (
        <div className="space-y-4 mt-5">
          {lang === 'ta' && <p className="rounded bg-amber-50 p-3 text-xs text-amber-900">ஆவண விளக்க வெளியீடு ஆங்கிலத்தில் உருவாக்கப்பட்டுள்ளது; மூல ஆவணம் மொழிபெயர்க்கப்படவில்லை.</p>}
          <Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-navy-900">{lang === 'ta' ? 'தானியக்க விளக்கம்' : 'Automated explanation'} · {fileName}</h2>{analysisRun && <Badge color={analysisRun.verified ? 'success' : 'warning'}>{analysisRun.verified ? (lang === 'ta' ? 'முன்கூட்டிய சரிபார்ப்பு' : 'Passed review') : (lang === 'ta' ? 'மறுபரிசீலனை' : 'Needs review')}</Badge>}</div><p className="text-sm leading-6 text-navy-700 mt-3">{analysis.overview}</p><p className="text-xs text-navy-500 mt-3">{analysis.wordCount} {lang === 'ta' ? 'சொற்கள் எடுக்கப்பட்டன' : 'words extracted'} · {analysis.documentType}</p>{analysisRun?.verificationResult && <div className="mt-3 border-t border-navy-100 pt-3"><p className="text-xs text-navy-600">{analysisRun.verificationResult.summary}</p><ul className="mt-2 space-y-2">{analysisRun.verificationResult.checks.map((check) => <li key={check.name} className="text-xs text-navy-600"><strong>{check.name} · {check.status.replace(/_/g, ' ')}</strong><span className="block">{check.detail}</span></li>)}</ul></div>}</Card>
          {analysis.keyPoints.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">{t.explain.keyPoints}</h2><ul className="list-disc pl-5 text-sm text-navy-700 mt-3 space-y-2">{analysis.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></Card>}
          {analysis.dates.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">{t.explain.dates}</h2><ul className="list-disc pl-5 text-sm text-navy-700 mt-2">{analysis.dates.map((date, index) => <li key={`${date}-${index}`}>{date}</li>)}</ul></Card>}
          {analysis.parties.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">{t.explain.parties}</h2><p className="text-sm text-navy-700 mt-2">{analysis.parties.join(', ')}</p></Card>}
          {(analysis.identifiers.length > 0 || analysis.product.value) && <Card className="p-5"><h2 className="font-semibold text-navy-900">Document identifiers and subject</h2>{analysis.identifiers.map((item) => <p key={`${item.label}-${item.value}`} className="mt-2 text-sm text-navy-700"><strong>{item.label}:</strong> {item.value}</p>)}<p className="mt-2 text-sm text-navy-700"><strong>Product / subject:</strong> {analysis.product.value ?? 'Not stated'}</p></Card>}
          {analysis.financialAmounts.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">Financial amounts</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-700">{analysis.financialAmounts.map((amount, index) => <li key={`${amount.kind}-${amount.original}-${index}`}>{amount.kind.replace(/_/g, ' ')}: {amount.original}{amount.currency ? '' : ' · currency uncertain; verify original'}</li>)}</ul></Card>}
          {analysis.reviewIssues.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">Key issues requiring review</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-navy-700">{analysis.reviewIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></Card>}
          {analysis.evidence.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">Evidence mentioned in the text</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-navy-700">{analysis.evidence.map((item) => <li key={item.name}><strong>{item.name}:</strong> {item.status === 'mentioned_not_attached' ? 'The document text says it is not attached.' : 'Mentioned; attachment presence could not be verified by text extraction.'}</li>)}</ul></Card>}
          {analysis.missingInfo.length > 0 && <Card className="p-5"><h2 className="font-semibold text-navy-900">Missing information and factual gaps</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-navy-700">{analysis.missingInfo.map((item) => <li key={item}>{item}</li>)}</ul></Card>}
          <Card className="p-5"><h2 className="font-semibold text-navy-900">{t.explain.questions}</h2><ul className="list-disc pl-5 text-sm text-navy-700 mt-2 space-y-2">{analysis.questions.map((question) => <li key={question}>{question}</li>)}</ul></Card>
          <details className="rounded-lg border border-navy-200 bg-white p-4"><summary className="cursor-pointer font-medium text-navy-800">{lang === 'ta' ? 'எடுக்கப்பட்ட ஆவண உரையைக் காண்க' : 'View extracted document text'}</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-navy-700">{extractedText}</pre></details>
          <p className="text-xs text-navy-500">{lang === 'ta' ? 'சுருக்கம் மற்றும் குறிப்புகள் தானியக்க வடிவமைப்பு சார்ந்தவை; அசல் ஆவணத்துடன் ஒப்பிடவும். OCR இல்லை. இது சட்ட ஆலோசனை அல்லது ஆவண நம்பகத்தன்மைச் சரிபார்ப்பு அல்ல.' : 'The summary and key points are automated pattern-based output. Compare them with the original. OCR is not available. This does not verify authenticity or provide legal advice.'}</p>
        </div>
      )}
      {!analysis && !busy && <div className="mt-4"><EmptyState icon={<FileText size={28} />} title={lang === 'ta' ? 'ஆவணத்தைத் தேர்ந்தெடுக்கவும்' : 'Choose a document to begin'} description={lang === 'ta' ? 'PDF, DOCX மற்றும் TXT கோப்புகள் ஆதரிக்கப்படுகின்றன.' : 'PDF, DOCX, and TXT files are supported.'} /></div>}
    </>
  );
}
