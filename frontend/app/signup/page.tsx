"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuth((s) => s.signup);
  const loading = useAuth((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const ok = await signup(email.trim(), password, fullName.trim(), stayLoggedIn);
    if (ok) {
      router.push("/app");
    } else {
      setError("Signup failed — this email may already be in use");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col px-6 py-8">
      {/* Top logo */}
      <div className="flex flex-col items-center pt-4 pb-6">
        <img
          src="/x-logo.png"
          alt="Xentra"
          className="w-14 h-14 object-contain mb-3"
          style={{ filter: "drop-shadow(0 0 20px rgba(139,92,246,0.7))" }}
        />
        <h1 className="text-xl font-bold text-slate-100">Xentra AI</h1>
        <p className="text-[11px] text-slate-500">Your AI Agent</p>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Create your account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Start your journey with Xentra AI.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Full name */}
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Stay logged in */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setStayLoggedIn((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-400"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                stayLoggedIn
                  ? "bg-violet-500 border-violet-500"
                  : "border-slate-600"
              }`}
            >
              {stayLoggedIn && (
                <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none">
                  <path
                    d="M1 5l3 3 7-7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            Stay logged in
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Signup button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98] mt-2"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-auto pt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}