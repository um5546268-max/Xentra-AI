"use client";

import { useEffect, useRef, useState, memo, useCallback } from "react";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen,
  Plus, FolderPlus, Upload, ArrowLeft, RefreshCw, MoreVertical,
} from "lucide-react";
import {
  getTree, createEntry, uploadFile, renameEntry, deleteEntry,
} from "@/lib/code";
import MobileFileActions, { FileAction } from "./MobileFileActions";

type TreeEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeEntry[];
};

const EXT_ICON: Record<string, string> = {
  py: "🐍", js: "🟨", ts: "🔵", jsx: "⚛️", tsx: "⚛️",
  html: "🌐", css: "🎨", json: "📋", md: "📝", txt: "📄",
  sh: "🐚", c: "📘", cpp: "📘", rs: "🦀", go: "🐹", java: "☕",
};

function iconForFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_ICON[ext] || "📄";
}

export default function MobileFileExplorer({
  onOpenFile,
  onBack,
  onNewFile,
  refreshKey = 0,
}: {
  onOpenFile: (path: string) => void;
  onBack: () => void;
  onNewFile: (parentPath?: string) => void;
  refreshKey?: number;
}) {
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [menuEntry, setMenuEntry] = useState<TreeEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTree("");
      setTree(res.entries || []);
      const topFolders = (res.entries || [])
        .filter((e: TreeEntry) => e.type === "directory")
        .map((e: TreeEntry) => e.path);
      setExpanded(new Set(topFolders));
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleMenuAction = useCallback(
    async (action: FileAction) => {
      if (!menuEntry) return;
      const entry = menuEntry;
      setMenuEntry(null);

      if (action === "new_file_here") {
        onNewFile(entry.path);
        return;
      }

      if (action === "new_folder_here") {
        const name = prompt("Folder name:");
        if (!name) return;
        try {
          await createEntry(`${entry.path}/${name}`, "folder", "");
          await load();
        } catch {
          alert("Failed to create folder");
        }
        return;
      }

      if (action === "rename") {
        const newName = prompt("New name:", entry.name);
        if (!newName || newName === entry.name) return;
        const parent = entry.path.includes("/")
          ? entry.path.slice(0, entry.path.lastIndexOf("/"))
          : "";
        const newPath = parent ? `${parent}/${newName}` : newName;
        try {
          await renameEntry(entry.path, newPath);
          await load();
        } catch (e: any) {
          alert(e?.response?.data?.detail || "Rename failed");
        }
        return;
      }

      if (action === "delete") {
        if (!confirm(`Delete "${entry.name}"?`)) return;
        try {
          await deleteEntry(entry.path);
          await load();
        } catch {
          alert("Delete failed");
        }
        return;
      }

      if (action === "duplicate") {
        const ext = entry.name.includes(".")
          ? entry.name.slice(entry.name.lastIndexOf("."))
          : "";
        const base = entry.name.replace(ext, "");
        const parent = entry.path.includes("/")
          ? entry.path.slice(0, entry.path.lastIndexOf("/"))
          : "";
        const newPath = parent
          ? `${parent}/${base}_copy${ext}`
          : `${base}_copy${ext}`;
        try {
          const { readFile, writeFile } = await import("@/lib/code");
          if (entry.type === "file") {
            const f = await readFile(entry.path);
            await writeFile(newPath, f.content);
          } else {
            await createEntry(newPath, "folder", "");
          }
          await load();
        } catch {
          alert("Duplicate failed");
        }
        return;
      }

      if (action === "download") {
        if (entry.type === "directory") {
          alert("Folder download not supported yet");
          return;
        }
        try {
          const { readFile } = await import("@/lib/code");
          const f = await readFile(entry.path);
          const blob = new Blob([f.content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = entry.name;
          a.click();
          URL.revokeObjectURL(url);
        } catch {
          alert("Download failed");
        }
        return;
      }
    },
    [menuEntry, load, onNewFile]
  );

  const handleUpload = useCallback(() => fileInputRef.current?.click(), []);

  const handleFilePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await uploadFile(file, "");
        await load();
      } catch {
        alert("Upload failed");
      }
      e.target.value = "";
    },
    [load]
  );

  const handleNewFolderTopLevel = useCallback(async () => {
    const name = prompt("Folder name:");
    if (!name) return;
    try {
      await createEntry(name, "folder", "");
      await load();
    } catch {
      alert("Failed to create folder");
    }
  }, [load]);

  // Filter
  const matchesSearch = useCallback(
    (entry: TreeEntry): boolean => {
      if (!debouncedSearch.trim()) return true;
      const needle = debouncedSearch.toLowerCase();
      if (entry.name.toLowerCase().includes(needle)) return true;
      if (entry.children) return entry.children.some(matchesSearch);
      return false;
    },
    [debouncedSearch]
  );

  const filteredTree = tree.filter(matchesSearch);

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100">MyProject</div>
          <div className="text-[10px] text-slate-500">Code Workspace</div>
        </div>
        <button
          onClick={load}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-800">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm placeholder-slate-500 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Loading files…
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {debouncedSearch.trim()
              ? "No files match your search."
              : "No files yet. Tap + New File to add one."}
          </div>
        ) : (
          filteredTree.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onOpenFile={onOpenFile}
              onMenu={setMenuEntry}
              search={debouncedSearch}
            />
          ))
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="shrink-0 border-t border-slate-800 bg-slate-950 px-3 py-3 grid grid-cols-3 gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <button
          onClick={() => onNewFile()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 py-2.5 text-xs font-medium text-violet-300 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> New File
        </button>
        <button
          onClick={handleNewFolderTopLevel}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-xs font-medium text-cyan-300 transition active:scale-95"
        >
          <FolderPlus className="w-3.5 h-3.5" /> Folder
        </button>
        <button
          onClick={handleUpload}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-300 transition active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFilePicked}
        />
      </div>

      {menuEntry && (
        <MobileFileActions
          entryName={menuEntry.name}
          isDirectory={menuEntry.type === "directory"}
          onAction={handleMenuAction}
          onClose={() => setMenuEntry(null)}
        />
      )}
    </div>
  );
}

// ─── MEMOIZED Tree Node ───
const TreeNode = memo(function TreeNode({
  entry,
  depth,
  expanded,
  onToggle,
  onOpenFile,
  onMenu,
  search,
}: {
  entry: TreeEntry;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  onMenu: (entry: TreeEntry) => void;
  search?: string;
}) {
  const isDir = entry.type === "directory";
  const isSearching = !!search?.trim();
  const isOpen = isSearching || expanded.has(entry.path);
  const indent = 8 + depth * 16;

  const visibleChildren =
    entry.children?.filter((c) => {
      if (!isSearching) return true;
      const needle = search!.toLowerCase();
      if (c.name.toLowerCase().includes(needle)) return true;
      if (c.children)
        return c.children.some((gc) =>
          gc.name.toLowerCase().includes(needle)
        );
      return false;
    }) || [];

  return (
    <>
      <div
        className="w-full flex items-center gap-2 rounded-lg py-1 pr-1 hover:bg-slate-900 transition"
        style={{ paddingLeft: `${indent}px` }}
      >
        <button
          onClick={() => (isDir ? onToggle(entry.path) : onOpenFile(entry.path))}
          className="flex-1 flex items-center gap-2 py-1 text-left min-w-0"
        >
          {isDir ? (
            isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {isDir ? (
            isOpen ? (
              <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
            )
          ) : (
            <span className="text-sm shrink-0">{iconForFile(entry.name)}</span>
          )}
          <span className="text-xs text-slate-200 truncate flex-1">
            {entry.name}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenu(entry);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-200 shrink-0"
          title="Actions"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {isDir && isOpen && visibleChildren.length > 0 && (
        <>
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              onMenu={onMenu}
              search={search}
            />
          ))}
        </>
      )}
    </>
  );
});