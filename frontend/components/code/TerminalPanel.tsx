"use client";

import { useEffect, useRef, useState } from "react";
import {
  Terminal as TerminalIcon,
  AlertCircle,
  FileOutput,
  Bug,
  Plus,
  Trash2,
  ChevronDown,
  MoreHorizontal,
  X,
  Split,
} from "lucide-react";
import { useCodeStore } from "@/lib/code-store";

type Tab = "terminal" | "problems" | "output" | "debug";

type TermInstance = {
  id: string;
  label: string;
  lines: string[];
};

export function TerminalPanel({ height = 180 }: { height?: number }) {
  const {
    terminalTab: tab,
    setTerminalTab: setTab,
    runOutput,
    git,
    terminalOutput,
  } = useCodeStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Multi-terminal instances ──
  const [terms, setTerms] = useState<TermInstance[]>([
    { id: "t1", label: "powershell", lines: [] },
  ]);
  const [activeTerm, setActiveTerm] = useState("t1");

  // Sync store's terminalOutput into the active term
  useEffect(() => {
    setTerms((prev) =>
      prev.map((t) =>
        t.id === activeTerm ? { ...t, lines: terminalOutput } : t
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalOutput]);

  useEffect(() => {
    if (tab === "terminal" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terms, activeTerm, tab]);

  const problems = buildProblems(git, runOutput);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "terminal",
      label: "Terminal",
      icon: <TerminalIcon className="w-3 h-3" />,
    },
    {
      id: "problems",
      label: "Problems",
      icon: <AlertCircle className="w-3 h-3" />,
      count: problems.length,
    },
    { id: "output", label: "Output", icon: <FileOutput className="w-3 h-3" /> },
    { id: "debug", label: "Debug Console", icon: <Bug className="w-3 h-3" /> },
  ];

  // ── Terminal actions ──
  const addTerminal = () => {
    const id = `t${Date.now()}`;
    setTerms((prev) => [
      ...prev,
      {
        id,
        label: `powershell ${prev.length + 1}`,
        lines: ["$ Terminal ready."],
      },
    ]);
    setActiveTerm(id);
    setTab("terminal");
  };

  const killTerminal = (id: string) => {
    setTerms((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = {
          id: `t${Date.now()}`,
          label: "powershell",
          lines: ["$ Terminal ready."],
        };
        setActiveTerm(fresh.id);
        return [fresh];
      }
      if (activeTerm === id) setActiveTerm(next[0].id);
      return next;
    });
  };

  const splitTerminal = () => {
    addTerminal();
  };

  const clearActiveTerminal = () => {
    setTerms((prev) =>
      prev.map((t) => (t.id === activeTerm ? { ...t, lines: [] } : t))
    );
  };

  if (collapsed) {
    return (
      <div className="border-t border-slate-800 bg-slate-950 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900 transition"
        >
          <TerminalIcon className="w-3 h-3" />
          Show terminal
          <ChevronDown className="w-3 h-3 ml-auto" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t border-slate-800 bg-slate-950 flex flex-col shrink-0 relative"
      style={{ height }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-800 shrink-0">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                active
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-0.5 text-[9px] rounded-full bg-red-500/20 text-red-300 px-1.5 leading-4">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1 relative">
          {tab === "terminal" && terms.length > 1 && (
            <span className="text-[10px] text-slate-600 font-mono mr-1">
              {terms.find((t) => t.id === activeTerm)?.label}
            </span>
          )}

          <button
            onClick={clearActiveTerminal}
            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-900"
            title="More"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-md border border-slate-700 bg-[#1e1e2e] shadow-xl py-1 text-[12px]">
                <MenuAction
                  icon={<Plus className="w-3.5 h-3.5" />}
                  label="New Terminal"
                  onClick={() => {
                    addTerminal();
                    setMenuOpen(false);
                  }}
                />
                <MenuAction
                  icon={<Split className="w-3.5 h-3.5" />}
                  label="Split Terminal"
                  onClick={() => {
                    splitTerminal();
                    setMenuOpen(false);
                  }}
                />
                <MenuAction
                  icon={<X className="w-3.5 h-3.5" />}
                  label="Kill Terminal"
                  danger
                  onClick={() => {
                    killTerminal(activeTerm);
                    setMenuOpen(false);
                  }}
                />
                <div className="my-1 border-t border-slate-700/60" />
                <MenuAction
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Clear"
                  onClick={() => {
                    clearActiveTerminal();
                    setMenuOpen(false);
                  }}
                />
              </div>
            </>
          )}

          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-900"
            title="Collapse"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Multi-terminal instance tabs */}
      {tab === "terminal" && terms.length > 1 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto">
          {terms.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTerm(t.id)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 ${
                activeTerm === t.id
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                  : "text-slate-500 hover:bg-slate-900"
              }`}
            >
              {t.label}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  killTerminal(t.id);
                }}
                className="hover:text-red-400"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </button>
          ))}
          <button
            onClick={addTerminal}
            className="p-0.5 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-300 shrink-0"
            title="New terminal"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
      >
        {tab === "terminal" && (
          <TerminalBody
            lines={terms.find((t) => t.id === activeTerm)?.lines ?? []}
          />
        )}
        {tab === "problems" && <ProblemsBody problems={problems} />}
        {tab === "output" && <OutputBody runOutput={runOutput} />}
        {tab === "debug" && <DebugBody />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════
function MenuAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-1.5 text-left transition ${
        danger
          ? "text-red-400 hover:bg-red-500/15"
          : "text-slate-200 hover:bg-violet-500/20"
      }`}
    >
      <span className="w-4 flex justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL BODY
// ═══════════════════════════════════════════════════════════════
function TerminalBody({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return (
      <div className="text-slate-600">
        <div>$ Terminal ready.</div>
        <div className="mt-1">Run a file to see output here.</div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.startsWith("$ ")
              ? "text-emerald-400"
              : l.startsWith("[error]")
              ? "text-red-400"
              : l.startsWith("[warn]")
              ? "text-yellow-400"
              : l.startsWith("[info]")
              ? "text-blue-400"
              : "text-slate-300"
          }
        >
          {l}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROBLEMS BODY — shows test results if available, else lint issues
// ═══════════════════════════════════════════════════════════════
type Problem = {
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning" | "info";
};

function ProblemsBody({ problems }: { problems: Problem[] }) {
  const { runOutput } = useCodeStore();
  const testResult = runOutput?.mode === "test" ? runOutput : null;

  // If the last action was a test run, show the test report
  if (testResult) {
    const s = testResult.summary ?? {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };

    return (
      <div className="space-y-3">
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-semibold">
            ✓ {s.passed} passed
          </span>
          {s.failed > 0 && (
            <span className="text-red-400 font-semibold">
              ✗ {s.failed} failed
            </span>
          )}
          {s.skipped > 0 && (
            <span className="text-yellow-400">⊘ {s.skipped} skipped</span>
          )}
          <span className="ml-auto text-slate-500 font-mono">
            {testResult.framework}
          </span>
        </div>

        {/* Command line */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>$</span>
          <span className="font-mono text-emerald-400">
            {testResult.command}
          </span>
          <span
            className={`ml-auto ${
              testResult.success ? "text-emerald-400" : "text-red-400"
            }`}
          >
            exit {testResult.exit_code}
          </span>
        </div>

        {/* Output */}
        {testResult.stdout && (
          <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded p-2 max-h-64 overflow-auto">
            {testResult.stdout}
          </pre>
        )}
        {testResult.stderr && (
          <pre className="text-[11px] font-mono text-red-300 whitespace-pre-wrap bg-slate-950 border border-red-900/40 rounded p-2 max-h-40 overflow-auto">
            {testResult.stderr}
          </pre>
        )}
      </div>
    );
  }

  // Fallback: lint / syntax problems
  if (problems.length === 0) {
    return <div className="text-emerald-400">✓ No problems detected.</div>;
  }

  return (
    <div className="space-y-1">
      {problems.map((p, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-2 py-1 rounded hover:bg-slate-900/60"
        >
          <span
            className={`text-[10px] uppercase font-bold px-1 rounded shrink-0 ${
              p.severity === "error"
                ? "bg-red-500/20 text-red-300"
                : p.severity === "warning"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {p.severity}
          </span>
          <span className="text-slate-400 truncate flex-1 font-mono">
            {p.file}
            {p.line !== undefined && `:${p.line}`}
          </span>
          <span className="text-slate-300 truncate max-w-[300px]">
            {p.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT BODY — shows last run result
// ═══════════════════════════════════════════════════════════════
function OutputBody({ runOutput }: { runOutput: any }) {
  if (!runOutput) {
    return <div className="text-slate-600">No output yet. Run a file.</div>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-slate-500">$</span>
        <span className="text-emerald-400 font-mono">
          {runOutput.command ?? "run"}
        </span>
        <span
          className={`ml-auto ${
            runOutput.success ? "text-emerald-400" : "text-red-400"
          }`}
        >
          exit {runOutput.exit_code}
          {runOutput.timed_out && " · TIMED OUT"}
        </span>
      </div>
      {runOutput.stdout && (
        <pre className="text-emerald-300 whitespace-pre-wrap font-mono">
          {runOutput.stdout}
        </pre>
      )}
      {runOutput.stderr && (
        <pre className="text-red-300 whitespace-pre-wrap font-mono">
          {runOutput.stderr}
        </pre>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEBUG BODY — shows debug session output
// ═══════════════════════════════════════════════════════════════
function DebugBody() {
  const { runOutput } = useCodeStore();
  const debugOutput = runOutput?.mode === "debug" ? runOutput : null;

  if (!debugOutput) {
    return (
      <div className="text-slate-600">
        <div>Debug console ready.</div>
        <div className="mt-1 text-slate-700">
          Open a file and click <strong className="text-slate-500">Debug</strong>{" "}
          in the toolbar.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-violet-400">🐛</span>
        <span className="text-emerald-400 font-mono">
          {debugOutput.command}
        </span>
        <span
          className={`ml-auto ${
            debugOutput.success ? "text-emerald-400" : "text-red-400"
          }`}
        >
          exit {debugOutput.exit_code}
        </span>
      </div>
      {debugOutput.hint && (
        <div className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1.5 text-[11px] text-violet-300">
          💡 {debugOutput.hint}
        </div>
      )}
      {debugOutput.stdout && (
        <pre className="text-emerald-300 whitespace-pre-wrap font-mono text-[11px]">
          {debugOutput.stdout}
        </pre>
      )}
      {debugOutput.stderr && (
        <pre className="text-red-300 whitespace-pre-wrap font-mono text-[11px]">
          {debugOutput.stderr}
        </pre>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BUILD PROBLEMS from git + run output
// ═══════════════════════════════════════════════════════════════
function buildProblems(git: any, runOutput: any): Problem[] {
  const problems: Problem[] = [];

  // Only parse stderr from a regular "run" — not from test/debug
  if (runOutput?.stderr && runOutput?.mode !== "test" && runOutput?.mode !== "debug") {
    const lines = String(runOutput.stderr).split("\n").filter(Boolean);
    for (const l of lines) {
      const match = l.match(/^\s*File "(.+?)", line (\d+)/);
      problems.push({
        file: match?.[1] ?? "run output",
        line: match ? parseInt(match[2]) : undefined,
        message: l.trim(),
        severity: "error",
      });
    }
  }

  return problems.slice(0, 100);
}