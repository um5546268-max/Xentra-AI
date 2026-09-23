"use client";

export default function SubjectsPage() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-white">All Subjects</h1>
        <p className="text-slate-500 text-sm">
          Browse all subjects to start learning.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
          Coming soon — subjects will appear here.
        </div>
      </div>
    </div>
  );
}