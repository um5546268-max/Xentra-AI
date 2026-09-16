"use client";

import { useEffect, useState } from "react";
import {
  Code,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Save,
  Play,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
  GitBranch,
  GitCommit as GitCommitIcon,
  Wand2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  getTree,
  readFile,
  writeFile,
  previewDiff,
  checkSyntax,
  runFile,
  gitStatus,
  gitInit,
  gitCommit,
  askAssistant,
  FileNode,
  GitStatus,
} from "@/lib/code";

export default function CodePage() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [proposedContent, setProposedContent] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<any>(null);
  const [runLoading, setRunLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, g] = await Promise.all([getTree(""), gitStatus()]);
      setTree(t.entries);
      setGit(g);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleOpenFile = async (path: string) => {
    setError(null);
    setInfo(null);
    setProposedContent(null);
    setDiffText(null);
    setRunOutput(null);
    try {
      const f = await readFile(path);
      setSelectedPath(path);
      setContent(f.content);
      setOriginalContent(f.content);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Could not read file");
    }
  };

  const handleSave = async () => {
    if (!selectedPath) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const syn = await checkSyntax(selectedPath, content);
      if (!syn.ok) {
        setError(`Syntax error: ${syn.error}`);
        return;
      }
      await writeFile(selectedPath, content);
      setOriginalContent(content);
      setInfo("Saved ✅");
      setTimeout(() => setInfo(null), 2000);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAskAI = async () => {
    if (!selectedPath || !aiInstruction.trim()) return;
    setAiLoading(true);
    setError(null);
    setProposedContent(null);
    setDiffText(null);
    try {
      const res = await askAssistant(selectedPath, aiInstruction.trim());
      setProposedContent(res.new_content);
      const diff = await previewDiff(selectedPath, res.new_content);
      setDiffText(diff.diff || "(no changes)");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptProposal = () => {
    if (proposedContent !== null) {
      setContent(proposedContent);
      setProposedContent(null);
      setDiffText(null);
      setInfo("Proposal loaded into editor. Click Save to apply.");
    }
  };

  const handleRun = async () => {
    if (!selectedPath) return;
    setRunLoading(true);
    setRunOutput(null);
    try {
      const res = await runFile(selectedPath);
      setRunOutput(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Run failed");
    } finally {
      setRunLoading(false);
    }
  };

  const handleGitCommit = async () => {
    const msg = prompt("Commit message:");
    if (!msg) return;
    try {
      const res = await gitCommit(msg);
      if (res.committed) {
        setInfo(`Committed: ${res.hash_short}`);
      } else {
        setInfo(res.reason || "Nothing to commit");
      }
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleGitInit = async () => {
    try {
      await gitInit();
      setInfo("Git initialized");
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
          <Code className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">Code Workspace</h1>
          <p className="text-xs text-slate-500 truncate">
            AI-powered coding inside a sandboxed folder
          </p>
        </div>

        {/* Git status */}
        {git && (
          <div className="flex items-center gap-2">
            {git.is_repo ? (
              <>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {git.branch || "main"}
                </span>
                {git.files.length > 0 && (
                  <span className="text-xs text-yellow-400">
                    {git.files.length} changes
                  </span>
                )}
                <button
                  onClick={handleGitCommit}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <GitCommitIcon className="w-3.5 h-3.5" />
                  Commit
                </button>
              </>
            ) : (
              <button
                onClick={handleGitInit}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Init git
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
      {info && (
        <div className="mx-6 mt-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          {info}
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        <div className="w-64 shrink-0 border-r border-slate-800 overflow-y-auto">
          <div className="p-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Files
          </div>
          {loading ? (
            <div className="text-xs text-slate-600 p-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="pb-4">
              {tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selected={selectedPath}
                  onSelect={handleOpenFile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedPath ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              Select a file to open
            </div>
          ) : (
            <>
              {/* File header */}
              <div className="border-b border-slate-800 px-4 py-2 flex items-center gap-3 text-xs">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-slate-300">{selectedPath}</span>
                {content !== originalContent && (
                  <span className="text-yellow-400 text-[10px] uppercase">
                    ● unsaved
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleRun}
                    disabled={runLoading || !selectedPath.endsWith(".py")}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {runLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    Run
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || content === originalContent}
                    className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs text-white hover:bg-violet-500 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save
                  </button>
                </div>
              </div>

              {/* Textarea editor */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-4 resize-none focus:outline-none overflow-auto"
              />

              {/* AI Bar */}
              <div className="border-t border-slate-800 p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400" />
                    <input
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAskAI();
                      }}
                      placeholder="Ask Xentra to change this code… e.g. 'add type hints'"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                      disabled={aiLoading}
                    />
                  </div>
                  <button
                    onClick={handleAskAI}
                    disabled={aiLoading || !aiInstruction.trim()}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium hover:bg-violet-500 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Ask
                  </button>
                </div>

                {/* Proposal */}
                {proposedContent !== null && (
                  <div className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-violet-300">
                        AI proposal ready
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setProposedContent(null);
                            setDiffText(null);
                          }}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800"
                        >
                          Reject
                        </button>
                        <button
                          onClick={handleAcceptProposal}
                          className="rounded bg-violet-600 px-2 py-1 text-[11px] text-white hover:bg-violet-500"
                        >
                          Accept & edit
                        </button>
                      </div>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                      {diffText}
                    </pre>
                  </div>
                )}

                {/* Run output */}
                {runOutput && (
                  <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">
                        {runOutput.command.split("\\").pop()}
                      </span>
                      <span
                        className={
                          runOutput.success ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        exit {runOutput.exit_code}
                        {runOutput.timed_out && " · TIMED OUT"}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tree node
// ============================================================

function TreeNode({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "directory";
  const isActive = selected === node.path;

  return (
    <div>
      <button
        onClick={() => (isDir ? setOpen(!open) : onSelect(node.path))}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs text-left transition ${
          isActive
            ? "bg-violet-500/10 text-violet-300"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {isDir ? (
          <>
            {open ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            {open ? (
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && open && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}