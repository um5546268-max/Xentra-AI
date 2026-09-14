"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<string>("checking...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/health")
      .then((res) => {
        setHealth(`${res.data.service} v${res.data.version} — ${res.data.status}`);
      })
      .catch(() => {
        setError(
          "Could not reach Xentra backend. Is uvicorn running on port 8000?"
        );
        setHealth("offline");
      });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-sm">
            Phase 1 · Foundation
          </div>

          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
            Xentra AI
          </h1>

          <p className="text-xl text-slate-400">
            Your AI Operating Assistant
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur p-6 text-left space-y-3">
          <div className="text-sm text-slate-500 uppercase tracking-wider">
            Backend status
          </div>
          <div className="font-mono text-sm">
            {error ? (
              <span className="text-red-400">❌ {error}</span>
            ) : (
              <span className="text-emerald-400">✓ {health}</span>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          Days 1–4 done: backend auth + conversations ✅
          <br />
          Day 5: frontend scaffold ✅
        </div>
      </div>
    </main>
  );
}