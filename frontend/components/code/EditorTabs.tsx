"use client";

import { X, Circle, FileCode, FileJson, FileText } from "lucide-react";
import { useCodeStore } from "@/lib/code-store";

export function EditorTabs() {
  const { openFiles, activePath, setActivePath, closeFile } = useCodeStore();

  if (openFiles.length === 0) {
    return (
      <div className="h-10 border-b border-slate-800 bg-slate-950 flex items-center px-4 text-xs text-slate-600">
        No files open
      </div>
    );
  }

  return (
    <div className="h-10 border-b border-slate-800 bg-slate-950 flex items-center overflow-x-auto shrink-0">
      {openFiles.map((f) => {
        const active = f.path === activePath;
        return (
          <div
            key={f.path}
            onClick={() => setActivePath(f.path)}
            className={`group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-r border-slate-800 transition min-w-0 shrink-0 ${
              active
                ? "bg-slate-900 text-slate-100 border-b-2 border-b-violet-500"
                : "text-slate-500 hover:bg-slate-900/60 hover:text-slate-300 border-b-2 border-b-transparent"
            }`}
          >
            <TabIcon name={f.name} />
            <span className="truncate max-w-[140px]">{f.name}</span>
            {f.dirty && (
              <Circle className="w-2 h-2 fill-yellow-400 text-yellow-400 shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(f.path);
              }}
              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TabIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  if (["js", "jsx", "ts", "tsx", "py"].includes(ext ?? ""))
    return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  return <FileText className="w-3.5 h-3.5 text-slate-500" />;
}