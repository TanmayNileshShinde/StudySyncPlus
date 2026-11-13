import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { MermaidDiagram } from './MermaidDiagram';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

/** Recursively extracts plain text from React nodes (for clipboard copy & Mermaid parser). */
function extractTextContent(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join('');
  }
  if (React.isValidElement(node) && node.props && (node.props as any).children) {
    return extractTextContent((node.props as any).children);
  }
  return '';
}

const CodeBlock: React.FC<{
  language?: string;
  rawText: string;
  children: React.ReactNode;
}> = ({ language, rawText, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (language === 'mermaid') {
    return <MermaidDiagram chart={rawText} />;
  }

  return (
    <div className="my-4 border border-rule bg-paper-sunk overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#f0f0ee] border-b border-rule text-[11px] font-mono text-ink-3">
        <span className="uppercase font-semibold tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink hover:text-ink-2 px-2 py-0.5 border border-rule bg-paper transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-lime-deep" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed bg-[#fdfdfc]">
        <pre className="m-0 p-0 bg-transparent font-mono whitespace-pre">
          <code className="hljs font-mono">{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose-clean space-y-3.5 text-[14px] leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const rawText = extractTextContent(children);
            const isInline = !match && !rawText.includes('\n');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 font-mono text-[12px] bg-paper-sunk border border-rule text-ink font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match ? match[1] : undefined} rawText={rawText}>
                {children}
              </CodeBlock>
            );
          },
          table({ children }) {
            return (
              <div className="my-3.5 border border-rule overflow-x-auto bg-paper">
                <table className="w-full text-left text-xs border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-paper-sunk border-b border-rule font-mono text-[11px] uppercase tracking-wider text-ink font-bold">
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-rule">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-paper-sunk/40 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="p-3 border-r border-rule last:border-r-0 font-bold text-ink whitespace-nowrap">{children}</th>;
          },
          td({ children }) {
            return (
              <td className="p-3 border-r border-rule last:border-r-0 font-normal leading-normal text-ink">
                {children}
              </td>
            );
          },
          h1({ children }) {
            return (
              <h1 className="font-extrabold text-xl sm:text-2xl text-ink tracking-tight mt-5 mb-2 pb-1.5 border-b border-rule">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="font-bold text-lg sm:text-xl text-ink tracking-tight mt-4 mb-2 pb-1 border-b border-rule">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="font-bold text-base text-ink tracking-tight mt-3 mb-1.5">
                {children}
              </h3>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 space-y-1.5 my-2 marker:text-ink-3">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 space-y-1.5 my-2 font-mono text-[13px]">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1 leading-relaxed text-ink">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 pl-3.5 py-1 border-l-2 border-lime bg-paper-sunk text-ink-2 italic text-xs">
                {children}
              </blockquote>
            );
          },
          p({ children }) {
            return <p className="leading-relaxed my-2">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-bold text-ink">{children}</strong>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink font-semibold underline decoration-lime decoration-2 underline-offset-2 hover:text-ink-2"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
