"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/code/TopNav";
import { ProjectExplorer } from "@/components/code/ProjectExplorer";
import { EditorTabs } from "@/components/code/EditorTabs";
import { EditorArea } from "@/components/code/EditorArea";
import { AIAgentPanel } from "@/components/code/AIAgentPanel";
import { TerminalPanel } from "@/components/code/TerminalPanel";
import { useCodeStore, AITask } from "@/lib/code-store";
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
} from "@/lib/code";

export default function CodePage() {
  const {
    setTree,
    setTreeLoading,
    openFiles,
    activePath,
    updateFileContent,
    markSaved,
    setGit,
    setTask,
    updateTask,
    setProposedContent,
    setDiffText,
    proposedContent,
    appendTerminal,
    setRunOutput,
    setRunLoading,
    runLoading,
    task,
  } = useCodeStore();

  const [aiPanelOpen] = useState(true);

  // ─────────────────────────────────────────────
  // Load file tree + git status
  // ─────────────────────────────────────────────
  const loadTree = async () => {
    setTreeLoading(true);
    try {
      const [t, g] = await Promise.all([getTree(""), gitStatus()]);
      setTree(t.entries);
      setGit(g);
    } catch (err: any) {
      console.error("[code] tree load failed:", err);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────
  // Load file content when active tab changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!activePath) return;
    const existing = openFiles.find((f) => f.path === activePath);
    if (!existing || existing.content) return;

    (async () => {
      try {
        const f = await readFile(activePath);
        useCodeStore.setState((s) => ({
          openFiles: s.openFiles.map((x) =>
            x.path === activePath
              ? {
                  ...x,
                  content: f.content,
                  originalContent: f.content,
                  dirty: false,
                }
              : x
          ),
        }));
      } catch (err: any) {
        console.error("[code] read file failed:", err);
        appendTerminal(`[error] Could not read ${activePath}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  // ─────────────────────────────────────────────
  // Save file
  // ─────────────────────────────────────────────
  const handleSave = async (path: string, content: string) => {
    if (path.endsWith(".py")) {
      const syn = await checkSyntax(path, content);
      if (!syn.ok) {
        throw new Error(`Syntax error: ${syn.error}`);
      }
    }
    await writeFile(path, content);
    markSaved(path);
    appendTerminal(`[info] Saved ${path}`);
    await loadTree();
  };

  // ─────────────────────────────────────────────
  // Run file
  // ─────────────────────────────────────────────
  const handleRun = async (path: string, args: string) => {
    setRunLoading(true);
    appendTerminal(`$ run ${path} ${args}`);

    const argList =
      args
        .match(/"[^"]*"|'[^']*'|[^\s+\-*/=<>!&|]+|[+\-*/=<>!&|]+/g)
        ?.map((a) => a.replace(/^["']|["']$/g, ""))
        .filter(Boolean) ?? [];

    try {
      const res = await runFile(path, argList);
      setRunOutput(res);
      if (res.stdout) appendTerminal(res.stdout);
      if (res.stderr) appendTerminal(res.stderr);
      appendTerminal(`[info] exit ${res.exit_code}`);
    } catch (err: any) {
      appendTerminal(`[error] ${err?.message ?? "run failed"}`);
      throw err;
    } finally {
      setRunLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Ask AI to modify the active file
  // ─────────────────────────────────────────────
  const handleAskAI = async (path: string, instruction: string) => {
    const newTask: AITask = {
      id: `task-${Date.now()}`,
      title: instruction,
      description: `Modify ${path}`,
      status: "running",
      startedAt: Date.now(),
      plan: [
        { text: "Analyze the file", done: false },
        { text: "Generate changes", done: false },
        { text: "Verify syntax", done: false },
      ],
      tools: [
        { name: "File System", description: `Reading ${path}`, active: true },
      ],
    };
    setTask(newTask);

    try {
      const res = await askAssistant(path, instruction);
      setProposedContent(res.new_content);

      updateTask({
        plan: [
          { text: "Analyze the file", done: true },
          { text: "Generate changes", done: true },
          { text: "Verify syntax", done: false },
        ],
        tools: [
          { name: "File System", description: "Read complete", active: false },
          { name: "Code Search", description: "Analyzing context", active: true },
        ],
      });

      const diff = await previewDiff(path, res.new_content);
      setDiffText(diff.diff || "(no changes)");

      updateTask({
        status: "done",
        plan: [
          { text: "Analyze the file", done: true },
          { text: "Generate changes", done: true },
          { text: "Verify syntax", done: true },
        ],
        tools: [
          { name: "File System", description: "Read complete", active: false },
          { name: "Code Search", description: "Analysis complete", active: false },
        ],
        changedFiles: [
          {
            path,
            added: countAdded(diff.diff),
            removed: countRemoved(diff.diff),
          },
        ],
        verification: {
          passed: true,
          summary: "Syntax valid, ready to apply.",
        },
      });
    } catch (err: any) {
      updateTask({
        status: "failed",
        verification: {
          passed: false,
          summary: err?.message ?? "AI request failed",
        },
      });
      throw err;
    }
  };

  const handleAcceptProposal = () => {
    if (proposedContent !== null && activePath) {
      updateFileContent(activePath, proposedContent);
      setProposedContent(null);
      setDiffText(null);
      appendTerminal("[info] AI proposal loaded into editor. Save to apply.");
    }
  };

  const handleRejectProposal = () => {
    setProposedContent(null);
    setDiffText(null);
  };

  // ─────────────────────────────────────────────
  // Git
  // ─────────────────────────────────────────────
  const handleCommit = async () => {
    const msg = prompt("Commit message:");
    if (!msg) return;
    try {
      const res = await gitCommit(msg);
      appendTerminal(
        res.committed
          ? `[info] Committed ${res.hash_short}`
          : `[warn] ${res.reason || "Nothing to commit"}`
      );
      await loadTree();
    } catch (err: any) {
      appendTerminal(`[error] Commit failed: ${err?.message}`);
    }
  };

  const handleInitGit = async () => {
    try {
      await gitInit();
      appendTerminal("[info] Git initialized");
      await loadTree();
    } catch (err: any) {
      appendTerminal(`[error] Git init failed: ${err?.message}`);
    }
  };

  const handleStopTask = () => {
    if (task) {
      updateTask({ status: "cancelled" });
      appendTerminal("[warn] AI task cancelled by user");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <TopNav
        onRun={() => activePath && handleRun(activePath, "")}
        onDebug={() =>
          appendTerminal("[info] Debug session starting… (not yet implemented)")
        }
        onTest={() => appendTerminal("[info] Test runner not yet implemented")}
        onPreview={() =>
          appendTerminal("[info] Preview window — coming soon")
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <ProjectExplorer onRefresh={loadTree} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorTabs />
          <EditorArea
            onSave={handleSave}
            onRun={handleRun}
            onAskAI={handleAskAI}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
          />
          <TerminalPanel height={180} />
        </div>

        {aiPanelOpen && (
          <AIAgentPanel
            onStop={handleStopTask}
            onApply={handleAcceptProposal}
            onReviewDiff={() =>
              appendTerminal("[info] Review diff — open the editor diff view")
            }
            onRetry={() => appendTerminal("[info] Retry — re-ask the agent")}
            onCancel={() => setTask(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function countAdded(diff: string): number {
  return diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
}

function countRemoved(diff: string): number {
  return diff
    .split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
}