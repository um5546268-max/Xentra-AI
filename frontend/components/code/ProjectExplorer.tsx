"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  GitBranch,
  Check,
  Upload,
  FolderPlus,
  FilePlus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  Scissors,
  ClipboardPaste,
  Download,
  ExternalLink,
  Move,
} from "lucide-react";
import { useCodeStore, FileNode } from "@/lib/code-store";
import { FileIcon, FolderIcon } from "./FileIcon";
import {
  uploadFile,
  createEntry,
  renameEntry,
  deleteEntry,
  readFile,
  moveEntry,
} from "@/lib/code";

type ContextMenu = {
  x: number;
  y: number;
  node: FileNode | null;
  isDir: boolean;
};

export function ProjectExplorer({ onRefresh }: { onRefresh: () => void }) {
  const { tree, treeLoading, activePath, git, closeFile, openFile } =
    useCodeStore();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Close context menu on outside click / Escape / scroll ──
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onScroll = () => close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);

  // ── Listen for tree refresh events from drag-drop ──
  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener("xentra:refresh-tree", handler);
    return () => window.removeEventListener("xentra:refresh-tree", handler);
  }, [onRefresh]);

  const filterTree = (nodes: FileNode[], q: string): FileNode[] => {
    if (!q.trim()) return nodes;
    const lower = q.toLowerCase();
    return nodes
      .map((n) => {
        if (n.type === "directory") {
          const kids = filterTree(n.children ?? [], q);
          if (kids.length > 0 || n.name.toLowerCase().includes(lower)) {
            return { ...n, children: kids };
          }
          return null;
        }
        return n.name.toLowerCase().includes(lower) ? n : null;
      })
      .filter(Boolean) as FileNode[];
  };

  const visible = filterTree(tree, search);

  // ── Upload from input ──
  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
      await onRefresh();
    } catch (e) {
      console.error("[upload] failed:", e);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Drop on explorer background → move to root OR upload ──
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    // 1. Internal file move → move to workspace root
    const src = e.dataTransfer.getData("text/x-xentra-node");
    if (src) {
      try {
        await moveEntry(src, "");
        onRefresh();
      } catch (err: any) {
        alert(err?.response?.data?.detail || "Move failed");
      }
      return;
    }

    // 2. External file drop → upload
    if (e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  // ── Context menu actions ──
  const askNewFile = async (baseDir = "") => {
    const name = prompt("New file name:");
    if (!name) return;
    try {
      const path = baseDir ? `${baseDir}/${name}` : name;
      await createEntry(path, "file");
      await onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Could not create file");
    }
  };

  const askNewFolder = async (baseDir = "") => {
    const name = prompt("New folder name:");
    if (!name) return;
    try {
      const path = baseDir ? `${baseDir}/${name}` : name;
      await createEntry(path, "folder");
      await onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Could not create folder");
    }
  };

  const askRename = async (node: FileNode) => {
    const newName = prompt("Rename to:", node.name);
    if (!newName || newName === node.name) return;
    try {
      const parentDir = node.path.includes("/")
        ? node.path.substring(0, node.path.lastIndexOf("/"))
        : "";
      const newPath = parentDir ? `${parentDir}/${newName}` : newName;
      await renameEntry(node.path, newPath);
      if (activePath === node.path) closeFile(node.path);
      await onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Rename failed");
    }
  };

  const askDelete = async (node: FileNode) => {
    if (!confirm(`Delete ${node.type} "${node.name}"? This cannot be undone.`))
      return;
    try {
      await deleteEntry(node.path);
      if (activePath === node.path) closeFile(node.path);
      await onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Delete failed");
    }
  };

  const askDuplicate = async (node: FileNode) => {
    if (node.type !== "file") return;
    try {
      const src = await readFile(node.path);
      const parentDir = node.path.includes("/")
        ? node.path.substring(0, node.path.lastIndexOf("/"))
        : "";
      const dot = node.name.lastIndexOf(".");
      const base = dot > 0 ? node.name.slice(0, dot) : node.name;
      const ext = dot > 0 ? node.name.slice(dot) : "";
      const newPath = parentDir
        ? `${parentDir}/${base}_copy${ext}`
        : `${base}_copy${ext}`;
      await createEntry(newPath, "file", src.content);
      await onRefresh();
    } catch {
      alert("Duplicate failed");
    }
  };

  const askDownload = async (node: FileNode) => {
    if (node.type !== "file") return;
    try {
      const src = await readFile(node.path);
      const blob = new Blob([src.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = node.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  const askCopyPath = async (node: FileNode) => {
    await navigator.clipboard.writeText(node.path);
  };

  const openContextMenu = (
    e: React.MouseEvent,
    node: FileNode | null,
    isDir: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, node, isDir });
  };

  return (
    <div
      className={`w-full h-full border-r border-slate-800 bg-slate-950 flex flex-col relative ${
        dragOver ? "ring-2 ring-violet-500 ring-inset" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        // Only turn off if leaving the whole panel, not a child
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={handleDrop}
      onContextMenu={(e) => openContextMenu(e, null, true)}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {dragOver && (
        <div className="absolute inset-0 bg-violet-500/10 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-950 border border-violet-500 rounded-lg px-4 py-3 text-xs text-violet-300 font-medium">
            Drop files to upload or move here
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Explorer
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition disabled:opacity-40"
              title="Upload file"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => askNewFile()}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
              title="New file"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => askNewFolder()}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
              title="New folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRefresh}
              disabled={treeLoading}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${treeLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Git info */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <GitBranch className="w-3 h-3" />
            <span className="font-mono">{git?.branch ?? "main"}</span>
            {git?.clean && <Check className="w-3 h-3 text-emerald-400" />}
          </div>
          {git && !git.clean && git.files?.length > 0 && (
            <span className="text-[10px] text-yellow-400">
              ● {git.files.length}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-md border border-slate-800 bg-slate-900 pl-8 pr-2 py-1.5 text-xs placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Tree ── */}
      <div className="flex-1 overflow-y-auto py-1">
        {treeLoading && visible.length === 0 ? (
          <div className="text-xs text-slate-600 p-4 text-center">
            Loading files…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-xs text-slate-600 p-4 text-center space-y-2">
            <div>{search ? "No matches" : "No files in workspace"}</div>
            {!search && (
              <div className="flex gap-2 justify-center text-[11px]">
                <button
                  onClick={() => askNewFile()}
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  New file
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  Upload
                </button>
              </div>
            )}
          </div>
        ) : (
          visible.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              onContextMenu={openContextMenu}
              onOpen={(n) => {
                if (n.type === "file")
                  openFile({
                    path: n.path,
                    name: n.name,
                    content: "",
                    originalContent: "",
                  });
              }}
              onMove={async (src, destDir) => {
                try {
                  await moveEntry(src, destDir);
                  onRefresh();
                } catch (err: any) {
                  alert(err?.response?.data?.detail || "Move failed");
                }
              }}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-800 p-2 text-[10px] text-slate-600 text-center shrink-0">
        Right-click for options · Drag files to move
      </div>

      {/* ── Context Menu ── */}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[220px] rounded-md border border-slate-700 bg-[#1e1e2e] shadow-2xl py-1 text-[12px]"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {menu.node ? (
            menu.isDir ? (
              /* ── FOLDER MENU ── */
              <>
                <MenuItem
                  icon={<FilePlus className="w-3.5 h-3.5" />}
                  label="New File..."
                  onClick={() => {
                    setMenu(null);
                    askNewFile(menu.node!.path);
                  }}
                />
                <MenuItem
                  icon={<FolderPlus className="w-3.5 h-3.5" />}
                  label="New Folder..."
                  onClick={() => {
                    setMenu(null);
                    askNewFolder(menu.node!.path);
                  }}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  label="Rename..."
                  shortcut="F2"
                  onClick={() => {
                    setMenu(null);
                    askRename(menu.node!);
                  }}
                />
                <MenuItem
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Delete"
                  shortcut="Del"
                  danger
                  onClick={() => {
                    setMenu(null);
                    askDelete(menu.node!);
                  }}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Copy Path"
                  onClick={() => {
                    setMenu(null);
                    askCopyPath(menu.node!);
                  }}
                />
              </>
            ) : (
              /* ── FILE MENU ── */
              <>
                <MenuItem
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  label="Open to the Side"
                  onClick={() => {
                    setMenu(null);
                    openFile({
                      path: menu.node!.path,
                      name: menu.node!.name,
                      content: "",
                      originalContent: "",
                    });
                  }}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Copy"
                  shortcut="⌘C"
                  onClick={() => setMenu(null)}
                />
                <MenuItem
                  icon={<Scissors className="w-3.5 h-3.5" />}
                  label="Cut"
                  shortcut="⌘X"
                  onClick={() => setMenu(null)}
                />
                <MenuItem
                  icon={<ClipboardPaste className="w-3.5 h-3.5" />}
                  label="Paste"
                  shortcut="⌘V"
                  onClick={() => setMenu(null)}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Duplicate"
                  onClick={() => {
                    setMenu(null);
                    askDuplicate(menu.node!);
                  }}
                />
                <MenuItem
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Download"
                  onClick={() => {
                    setMenu(null);
                    askDownload(menu.node!);
                  }}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Copy className="w-3.5 h-3.5" />}
                  label="Copy Path"
                  onClick={() => {
                    setMenu(null);
                    askCopyPath(menu.node!);
                  }}
                />
                <MenuSeparator />
                <MenuItem
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  label="Rename..."
                  shortcut="F2"
                  onClick={() => {
                    setMenu(null);
                    askRename(menu.node!);
                  }}
                />
                <MenuItem
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Delete"
                  shortcut="Del"
                  danger
                  onClick={() => {
                    setMenu(null);
                    askDelete(menu.node!);
                  }}
                />
              </>
            )
          ) : (
            /* ── EMPTY SPACE MENU ── */
            <>
              <MenuItem
                icon={<FilePlus className="w-3.5 h-3.5" />}
                label="New File..."
                onClick={() => {
                  setMenu(null);
                  askNewFile();
                }}
              />
              <MenuItem
                icon={<FolderPlus className="w-3.5 h-3.5" />}
                label="New Folder..."
                onClick={() => {
                  setMenu(null);
                  askNewFolder();
                }}
              />
              <MenuSeparator />
              <MenuItem
                icon={<Upload className="w-3.5 h-3.5" />}
                label="Upload Files..."
                onClick={() => {
                  setMenu(null);
                  fileInputRef.current?.click();
                }}
              />
              <MenuSeparator />
              <MenuItem
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label="Refresh"
                onClick={() => {
                  setMenu(null);
                  onRefresh();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Context menu items ───
function MenuItem({
  icon,
  label,
  onClick,
  shortcut,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
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
      <span className="w-4 flex justify-center shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-slate-500 font-mono">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function MenuSeparator() {
  return <div className="my-1 border-t border-slate-700/60" />;
}

// ═══════════════════════════════════════════════════════════════
// TREE NODE
// ═══════════════════════════════════════════════════════════════
function TreeNode({
  node,
  depth,
  activePath,
  onContextMenu,
  onOpen,
  onMove,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onContextMenu: (e: React.MouseEvent, node: FileNode, isDir: boolean) => void;
  onOpen: (node: FileNode) => void;
  onMove: (src: string, destDir: string) => Promise<void>;
}) {
  const { git } = useCodeStore();
  const [open, setOpen] = useState(depth < 2);
  const [dragOver, setDragOver] = useState(false);
  const isDir = node.type === "directory";
  const isActive = activePath === node.path;

  const changedFile = git?.files?.find(
    (f: any) =>
      f.path === node.path || f.path === node.path.replace(/\\/g, "/")
  );

  const handleClick = () => {
    if (isDir) setOpen(!open);
    else onOpen(node);
  };

  // ─── Drag handlers ───
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/x-xentra-node", node.path);
    e.dataTransfer.setData("text/x-xentra-type", node.type);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isDir) return;
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const src = e.dataTransfer.getData("text/x-xentra-node");
    const srcType = e.dataTransfer.getData("text/x-xentra-type");
    if (!src || src === node.path) return;

    // Don't move a folder into itself or its own descendants
    if (srcType === "directory" && (node.path === src || node.path.startsWith(src + "/"))) return;

    // Don't move into the same parent it's already in
    const parentOfSrc = src.includes("/")
      ? src.substring(0, src.lastIndexOf("/"))
      : "";
    if (parentOfSrc === node.path) return;

    await onMove(src, node.path);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 px-2 py-[5px] text-xs transition cursor-pointer ${
          isActive
            ? "bg-violet-500/15 text-violet-200"
            : "text-slate-300 hover:bg-slate-900"
        } ${dragOver ? "bg-violet-500/30 ring-1 ring-violet-500/50" : ""}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node, isDir)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDir ? (
          <>
            {open ? (
              <ChevronDown className="w-3 h-3 shrink-0 text-slate-500" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0 text-slate-500" />
            )}
            <FolderIcon open={open} size={14} />
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileIcon name={node.name} size={14} />
          </>
        )}
        <span className="truncate flex-1 font-mono text-[11px]">
          {node.name}
        </span>
        {!isDir && changedFile && (
          <span
            className={`text-[10px] font-mono shrink-0 ${
              changedFile.status === "M"
                ? "text-yellow-400"
                : changedFile.status === "A"
                ? "text-emerald-400"
                : changedFile.status === "D"
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            {changedFile.status}
          </span>
        )}
      </div>

      {isDir && open && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onContextMenu={onContextMenu}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}