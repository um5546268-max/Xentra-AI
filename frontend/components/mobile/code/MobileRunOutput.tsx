"use client";

import { useEffect, useState } from "react";
import {
  X, Play, CheckCircle2, XCircle, Loader2, RefreshCw,
  Copy, Check, ChevronDown,
} from "lucide-react";
import { runFile, debugFile, RunResponse } from "@/lib/code";

export default function MobileRunOutput({
  filePath,
  mode = "run",
  onClose,
}: {
  filePath: string;
  mode?: "run" | "debug";
  onClose: () => void;
}) {
  const [output, setOutput] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"output" | "errors">("output");

  const execute = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res =
        mode === "debug"
          ? await debugFile(filePath, [])
          : await runFile(filePath, []);
      setOutput(res);
      // Auto-switch to errors tab if failed
      if (!res.success || res.stderr) {
        setTab(res.stdout ? "output" : "errors");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, mode]);

  const copyOutput = () => {
    const text = [output?.stdout, output?.stderr].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filename = filePath.split("/").pop() || filePath;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-100">
                {mode === "debug" ? "Debug Output" : "Run Output"}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {filename}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={copyOutput}
              disabled={!output}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200 disabled:opacity-30"
              title="Copy output"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status banner */}
        {output && (
          <div className="px-4 pb-3">
            <div
              className={`rounded-xl border p-3 flex items-center gap-3 ${
                output.success
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-red-500/40 bg-red-500/10"
              }`}
            >
              {output.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    output.success ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {output.success ? "Process completed successfully." : "Process failed."}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">$ {output.command}</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono">exit {output.exit_code}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {output && (
          <div className="px-4 pb-2 flex gap-1.5">
            <button
              onClick={() => setTab("output")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                tab === "output"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 bg-slate-900 border border-slate-800"
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setTab("errors")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                tab === "errors"
                  ? "bg-red-600 text-white"
                  : "text-slate-400 bg-slate-900 border border-slate-800"
              }`}
            >
              Errors
              {output.stderr && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-400 align-middle" />
              )}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <div className="text-xs text-slate-500">
                {mode === "debug" ? "Debugging…" : "Running…"}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : output ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <pre className="p-3 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words leading-relaxed max-h-[45vh] overflow-y-auto">
                {tab === "output"
                  ? output.stdout || "(no output)"
                  : output.stderr || "(no errors)"}
              </pre>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-3">
          <button
            onClick={execute}
            disabled={loading}
            className="w-full rounded-full py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Running…" : "Run Again"}
          </button>
        </div>
      </div>
    </div>
  );
}