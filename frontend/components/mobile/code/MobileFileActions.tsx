"use client";

import {
  FilePlus2, FolderPlus, Pencil, Trash2, Copy, Download, X,
} from "lucide-react";

export type FileAction =
  | "new_file_here"
  | "new_folder_here"
  | "rename"
  | "delete"
  | "duplicate"
  | "download";

export default function MobileFileActions({
  entryName,
  isDirectory,
  onAction,
  onClose,
}: {
  entryName: string;
  isDirectory: boolean;
  onAction: (action: FileAction) => void;
  onClose: () => void;
}) {
  const items: {
    id: FileAction;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    onlyDir?: boolean;
  }[] = [
    { id: "new_file_here",   label: "New file here",    icon: FilePlus2,   color: "text-violet-300", onlyDir: true },
    { id: "new_folder_here", label: "New folder here",  icon: FolderPlus,  color: "text-cyan-300",   onlyDir: true },
    { id: "rename",          label: "Rename",           icon: Pencil,      color: "text-slate-300" },
    { id: "duplicate",       label: "Duplicate",        icon: Copy,        color: "text-slate-300" },
    { id: "download",        label: "Download",         icon: Download,    color: "text-slate-300" },
    { id: "delete",          label: "Delete",           icon: Trash2,      color: "text-red-300" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-end"
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-100 truncate">
              {entryName}
            </div>
            <div className="text-[10px] text-slate-500">
              {isDirectory ? "Folder" : "File"} actions
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu items */}
        <div className="px-3 pb-4 space-y-1">
          {items
            .filter((i) => !i.onlyDir || isDirectory)
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onAction(item.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-900 transition text-left"
                >
                  <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <span className="text-sm text-slate-200 flex-1">
                    {item.label}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}