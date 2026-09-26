"use client";

import { useState } from "react";
import { X, FileCode, Loader2 } from "lucide-react";
import { createEntry } from "@/lib/code";

type FileType = {
  id: string;
  label: string;
  ext: string;
  emoji: string;
  starter: string;
};

const FILE_TYPES: FileType[] = [
  { id: "py",   label: "Python (.py)",       ext: ".py",   emoji: "🐍", starter: `# Xentra Python script\n\nprint("Hello, Xentra!")\n` },
  { id: "html", label: "HTML (.html)",       ext: ".html", emoji: "🌐", starter: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Xentra</title>\n</head>\n<body>\n  <h1>Hello, Xentra!</h1>\n</body>\n</html>\n` },
  { id: "css",  label: "CSS (.css)",         ext: ".css",  emoji: "🎨", starter: `body {\n  background: #0f172a;\n  color: #e2e8f0;\n  font-family: system-ui, sans-serif;\n}\n` },
  { id: "js",   label: "JavaScript (.js)",   ext: ".js",   emoji: "🟨", starter: `// Xentra JavaScript\nconsole.log("Hello, Xentra!");\n` },
  { id: "txt",  label: "Text (.txt)",        ext: ".txt",  emoji: "📄", starter: "" },
  { id: "md",   label: "Markdown (.md)",     ext: ".md",   emoji: "📝", starter: `# Title\n\nWrite your notes here.\n` },
];

export default function MobileNewFile({
  parentPath = "",
  onClose,
  onCreated,
}: {
  parentPath?: string;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const [name, setName] = useState("example");
  const [selectedType, setSelectedType] = useState<FileType>(FILE_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a file name");
      return;
    }

    const filename = trimmed.endsWith(selectedType.ext)
      ? trimmed
      : `${trimmed}${selectedType.ext}`;

    const fullPath = parentPath ? `${parentPath}/${filename}` : filename;

    setLoading(true);
    setError(null);
    try {
      const res = await createEntry(fullPath, "file", selectedType.starter);
      onCreated(res.path);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to create file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <FileCode className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">
                New File
              </div>
              {parentPath && (
                <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                  in {parentPath}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              File name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="example"
              autoFocus
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              File type
            </label>
            <div className="space-y-2">
              {FILE_TYPES.map((t) => {
                const active = selectedType.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 transition text-left ${
                      active
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-slate-800 bg-slate-900/40 hover:bg-slate-900"
                    }`}
                  >
                    <span className="text-lg shrink-0">{t.emoji}</span>
                    <span
                      className={`text-sm flex-1 ${
                        active
                          ? "text-violet-200 font-medium"
                          : "text-slate-300"
                      }`}
                    >
                      {t.label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? "border-violet-500" : "border-slate-700"
                      }`}
                    >
                      {active && (
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-4 py-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create File"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}