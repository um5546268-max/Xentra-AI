"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

const CLASSES = [
  { id: "class_6", label: "Class 6", grade: "Grade 6" },
  { id: "class_7", label: "Class 7", grade: "Grade 7" },
  { id: "class_8", label: "Class 8", grade: "Grade 8" },
  { id: "class_9", label: "Class 9 (Matric)", grade: "Grade 9" },
  { id: "class_10", label: "Class 10 (Matric)", grade: "Grade 10" },
  { id: "class_11", label: "Class 11 (FSc/1st Year)", grade: "Grade 11" },
  { id: "class_12", label: "Class 12 (FSc/2nd Year)", grade: "Grade 12" },
  { id: "university", label: "University / College", grade: "Undergraduate" },
];

export function ClassPicker({
  subject,
  onClose,
  onPick,
  loading,
}: {
  subject: string;
  onClose: () => void;
  onPick: (className: string) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Which class are you in?</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              We'll tailor {subject} content to your level
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                selected === c.id
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-slate-800 text-slate-400 hover:bg-slate-900"
              }`}
            >
              <div className="font-medium">{c.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{c.grade}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onPick(selected)}
            disabled={!selected || loading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Generating…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}