"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <div className="my-3 rounded-lg overflow-hidden border border-slate-700">
                <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700">
                  <span>{match?.[1] || "code"}</span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(String(children).replace(/\n$/, ""))
                    }
                    className="hover:text-violet-400 transition"
                  >
                    Copy
                  </button>
                </div>
                <pre className="!m-0 !rounded-none bg-slate-900 p-3 overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code
                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-violet-300"
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ children, ...props }: any) {
            return (
              <a
                {...props}
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:underline"
              >
                {children}
              </a>
            );
          },
          p({ children }: any) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },
          ul({ children }: any) {
            return <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>;
          },
          table({ children }: any) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th className="bg-slate-900 px-3 py-2 text-left text-slate-300 border-b border-slate-700">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-3 py-2 border-b border-slate-800">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}