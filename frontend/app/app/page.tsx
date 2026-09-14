"use client";

import { useAuth } from "@/lib/auth";
import { MessageSquare, Zap } from "lucide-react";

export default function AppHome() {
  const { user } = useAuth();

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30">
          <Zap className="w-8 h-8 text-violet-400" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
            Welcome, {user?.full_name || user?.email?.split("@")[0] || "friend"}
          </h1>
          <p className="text-slate-400">
            Start a new conversation with Xentra, or pick one from the sidebar.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur p-6 text-left space-y-3">
          <h2 className="text-sm text-slate-500 uppercase tracking-wider">
            Phase 1 — Foundation
          </h2>
          <ul className="space-y-1.5 text-sm">
            <li className="text-emerald-400">✅ Backend auth + database</li>
            <li className="text-emerald-400">✅ Login + signup pages</li>
            <li className="text-emerald-400">✅ Conversation CRUD (sidebar)</li>
            <li className="text-emerald-400">✅ Search + delete</li>
            <li className="text-slate-500">⏳ Phase 2: real AI chat (tomorrow)</li>
          </ul>
        </div>

        <div className="text-xs text-slate-600 flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Click <span className="text-violet-400 font-mono">New conversation</span> to begin
        </div>
      </div>
    </div>
  );
}