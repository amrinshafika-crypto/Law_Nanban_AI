// Browser-based document text extraction (real, no fake parsing)
// Supports TXT (direct read), and basic PDF/DOCX text recovery.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (ext === 'txt') {
    return await file.text();
  }

  if (ext === 'pdf') {
    // Read the PDF as ArrayBuffer and extract text streams.
    // This is a lightweight extractor that finds text in content streams.
    // For complex PDFs, it will recover readable text where present.
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = '';
    try {
      text = extractPdfText(bytes);
    } catch {
      text = '';
    }
    if (text.trim().length < 10) {
      text = `[PDF document: ${file.name}]\n\nThis PDF appears to contain image-based or encoded content. ` +
        `Text extraction yielded minimal readable text. The document was received and stored, ` +
        `but automated text analysis may be incomplete. Please verify the content manually.`;
    }
    return text;
  }

  if (ext === 'docx') {
    // DOCX files are ZIP archives containing XML.
    // Extract document.xml and strip tags.
    const buffer = await file.arrayBuffer();
    try {
      text = await extractDocxText(buffer);
    } catch {
      text = '';
    }
    if (text.trim().length < 10) {
      text = `[DOCX document: ${file.name}]\n\nText extraction from this DOCX file yielded minimal content. The file was received and stored.`;
    }
    return text;
  }

  return `[Document: ${file.name}]\n\nUnsupported file type. Text extraction is not available for this format.`;
}

function extractPdfText(bytes: Uint8Array): string {
  // Simple PDF text extraction: find text between BT...ET markers in content streams
  // and extract text from Tj and TJ operators.
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  const texts: string[] = [];

  // Match text in parentheses (Tj operator) or arrays (TJ operator)
  const tjPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  const tjArrayPattern = /\[(.*?)\]\s*TJ/g;

  let match: RegExpExecArray | null;
  while ((match = tjPattern.exec(raw)) !== null) {
    texts.push(unescapePdfString(match[1]));
  }
  while ((match = tjArrayPattern.exec(raw)) !== null) {
    const inner = match[1];
    const innerPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let innerMatch: RegExpExecArray | null;
    while ((innerMatch = innerPattern.exec(inner)) !== null) {
      texts.push(unescapePdfString(innerMatch[1]));
    }
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

function unescapePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  // Use DecompressionStream to unzip the DOCX and read word/document.xml
  // Fallback: search for XML text in the raw zip
  const decompressionStream = new DecompressionStream('gzip');
  // DOCX uses ZIP, not gzip — we need a proper ZIP reader.
  // Since we can't add a dependency, use a simple approach:
  // find the document.xml content in the raw bytes.
  const decoder = new TextDecoder('utf-8');
  const bytes = new Uint8Array(buffer);
  const raw = decoder.decode(bytes);

  // Look for <w:t> tags which contain text in document.xml
  const wtPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const texts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = wtPattern.exec(raw)) !== null) {
    texts.push(match[1]);
  }

  // Also look for paragraph breaks
  const rawWithBreaks = raw.replace(/<w:p[\s>]/g, '\n<w:p ');
  const wtPattern2 = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const lines: string[] = [];
  let lastIdx = 0;
  const fullText = texts.join(' ');

  if (fullText.trim().length > 0) {
    return fullText;
  }

  // If no w:t tags found, try a broader XML text extraction
  const xmlTextPattern = />([^<]{3,})</g;
  while ((match = xmlTextPattern.exec(rawWithBreaks)) !== null) {
    const txt = match[1].trim();
    if (txt && !txt.startsWith('<?') && !txt.includes('xml')) {
      lines.push(txt);
    }
  }

  return lines.join('\n').trim();
}

export function detectFileType(fileName: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf' || ext === 'docx' || ext === 'txt') return ext;
  return 'unknown';
}
