"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Check, Loader2, Mail,
  User as UserIcon, Sparkles, GraduationCap, Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { submitOnboarding } from "@/lib/onboarding";

const INTERESTS = [
  { id: "math", emoji: "📐", label: "Mathematics" },
  { id: "physics", emoji: "⚛️", label: "Physics" },
  { id: "chemistry", emoji: "🧪", label: "Chemistry" },
  { id: "biology", emoji: "🧬", label: "Biology" },
  { id: "programming", emoji: "💻", label: "Programming" },
  { id: "languages", emoji: "🗣️", label: "Languages" },
  { id: "english_lit", emoji: "📖", label: "English" },
  { id: "history", emoji: "🏛️", label: "History" },
  { id: "geography", emoji: "🌍", label: "Geography" },
  { id: "economics", emoji: "💰", label: "Economics" },
  { id: "islamiat", emoji: "🕌", label: "Islamiat" },
  { id: "computer_science", emoji: "🖥️", label: "Computer Science" },
];

const CLASSES = [
  { id: "class_6", label: "Class 6" },
  { id: "class_7", label: "Class 7" },
  { id: "class_8", label: "Class 8" },
  { id: "class_9", label: "Class 9" },
  { id: "class_10", label: "Class 10" },
  { id: "class_11", label: "Class 11" },
  { id: "class_12", label: "Class 12" },
  { id: "university", label: "University" },
  { id: "self", label: "Self-learner" },
];

export default function SignupPage() {
  const router = useRouter();           // ✅ FIXED — was missing
  const { signup } = useAuth();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [skipPassword, setSkipPassword] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [classLevel, setClassLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = () => {
    if (step === 0) return /^\S+@\S+\.\S+$/.test(email);
    if (step === 1) return interests.length >= 1;
    if (step === 2)
      return displayName.trim().length > 0 && (skipPassword || password.length >= 6);
    if (step === 3) return !!classLevel;
    return false;
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const next = async () => {
    if (!canContinue()) return;
    if (step < 3) {
      setStep(step + 1);
    } else {
      await finish();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const finalPassword = skipPassword
        ? Math.random().toString(36).slice(2) + "Aa1!"
        : password;

      // 1. Create the account
      const ok = await signup(email.trim(), finalPassword, displayName.trim());
      if (!ok) {
        setError("Signup failed. Try a different email or check the backend.");
        setSaving(false);
        return;
      }

      // 2. Submit onboarding data
      await submitOnboarding({
        display_name: displayName.trim(),
        class_level: classLevel,
        learning_goal: "concepts",
        interests,
      });

      // 3. Send them into the app
      router.push("/app");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          e.message ||
          "Something went wrong. Try a different email.",
      );
      if (e?.response?.status === 409 || e?.response?.status === 400) {
        setStep(0);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-6 py-12">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(139,92,246,0.15) 0%, transparent 55%), radial-gradient(circle at 70% 80%, rgba(34,211,238,0.12) 0%, transparent 55%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-violet-500 w-8" : "bg-slate-800 w-4"
              }`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 backdrop-blur-xl p-8 shadow-2xl shadow-violet-500/5 space-y-6">
          <div className="flex justify-center">
  <img
    src="/x-logo.png"
    alt="Xentra"
    className="w-20 h-20 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.9)]"
  />
</div>

          {/* Step 0 — Email */}
          {step === 0 && (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-sm text-slate-400">
                  We&apos;ll send you a welcome email. No spam, promise.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  onKeyDown={(e) => e.key === "Enter" && next()}
                />
              </div>
            </>
          )}

          {/* Step 1 — Interests */}
          {step === 1 && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-300" />
                </div>
                <h1 className="text-2xl font-bold">What are you interested in?</h1>
                <p className="text-sm text-slate-400">
                  Pick at least 1 — you can change them later.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {INTERESTS.map((i) => {
                  const picked = interests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      onClick={() => toggleInterest(i.id)}
                      className={`relative rounded-xl border p-3 text-center transition ${
                        picked
                          ? "border-pink-500 bg-pink-500/20"
                          : "border-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {picked && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-2xl mb-1">{i.emoji}</div>
                      <div className="text-xs font-medium">{i.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="text-center text-[11px] text-slate-500">
                {interests.length} selected
              </div>
            </>
          )}

          {/* Step 2 — Name + Password */}
          {step === 2 && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-violet-300" />
                </div>
                <h1 className="text-2xl font-bold">Almost there</h1>
                <p className="text-sm text-slate-400">
                  Set your display name and password.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="What should we call you?"
                    autoFocus
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-base focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSkipPassword(!skipPassword);
                        if (!skipPassword) setPassword("");
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                        skipPassword
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                          : "border-slate-700 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {skipPassword ? "Skipping ✓" : "Skip for now"}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={skipPassword ? "Skipped" : "At least 6 characters"}
                    disabled={skipPassword}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-base focus:border-violet-500 focus:outline-none disabled:opacity-40"
                    onKeyDown={(e) => e.key === "Enter" && next()}
                  />
                  {skipPassword && (
                    <p className="text-[11px] text-amber-400/80">
                      You can add a password later in Settings. Great for trying things out first.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step 3 — Class level */}
          {step === 3 && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-cyan-300" />
                </div>
                <h1 className="text-2xl font-bold">
                  What class are you in, {displayName}?
                </h1>
                <p className="text-sm text-slate-400">
                  We&apos;ll match content to your level.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CLASSES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClassLevel(c.id)}
                    className={`rounded-xl border px-3 py-3 text-center transition ${
                      classLevel === c.id
                        ? "border-cyan-500 bg-cyan-500/20"
                        : "border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <div className="text-sm font-semibold">{c.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={back}
              disabled={step === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 disabled:opacity-0 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={next}
              disabled={!canContinue() || saving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-sm font-medium disabled:opacity-40 transition shadow-lg shadow-violet-500/20"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {step < 3 ? (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Start learning <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-violet-400 hover:text-violet-300"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}