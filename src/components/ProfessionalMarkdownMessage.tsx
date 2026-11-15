import { MarkdownMessage } from '@/components/MarkdownMessage';

const escapedMarkdownPunctuation = /\\([\\`*_{}\[\]()#+.!|>~-])/g;
const codeSpanOrFence = /(`{3,}[\s\S]*?`{3,}|`[^`\n]*`)/g;

/** Removes only redundant Markdown escapes at render time; the stored answer remains unchanged. */
export function normalizeProfessionalMarkdown(content: string) {
  return content.split(codeSpanOrFence)
    .map((part, index) => index % 2 === 0 ? part.replace(escapedMarkdownPunctuation, '$1') : part)
    .join('');
}

export function ProfessionalMarkdownMessage({ content, className = '' }: { content: string; className?: string }) {
  return <div className={className}><MarkdownMessage content={normalizeProfessionalMarkdown(content)} /></div>;
}
