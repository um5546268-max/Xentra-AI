"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LogIn, Sparkles, Shield, Zap } from "lucide-react";
import { XHologram } from "@/components/brand/XHologram";
import { useAuth } from "@/lib/auth";

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hovered, setHovered] = useState<"signin" | "signup" | null>(null);

  // If already logged in → check onboarding and redirect
  useEffect(() => {
    if (!user) return;
    // Small delay for smooth transition
    const id = setTimeout(() => {
      router.replace("/app");
    }, 200);
    return () => clearTimeout(id);
  }, [user, router]);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-6 py-12">
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

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — brand */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <XHologram size={160} />
          </div>

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