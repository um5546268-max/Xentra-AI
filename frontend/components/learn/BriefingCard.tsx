"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getBriefing, Briefing } from "@/lib/gamification";

export function BriefingCard() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBriefing()
      .then(setBriefing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        <span className="text-sm text-slate-400">
          Xentra is writing your briefing…
        </span>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300">
        <Sparkles className="w-3.5 h-3.5" />
        Today's briefing
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">
        {briefing.message}
      </p>
      {(briefing.due_flashcards > 0 || briefing.recent_session) && (
        <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
          {briefing.due_flashcards > 0 && (
            <span>
              📚 {briefing.due_flashcards} card
              {briefing.due_flashcards > 1 ? "s" : ""} due
            </span>
          )}
          {briefing.recent_session && (
            <span className="truncate">
              ▶ {briefing.recent_session.title}
            </span>
          )}
        </div>
      )}
      return (
  <div
    data-tour="daily-briefing"
    className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-5 space-y-3"
  ></div>
    </div>
  );
}