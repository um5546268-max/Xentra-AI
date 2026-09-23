"use client";

import { useEffect, useState, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LogIn, Sparkles, Shield, Zap, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function WelcomePage() {
  const router = useRouter();
  
  // ✅ FIX 1: Use selectors to prevent re-renders on unrelated state changes
  const user = useAuth((state) => state.user);
  const googleSignIn = useAuth((state) => state.googleSignIn);
  const continueAsGuest = useAuth((state) => state.continueAsGuest); // ✅ NEW

  const [hovered, setHovered] = useState<"signin" | "signup" | "guest" | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load Google Identity Services script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // Render the Google button once the script + ref are ready
  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID;
    if (!clientId) {
      console.warn("[google] NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID is missing");
      return;
    }

    // @ts-ignore — google is injected by the script
    const g = (window as any).google;
    if (!g?.accounts?.id) return;

    g.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        const ok = await googleSignIn(response.credential);
        if (ok) router.push("/app");
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    g.accounts.id.renderButton(googleBtnRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 400,
      logo_alignment: "left",
    });
  }, [gsiReady, googleSignIn, router]);

  // If already logged in → redirect to dashboard
  useEffect(() => {
    if (!user) return;
    // Small delay for smooth transition
    const id = setTimeout(() => {
      router.replace("/app");
    }, 200);
    return () => clearTimeout(id);
  }, [user, router]);

  const handleGuestClick = () => {
    continueAsGuest();
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-6 py-12">
      
      {/* ✅ FIX 2: Memoized background prevents lag during state updates */}
      <BackgroundEffects />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left — brand */}
        <div className="space-y-6 text-center lg:text-left">
          
          {/* ✅ FIX 3: Memoized logo prevents heavy repaints */}
          <AnimatedLogo />

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 mb-2">
              Welcome to
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              Xentra AI
            </h1>
            <p className="text-base lg:text-lg text-slate-400 mt-4 leading-relaxed">
              Your AI Operating Assistant. Learn faster, think deeper,
              build anything.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start pt-2">
            <FeatureBadge icon={<Sparkles className="w-3.5 h-3.5" />} label="AI-powered learning" />
            <FeatureBadge icon={<Zap className="w-3.5 h-3.5" />} label="Study 10× faster" />
            <FeatureBadge icon={<Shield className="w-3.5 h-3.5" />} label="Private & secure" />
          </div>
        </div>

        {/* ── Sign in with Google / GitHub ── */}
        <div className="flex flex-col items-center gap-3">
          {/* Google button (injected by GIS) */}
          <div ref={googleBtnRef} />

          {/* GitHub button */}
          <a
            href={`https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_SIGNIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
              typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "",
            )}&scope=read:user user:email`}
            className="w-full max-w-[400px] flex items-center justify-center gap-3 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition py-3 text-sm font-medium text-slate-200"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            Continue with GitHub
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] uppercase tracking-wider text-slate-600">
              or
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        {/* Right — action buttons */}
        <div className="space-y-4">
          <div className="text-center mb-2">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Get started in seconds
            </div>
          </div>

          {/* SIGN UP — primary */}
          <button
            onClick={() => router.push("/signup")}
            onMouseEnter={() => setHovered("signup")}
            onMouseLeave={() => setHovered(null)}
            className="group relative w-full overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/30 via-violet-700/20 to-cyan-600/20 p-[1px] transition-transform hover:scale-[1.02]"
          >
            <div className="relative rounded-2xl bg-slate-950/60 backdrop-blur px-6 py-5 flex items-center gap-4">
              {/* Animated gradient */}
              <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                  hovered === "signup" ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.25) 0%, transparent 70%)",
                }}
              />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div className="relative flex-1 text-left">
                <div className="text-lg font-semibold text-white">
                  Create account
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Free forever · No card needed
                </div>
              </div>
              <div className="relative text-[10px] rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-300 uppercase tracking-wider">
                New
              </div>
            </div>
          </button>

          {/* SIGN IN — secondary */}
          <button
            onClick={() => router.push("/login")}
            onMouseEnter={() => setHovered("signin")}
            onMouseLeave={() => setHovered(null)}
            className="group relative w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50 p-[1px] transition-transform hover:scale-[1.02]"
          >
            <div className="relative rounded-2xl bg-slate-950/60 backdrop-blur px-6 py-5 flex items-center gap-4">
              <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                  hovered === "signin" ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.2) 0%, transparent 70%)",
                }}
              />
              <div className="relative w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <LogIn className="w-6 h-6 text-slate-300" />
              </div>
              <div className="relative flex-1 text-left">
                <div className="text-lg font-semibold text-white">
                  Sign in
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Continue with existing account
                </div>
              </div>
            </div>
          </button>

          {/* ✅ NEW: CONTINUE AS GUEST — tertiary */}
          <button
            onClick={handleGuestClick}
            onMouseEnter={() => setHovered("guest")}
            onMouseLeave={() => setHovered(null)}
            className="group relative w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/20 p-[1px] transition-transform hover:scale-[1.02]"
          >
            <div className="relative rounded-2xl bg-slate-950/40 backdrop-blur px-6 py-4 flex items-center gap-4">
              <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                  hovered === "guest" ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(148,163,184,0.15) 0%, transparent 70%)",
                }}
              />
              <div className="relative w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-slate-500" />
              </div>
              <div className="relative flex-1 text-left">
                <div className="text-base font-semibold text-slate-300 group-hover:text-white transition">
                  Continue as Guest
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Explore first · Sign in to unlock features
                </div>
              </div>
            </div>
          </button>

          {/* Footer */}
          <div className="text-center pt-4">
            <div className="text-[10px] text-slate-600 leading-relaxed">
              By continuing you agree to our{" "}
              <a href="/terms" className="text-slate-400 hover:text-violet-400 underline-offset-2 hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-slate-400 hover:text-violet-400 underline-offset-2 hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({
  icon, label,
}: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400">
      <span className="text-violet-400">{icon}</span>
      {label}
    </div>
  );
}

// ✅ FIX: Memoized components to prevent lag during state updates

const BackgroundEffects = memo(() => {
  return (
    <>
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.15) 0%, transparent 50%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );
});
BackgroundEffects.displayName = "BackgroundEffects";

const AnimatedLogo = memo(() => {
  return (
    <div className="flex justify-center lg:justify-start">
      <img
        src="/x-logo.png"
        alt="Xentra"
        className="w-40 h-40 object-contain drop-shadow-[0_0_50px_rgba(139,92,246,0.9)]"
      />
    </div>
  );
});
AnimatedLogo.displayName = "AnimatedLogo";