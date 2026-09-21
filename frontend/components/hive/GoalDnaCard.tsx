"use client";

export function GoalDnaCard({
  goalDna,
}: {
  goalDna?: Record<string, any> | null;
}) {
  if (!goalDna || Object.keys(goalDna).length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🧠</span>
        <span className="text-sm font-semibold text-slate-200">Goal DNA</span>
      </div>
      <ul className="space-y-1.5 text-xs">
        {Object.entries(goalDna).map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="text-slate-500 capitalize min-w-[90px]">
              {k.replace(/_/g, " ")}
            </span>
            <span className="text-slate-200">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}