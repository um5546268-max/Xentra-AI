"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Save,
  Play,
  Loader2,
  AlertCircle,
  Check,
  Wand2,
  Sparkles,
} from "lucide-react";
import { useCodeStore } from "@/lib/code-store";
import { CodeEditor } from "./CodeEditor";

const LANGUAGE_BY_EXT: Record<string, string> = {
  py: "Python", js: "JavaScript", mjs: "JavaScript",
  ts: "TypeScript", tsx: "TypeScript React", jsx: "React",
  c: "C", h: "C Header", cpp: "C++", cc: "C++", cxx: "C++",
  hpp: "C++ Header", java: "Java", go: "Go", rs: "Rust",
  rb: "Ruby", php: "PHP", sh: "Bash", bash: "Bash",
  html: "HTML", css: "CSS", scss: "SCSS", json: "JSON",
  md: "Markdown", txt: "Text", sql: "SQL", yml: "YAML",
  yaml: "YAML", toml: "TOML", xml: "XML",
};

const RUNNABLE_EXTS = [
  "py","js","mjs","ts","c","cpp","cc","cxx",
  "java","go","rs","rb","php","sh","bash",
];
const LIVE_PREVIEW_EXTS = ["html", "css", "js", "mjs", "json", "svg"];

const LANG_COLORS: Record<string, string> = {
  html: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  css: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  js: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  mjs: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  ts: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  py: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
};

type Props = {
  onSave: (path: string, content: string) => Promise<void>;
  onRun: (path: string, args: string) => Promise<void>;
  onAskAI: (path: string, instruction: string) => Promise<void>;
  onAcceptProposal: () => void;
  onRejectProposal: () => void;
};

export function EditorArea({
  onSave, onRun, onAskAI, onAcceptProposal, onRejectProposal,
}: Props) {
  const {
    openFiles, activePath, updateFileContent, markSaved,
    runArgs, setRunArgs, runOutput, runLoading,
    aiInstruction, setAiInstruction, aiLoading,
    proposedContent, diffText,
  } = useCodeStore();

  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const file = openFiles.find((f) => f.path === activePath) ?? null;


  useEffect(() => {
    setInfo(null);
    setError(null);
    setAutoSavedAt(null);
  }, [activePath]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ── Line numbers + minimap ──
  const lines = useMemo(() => {
    if (!file) return [];
    return file.content.split("\n");
  }, [file?.content]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2">
        <div className="text-sm">Select a file to open</div>
        <div className="text-xs text-slate-700">
          Use the Project Explorer on the left
        </div>
      </div>
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const canRun = RUNNABLE_EXTS.includes(ext);
  const languageLabel = LANGUAGE_BY_EXT[ext] ?? "Text";
  const langColorClass =
    LANG_COLORS[ext] ?? "text-slate-400 border-slate-700 bg-slate-900";
  const shouldAutoSave = LIVE_PREVIEW_EXTS.includes(ext);

  // ── Auto-save (debounced) ──
  const handleContentChange = (newContent: string) => {
    updateFileContent(file.path, newContent);
    if (!shouldAutoSave) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(file.path, newContent);
        markSaved(file.path);
        setAutoSavedAt(Date.now());
      } catch (e) {
        console.error("[auto-save] failed:", e);
      }
    }, 400);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await onSave(file.path, file.content);
      markSaved(file.path);
      setInfo("Saved");
      setTimeout(() => setInfo(null), 1800);
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setError(null);
    try { await onRun(file.path, runArgs); }
    catch (err: any) { setError(err?.message || "Run failed"); }
  };

  const handleAskAI = async () => {
    if (!aiInstruction.trim()) return;
    setError(null);
    try { await onAskAI(file.path, aiInstruction.trim()); }
    catch (err: any) { setError(err?.message || "AI failed"); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* File header bar */}
      <div className="border-b border-slate-800 px-3 py-2 flex items-center gap-3 text-xs bg-slate-950/60 shrink-0">
        <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border shrink-0 ${langColorClass}`}>
          {languageLabel}
        </span>
        <span className="font-mono text-slate-300 truncate flex-1">
          {file.path}
        </span>
        {shouldAutoSave && autoSavedAt && !file.dirty && (
          <span className="text-[10px] text-emerald-500/70 shrink-0">
            auto-saved
          </span>
        )}
        {file.dirty && (
          <span className="text-yellow-400 text-[10px] uppercase font-medium shrink-0">
            ● unsaved
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {canRun && (
            <input
              value={runArgs}
              onChange={(e) => setRunArgs(e.target.value)}
              placeholder="args…"
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-200 w-32 focus:border-violet-500 focus:outline-none"
            />
          )}
          {canRun && (
            <button
              onClick={handleRun}
              disabled={runLoading}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              {runLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !file.dirty}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1 text-xs text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-3 mt-2 rounded border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
      {info && (
        <div className="mx-3 mt-2 rounded border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          {info}
        </div>
      )}

      {/* ─── Editor with line numbers + minimap ─── */}
      {/* ─── CodeMirror editor + minimap ─── */}
<div className="flex-1 flex overflow-hidden bg-slate-950">
  <CodeEditor
    value={file.content}
    onChange={handleContentChange}
    fileName={file.name}
  />

  {/* Minimap */}
  <div className="w-24 bg-slate-950/80 border-l border-slate-800/60 overflow-hidden shrink-0 hidden md:block">
    <div className="p-1.5 font-mono text-[4px] leading-[5px] text-slate-500/70 overflow-hidden">
      {lines.slice(0, 200).map((line, i) => (
        <div
          key={i}
          className="truncate whitespace-nowrap"
          title={line}
        >
          {line || " "}
        </div>
      ))}
    </div>
  </div>
</div>

      {/* Bottom bar — AI + Run output */}
      <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400" />
            <input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAI();
                }
              }}
              placeholder="Ask Xentra to change this code…"
              className="w-full rounded-md border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
              disabled={aiLoading}
            />
          </div>
          <button
            onClick={handleAskAI}
            disabled={aiLoading || !aiInstruction.trim()}
            className="rounded-md bg-violet-600 px-4 py-2 text-xs font-medium hover:bg-violet-500 disabled:opacity-40 flex items-center gap-1.5"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Ask
          </button>
        </div>

        {proposedContent !== null && (
          <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-violet-300">
                AI proposal ready
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRejectProposal}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800"
                >
                  Reject
                </button>
                <button
                  onClick={onAcceptProposal}
                  className="rounded bg-violet-600 px-2 py-1 text-[11px] text-white hover:bg-violet-500"
                >
                  Accept & edit
                </button>
              </div>
            </div>
            {diffText && (
              <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                {diffText}
              </pre>
            )}
          </div>
        )}

        {runOutput && (
          <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono">
                {runOutput.command?.split(/[\\/]/).pop() ?? "run"}
              </span>
              <span className={runOutput.success ? "text-emerald-400" : "text-red-400"}>
                exit {runOutput.exit_code}
              </span>
            </div>
            {runOutput.stdout && (
              <pre className="text-[11px] font-mono text-emerald-300 max-h-32 overflow-auto whitespace-pre-wrap">
                {runOutput.stdout}
              </pre>
            )}
            {runOutput.stderr && (
              <pre className="text-[11px] font-mono text-red-300 max-h-32 overflow-auto whitespace-pre-wrap">
                {runOutput.stderr}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}