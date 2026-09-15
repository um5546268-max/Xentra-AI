"use client";

import { useState } from "react";
import {
  Globe,
  Loader2,
  ExternalLink,
  Camera,
  FileText,
  AlertCircle,
} from "lucide-react";
import { browserOpen, BrowserResult } from "@/lib/browser";

export default function BrowserPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrowserResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await browserOpen(finalUrl);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to open URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Browser Agent</h1>
            <p className="text-sm text-slate-500">
              Open any URL. Xentra renders it, extracts text, and screenshots it.
            </p>
          </div>
        </div>

        {/* URL Input */}
        <form
          onSubmit={handleOpen}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com or just example.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Open"
              )}
            </button>
          </div>

          <div className="text-xs text-slate-600">
            Try:{" "}
            {["example.com", "python.org", "wikipedia.org"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setUrl(s)}
                className="text-violet-400 hover:underline mr-2"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Title + URL */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-500">Page</div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-400 hover:underline flex items-center gap-1"
                >
                  Open in new tab <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {result.title || "(no title)"}
              </h2>
              <div className="font-mono text-xs text-slate-500 truncate">
                {result.url}
              </div>
            </div>

            {/* Screenshot */}
            {result.screenshot_b64 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Screenshot
                  </span>
                </div>
                <img
                  src={`data:image/png;base64,${result.screenshot_b64}`}
                  alt="Page screenshot"
                  className="w-full"
                />
              </div>
            )}

            {/* Text */}
            {result.text && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Extracted text · {result.text.length} chars
                  </span>
                </div>
                <div className="p-4 text-sm text-slate-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {result.text}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="text-center py-16 space-y-2 text-slate-600">
            <Globe className="w-12 h-12 mx-auto opacity-30" />
            <div className="text-sm">Enter a URL to open it in the browser agent.</div>
            <div className="text-xs text-slate-700">
              Screenshots, text extraction, and rendering happen in a sandboxed Chromium.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}