"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function MobileSignup() {
  const router = useRouter();
  const signup = useAuth((s) => s.signup);
  const googleSignIn = useAuth((s) => s.googleSignIn);
  const loading = useAuth((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("google-gsi-script")) {
      setGsiReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID;
    if (!clientId) return;

    // @ts-ignore
    const g = (window as any).google;
    if (!g?.accounts?.id) return;

    g.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        const ok = await googleSignIn(response.credential);
        if (ok) router.push("/app");
        else setError("Google sign-up failed");
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    g.accounts.id.renderButton(googleBtnRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "rectangular",
      text: "signup_with",
      width: 320,
      logo_alignment: "center",
    });
  }, [gsiReady, googleSignIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Please enter your name");
    if (!email.trim()) return setError("Please enter your email");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    if (!agreed) return setError("Please agree to the Terms and Privacy Policy");

    const ok = await signup(email.trim(), password, fullName.trim());
    if (ok) router.push("/app");
    else setError("Signup failed. Please try again.");
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
        <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Join Xentra and unlock the future.
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
            placeholder="Full Name"
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
            placeholder="Email Address"
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
            placeholder="Create Password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm Password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Terms checkbox */}
        <button
          type="button"
          onClick={() => setAgreed((v) => !v)}
          className="w-full flex items-start gap-2 pt-1 text-left"
        >
          <span
            className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition ${
              agreed ? "bg-violet-500 border-violet-500" : "border-slate-600"
            }`}
          >
            {agreed && (
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
          <span className="text-[11px] text-slate-400 leading-tight">
            I agree to the{" "}
            <Link href="/terms" className="text-violet-400 hover:text-violet-300 underline-offset-2 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </button>

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Sign Up button */}
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
            "Sign Up"
          )}
        </button>
      </form>

      {/* or divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          or
        </span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Social */}
      <div className="space-y-3">
        <div ref={googleBtnRef} className="flex justify-center" />

        <a
          href={`https://github.com/login/oauth/authorize?client_id=${
            process.env.NEXT_PUBLIC_GITHUB_SIGNIN_CLIENT_ID
          }&redirect_uri=${encodeURIComponent(
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : ""
          )}&scope=read:user user:email`}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition py-3.5 text-sm font-medium text-slate-200"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
          Continue with GitHub
        </a>
      </div>

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