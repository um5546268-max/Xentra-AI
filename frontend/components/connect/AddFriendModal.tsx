"use client";

import { useState } from "react";
import { X, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { sendFriendRequest } from "@/lib/friends-api";

export default function AddFriendModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendFriendRequest({ email: trimmed });
      setSuccess(`Friend request sent to ${result.other_user_email || trimmed}`);
      setEmail("");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to send friend request";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Add a friend</h2>
            <p className="text-xs text-slate-500">
              Enter their email to send a request
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSend();
            }}
            placeholder="friend@example.com"
            autoFocus
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading || !email.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Send request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}