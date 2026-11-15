import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export function MarkdownMessage({ content }: { content: string }) {
  return <div className="whitespace-normal break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      skipHtml
      components={{
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold leading-snug text-navy-900">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold leading-snug text-navy-900">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-bold leading-snug text-navy-900">{children}</h3>,
        p: ({ children }) => <p className="mb-3 whitespace-normal leading-7">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-accent-500 pl-4 text-navy-600">{children}</blockquote>,
        strong: ({ children }) => <strong className="font-semibold text-navy-900">{children}</strong>,
        a: ({ href, children }) => <a href={href} rel="noopener noreferrer" className="break-all text-accent-700 underline underline-offset-2">{children}</a>,
        table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
        th: ({ children }) => <th className="border border-navy-200 bg-navy-100 px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-navy-200 px-3 py-2 align-top">{children}</td>,
        pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-navy-900 p-3 text-xs leading-5 text-navy-50">{children}</pre>,
        code: ({ className, children }) => className
          ? <code className={`${className} font-mono`}>{children}</code>
          : <code className="rounded bg-navy-200/70 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
        hr: () => <hr className="my-4 border-navy-200" />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>;
}
