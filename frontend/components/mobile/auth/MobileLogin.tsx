"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function MobileLogin() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const googleSignIn = useAuth((s) => s.googleSignIn);
  const loading = useAuth((s) => s.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Google Identity Services state
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiRendered, setGsiRendered] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Hydration-safe GitHub URL
  const [githubAuthUrl, setGithubAuthUrl] = useState<string>("");

  // ── Load Google GSI script once ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).google?.accounts?.id) {
      setGsiReady(true);
      return;
    }
    if (document.getElementById("google-gsi-script")) {
      const t = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          setGsiReady(true);
          clearInterval(t);
        }
      }, 200);
      return () => clearInterval(t);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
  }, []);

  // ── Build GitHub OAuth URL on the client only ───────────────────────
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_SIGNIN_CLIENT_ID ?? "";
    const redirectUri = `${window.location.origin}/auth/callback`;
    setGithubAuthUrl(
      `https://github.com/login/oauth/authorize?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=read:user user:email`
    );
  }, []);

  // ── Render the official Google button once GSI is ready ─────────────
  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID;
    if (!clientId) {
      console.warn(
        "[google] NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID is missing — cannot render Google button"
      );
      return;
    }

    // @ts-ignore
    const g = (window as any).google;
    if (!g?.accounts?.id) return;

    g.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        const ok = await googleSignIn(response.credential, true);
        if (ok) router.push("/app");
        else setError("Google sign-in failed");
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Match Google's iframe width to the container's real width.
    const parent = googleBtnRef.current.parentElement;
    const parentWidth = parent?.clientWidth ?? 320;
    const safeWidth = Math.max(200, Math.min(parentWidth, 400));

    googleBtnRef.current.innerHTML = "";

    g.accounts.id.renderButton(googleBtnRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: safeWidth,
      logo_alignment: "center",
    });

    setGsiRendered(true);
  }, [gsiReady, googleSignIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    const ok = await login(email.trim(), password, rememberMe);
    if (ok) router.push("/app");
    else setError("Invalid email or password");
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
        <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to continue your journey.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email or Username"
            autoComplete="username"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-11 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
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

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setRememberMe((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-400"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                rememberMe
                  ? "bg-violet-500 border-violet-500"
                  : "border-slate-600"
              }`}
            >
              {rememberMe && (
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
            Remember me
          </button>
          <Link
            href="/forgot-password"
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2.5 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

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
              Signing in…
            </>
          ) : (
            "Sign In"
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

      {/* Social buttons */}
      <div className="space-y-3">
        {/* Google — fallback + real GIS button that matches container width */}
        <div className="relative w-full">
          {!gsiRendered && (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 py-3.5 text-sm font-medium text-slate-400"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          )}
          <div
            ref={googleBtnRef}
            className={`w-full flex justify-center ${
              gsiRendered
                ? "block"
                : "absolute inset-0 opacity-0 pointer-events-none"
            }`}
          />
        </div>

        {/* GitHub */}
        {githubAuthUrl && (
          <a
            href={githubAuthUrl}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition py-3.5 text-sm font-medium text-slate-200"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            Continue with GitHub
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-auto pt-6">
        Don't have an account?{" "}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium">
          Sign Up
        </Link>
      </div>
    </div>
  );
}