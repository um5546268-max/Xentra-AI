"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CodeFile = {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  dirty?: boolean;
  language?: string;
};

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export type AITask = {
  id: string;
  title: string;
  description?: string;
  status: "idle" | "running" | "done" | "failed" | "cancelled";
  plan?: { text: string; done: boolean }[];
  tools?: { name: string; description: string; active: boolean }[];
  changedFiles?: { path: string; added: number; removed: number }[];
  verification?: { passed: boolean; summary: string } | null;
  startedAt?: number;
};

type Tab = "terminal" | "problems" | "output" | "debug";

type Store = {
  // File explorer
  tree: FileNode[];
  treeLoading: boolean;

  // Open tabs
  openFiles: CodeFile[];
  activePath: string | null;

  // Terminal
  terminalTab: Tab;
  terminalOutput: string[];

  // Run
  runArgs: string;
  runOutput: any | null;
  runLoading: boolean;

  // AI panel
  task: AITask | null;
  aiInstruction: string;
  aiLoading: boolean;
  proposedContent: string | null;
  diffText: string | null;

  // Git
  git: any | null;

  // Live preview trigger — bumps every time a file is saved
  saveVersion: number;
  bumpSaveVersion: () => void;

  // Auto-save
  autoSaveEnabled: boolean;
  lastAutoSave: number | null;
  setAutoSaveEnabled: (v: boolean) => void;
  markAutoSaved: () => void;

  // Actions
  setTree: (t: FileNode[]) => void;
  setTreeLoading: (v: boolean) => void;

  openFile: (f: CodeFile) => void;
  closeFile: (path: string) => void;
  setActivePath: (p: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;

  setTerminalTab: (t: Tab) => void;
  appendTerminal: (line: string) => void;
  clearTerminal: () => void;

  setRunArgs: (a: string) => void;
  setRunOutput: (o: any | null) => void;
  setRunLoading: (v: boolean) => void;

  setTask: (t: AITask | null) => void;
  updateTask: (patch: Partial<AITask>) => void;
  setAiInstruction: (i: string) => void;
  setAiLoading: (v: boolean) => void;
  setProposedContent: (c: string | null) => void;
  setDiffText: (d: string | null) => void;

  setGit: (g: any) => void;

  clear: () => void;
};

export const useCodeStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      tree: [],
      treeLoading: false,

      openFiles: [],
      activePath: null,

      terminalTab: "terminal",
      terminalOutput: [],

      runArgs: "",
      runOutput: null,
      runLoading: false,

      task: null,
      aiInstruction: "",
      aiLoading: false,
      proposedContent: null,
      diffText: null,

      git: null,

      saveVersion: 0,
      bumpSaveVersion: () =>
        set((s) => ({ saveVersion: s.saveVersion + 1 })),

      autoSaveEnabled: true,
      lastAutoSave: null,
      setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),
      markAutoSaved: () => set({ lastAutoSave: Date.now() }),

      // ── Tree ──
      setTree: (tree) => set({ tree }),
      setTreeLoading: (treeLoading) => set({ treeLoading }),

      // ── Open files ──
      openFile: (f) => {
        const { openFiles } = get();
        const exists = openFiles.find((x) => x.path === f.path);
        if (exists) {
          set({ activePath: f.path });
          return;
        }
        set({ openFiles: [...openFiles, f], activePath: f.path });
      },

      closeFile: (path) => {
        const { openFiles, activePath } = get();
        const next = openFiles.filter((x) => x.path !== path);
        const nextActive =
          activePath === path
            ? next[next.length - 1]?.path ?? null
            : activePath;
        set({ openFiles: next, activePath: nextActive });
      },

      setActivePath: (activePath) => set({ activePath }),

      updateFileContent: (path, content) => {
        set((s) => ({
          openFiles: s.openFiles.map((f) =>
            f.path === path
              ? { ...f, content, dirty: content !== f.originalContent }
              : f
          ),
        }));
      },

      markSaved: (path) => {
        // Mark the file as clean (matches saved content)
        set((s) => ({
          openFiles: s.openFiles.map((f) =>
            f.path === path
              ? { ...f, originalContent: f.content, dirty: false }
              : f
          ),
        }));
        // 👇 Bump saveVersion — this is the signal LivePreview listens for
        set((s) => ({ saveVersion: s.saveVersion + 1 }));
      },

      // ── Terminal ──
      setTerminalTab: (terminalTab) => set({ terminalTab }),

      appendTerminal: (line) =>
        set((s) => ({
          terminalOutput: [...s.terminalOutput, line].slice(-500),
        })),

      clearTerminal: () => set({ terminalOutput: [] }),

      // ── Run ──
      setRunArgs: (runArgs) => set({ runArgs }),
      setRunOutput: (runOutput) => set({ runOutput }),
      setRunLoading: (runLoading) => set({ runLoading }),

      // ── AI panel ──
      setTask: (task) => set({ task }),

      updateTask: (patch) => {
        const { task } = get();
        if (!task) return;
        set({ task: { ...task, ...patch } });
      },

      setAiInstruction: (aiInstruction) => set({ aiInstruction }),
      setAiLoading: (aiLoading) => set({ aiLoading }),
      setProposedContent: (proposedContent) => set({ proposedContent }),
      setDiffText: (diffText) => set({ diffText }),

      // ── Git ──
      setGit: (git) => set({ git }),

      // ── Reset ──
      clear: () =>
        set({
          openFiles: [],
          activePath: null,
          terminalOutput: [],
          runArgs: "",
          runOutput: null,
          task: null,
          aiInstruction: "",
          proposedContent: null,
          diffText: null,
        }),
    }),
    {
      name: "xentra-code-store",
      // Only persist user-relevant state; skip timers + transient state
      partialize: (state) => ({
        tree: state.tree,
        openFiles: state.openFiles,
        activePath: state.activePath,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
);