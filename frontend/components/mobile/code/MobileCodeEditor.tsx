"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, Save, Play, Bug, Sparkles, Loader2, Check,
  AlertCircle, Wrench, Settings,
} from "lucide-react";
import { readFile, writeFile, checkSyntax } from "@/lib/code";

export default function MobileCodeEditor({
  path,
  onBack,
  onAskAI,
  onRunOutput,
  onOpenTools,
  onOpenSettings,
}: {
  path: string;
  onBack: () => void;
  onAskAI: () => void;
  onRunOutput: (output: { type: "run" | "debug"; path: string }) => void;
  onOpenTools?: () => void;
  onOpenSettings?: () => void;
}) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    readFile(path)
      .then((res) => {
        setContent(res.content);
        setOriginal(res.content);
      })
      .catch(() => setError("Could not read file"))
      .finally(() => setLoading(false));
  }, [path]);

  const isDirty = content !== original;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    try {
      if (path.endsWith(".py")) {
        const syn = await checkSyntax(path, content);
        if (!syn.ok) {
          throw new Error(`Syntax error: ${syn.error}`);
        }
      }
      await writeFile(path, content);
      setOriginal(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filename = path.split("/").pop() || path;
  const lineCount = content.split("\n").length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900 shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 px-1">
          <div className="text-sm font-semibold text-slate-100 truncate">
            {filename}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {lineCount} lines{isDirty && " · unsaved"}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition shrink-0 ${
            saved
              ? "text-emerald-400"
              : isDirty
              ? "text-violet-300 hover:bg-slate-900"
              : "text-slate-600"
          }`}
          title="Save"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>

        {onOpenTools && (
          <button
            onClick={onOpenTools}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900 shrink-0"
            title="Tools"
          >
            <Wrench className="w-4 h-4" />
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900 shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full h-full resize-none bg-slate-950 px-3 py-3 text-[13px] font-mono text-slate-200 leading-relaxed focus:outline-none"
          style={{
            tabSize: 2,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 px-3 py-2 border-t border-red-800/50 bg-red-950/40 text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Bottom action bar */}
      <div
        className="shrink-0 border-t border-slate-800 bg-slate-950 px-3 py-3 flex items-center gap-2 sticky bottom-0 z-30"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <button
          onClick={onAskAI}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 py-2.5 text-xs font-medium text-violet-300 transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Assistant
        </button>

        <button
          onClick={() => onRunOutput({ type: "run", path })}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/30 transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          }}
        >
          <Play className="w-3.5 h-3.5" />
          Run
        </button>

        <button
          onClick={() => onRunOutput({ type: "debug", path })}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs font-medium text-slate-300 transition active:scale-95"
        >
          <Bug className="w-3.5 h-3.5" />
          Debug
        </button>
      </div>
    </div>
  );
}