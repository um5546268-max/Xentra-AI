"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Source = { title: string; url: string };

export default function MarkdownMessage({
  content,
  sources,
}: {
  content: string;
  sources?: Source[];
}) {
  // Replace [1], [2], ... in content with markdown links so they become clickable.
  // Guards against replacing markdown link syntax like [text](url) by requiring a
  // non-'(' char after the closing bracket.
  const withLinks = sources?.length
    ? content.replace(/\[(\d+)\](?!\()/g, (match, n) => {
        const idx = parseInt(n, 10) - 1;
        const src = sources[idx];
        if (!src) return match;
        return `[[${n}]](${src.url})`;
      })
    : content;

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = !inline;

            if (isBlock) {
              // ✅ Use <span> with display:block instead of <div>
              // to avoid "div inside p" hydration errors.
              return (
                <span
                  className="my-3 rounded-lg overflow-hidden border border-slate-700"
                  style={{ display: "block" }}
                >
                  <span
                    className="flex items-center justify-between bg-slate-950 px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700"
                    style={{ display: "flex" }}
                  >
                    <span>{match?.[1] || "code"}</span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          String(children).replace(/\n$/, "")
                        )
                      }
                      className="hover:text-violet-400 transition"
                    >
                      Copy
                    </button>
                  </span>
                  <span
                    className="bg-slate-900 p-3 overflow-x-auto"
                    style={{ display: "block" }}
                  >
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </span>
                </span>
              );
            }

            return (
              <code
                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-violet-300"
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ children, ...props }: any) {
            // Detect citation links like [1] and style them as inline pills
            const isCitation =
              Array.isArray(children) &&
              children.length === 1 &&
              typeof children[0] === "string" &&
              /^\[\d+\]$/.test(children[0]);

            if (isCitation) {
              return (
                <a
                  {...props}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.2rem] px-1 mx-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-mono font-semibold hover:bg-violet-500/40 hover:text-violet-200 transition no-underline"
                >
                  {children}
                </a>
              );
            }

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
            return (
              <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
            );
          },
          ol({ children }: any) {
            return (
              <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
            );
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
              <td className="px-3 py-2 border-b border-slate-800">
                {children}
              </td>
            );
          },
        }}
      >
        {withLinks}
      </ReactMarkdown>
    </div>
  );
}