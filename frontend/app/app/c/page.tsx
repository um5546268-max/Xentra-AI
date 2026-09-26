"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function ChatIndexPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Load existing conversations
        const res = await api.get("/api/conversations");
        const conversations: { id: string }[] = res.data || [];

        if (conversations.length > 0) {
          // Go to the most recent one
          router.replace(`/app/c/${conversations[0].id}`);
          return;
        }

        // 2. None exist — create a fresh conversation
        const createRes = await api.post("/api/conversations", {
          title: null,
        });
        const newId = createRes.data?.id;

        if (!newId) {
          throw new Error("Failed to create conversation");
        }
        router.replace(`/app/c/${newId}`);
      } catch (e: any) {
        console.error("[chat-index] failed:", e);
        setError(e?.response?.data?.detail || e?.message || "Failed to load chat");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <div className="space-y-1">
          <div className="text-slate-200 font-semibold">Couldn't open chat</div>
          <div className="text-sm text-slate-500">{error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <div className="text-sm text-slate-500">Opening chat…</div>
    </div>
  );
}