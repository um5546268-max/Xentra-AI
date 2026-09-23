"use client";

import { useRouter } from "next/navigation";
import { X, Lock } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  message?: string;
};

export default function SignInRequiredModal({ open, onClose, message }: Props) {
  const router = useRouter();

  if (!open) return null;

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

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-bold text-white">Sign in to continue</h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            {message ||
              "You're in guest mode. Please sign in or create a free account to use this feature."}
          </p>

          <div className="flex flex-col w-full gap-2 pt-2">
            <button
              onClick={() => router.push("/welcome")}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Sign In / Sign Up
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Keep Browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}