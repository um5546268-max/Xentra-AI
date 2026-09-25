"use client";

import { ListTodo } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Tasks</h1>
            <p className="text-sm text-slate-500">
              Manage your active tasks and their progress.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-500 text-sm">
            Your active tasks appear in the sidebar.
            <br />
            Click <span className="text-violet-400">New task</span> to create one.
          </p>
        </div>
      </div>
    </div>
  );
}