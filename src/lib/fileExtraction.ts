const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MIN_READABLE_TEXT_LENGTH = 10;

export type SupportedFileType = 'pdf' | 'docx' | 'txt';

export function detectFileType(fileName: string): SupportedFileType | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf' || ext === 'docx' || ext === 'txt') return ext;
  return 'unknown';
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size === 0) throw new Error('The selected file is empty. Choose a document with content.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('The selected file is larger than the 10 MB limit.');

  const fileType = detectFileType(file.name);
  if (fileType === 'unknown') throw new Error('Unsupported file format. Choose a PDF, DOCX, or TXT file.');

  const buffer = await file.arrayBuffer();
  let text: string;

  if (fileType === 'txt') {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } else if (fileType === 'pdf') {
    text = await extractPdfText(buffer);
  } else {
    text = await extractDocxText(buffer);
  }

  const cleanText = text.split('\0').join('').replace(/\r\n?/g, '\n').trim();
  if (fileType === 'pdf' && cleanText.length < MIN_READABLE_TEXT_LENGTH) {
    throw new Error('No selectable text was found. The PDF may be empty, scanned, or image-only; OCR is not available.');
  }
  if (!cleanText) throw new Error('No readable text was found. The document may be empty or corrupted.');
  if (cleanText.length < MIN_READABLE_TEXT_LENGTH) {
    throw new Error('The document contains too little readable text to explain.');
  }
  return cleanText;
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error('The file does not contain a valid PDF header.');
  }
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const loadingTask = pdfjs.getDocument({ data: bytes });
  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      if (pageText.trim()) pages.push(pageText);
    }
    return pages.join('\n\n');
  } catch (error) {
    const details = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`The PDF could not be read. It may be corrupted or password-protected.${details}`);
  } finally {
    await loadingTask.destroy();
  }
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('The file does not contain a valid DOCX archive.');
  }
  const { default: mammoth } = await import('mammoth/mammoth.browser.js');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
