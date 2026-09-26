"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Settings, HelpCircle, Shield, Bell, Globe,
  Info, LogOut, ChevronRight, Crown, Sparkles, Flame, Star,
  Award, Trophy, Zap, BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getGamificationStats,
  GamificationStats,
} from "@/lib/gamification";

const MENU_ITEMS = [
  { id: "settings",      label: "Settings",           icon: Settings,   href: "/app/settings",      desc: "Preferences and voice" },
  { id: "privacy",       label: "Privacy & Security", icon: Shield,     href: "/app/permissions",   desc: "Permissions and audit" },
  { id: "notifications", label: "Notifications",      icon: Bell,       href: "/app/settings",      desc: "Alert preferences" },
  { id: "language",      label: "Language",           icon: Globe,      href: "/app/settings",      desc: "Interface language" },
  { id: "help",          label: "Help & Support",     icon: HelpCircle, href: "/help",              desc: "FAQs and contact" },
  { id: "about",         label: "About Xentra",       icon: Info,       href: "/about",             desc: "Version and license" },
];

export default function DesktopProfile() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [stats, setStats] = useState<GamificationStats | null>(null);

  useEffect(() => {
    getGamificationStats().then(setStats).catch(() => {});
  }, []);

  const name = user?.full_name || user?.email?.split("@")[0] || "Guest";
  const email = user?.email || "";
  const plan = user?.plan || "free";
  const planLabel =
    plan === "ultimate" ? "Ultimate"
    : plan === "premium" ? "Pro"
    : plan === "basic" ? "Plus"
    : "Free Plan";

  const level = stats?.level ?? 1;
  const points = stats?.points ?? 0;
  const xpInLevel = stats?.xp_in_level ?? 0;
  const xpToNext = stats?.xp_to_next ?? 1000;
  const xpPct = Math.min(100, (xpInLevel / xpToNext) * 100);
  const streak = stats?.streak_days ?? 0;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="text-sm text-slate-500">Your account and progress</p>
          </div>
        </div>

        {/* User card */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-violet-900/10 to-slate-900 p-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-6 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg shadow-violet-500/30">
              {initials || "X"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1">
                  <Crown className="w-3 h-3 text-amber-300" />
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                    {planLabel}
                  </span>
                </span>
              </div>
              <div className="text-sm text-slate-400">{email}</div>

              {/* XP bar */}
              <div className="mt-4 space-y-1.5 max-w-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Level {level} · {xpInLevel} / {xpToNext} XP
                  </span>
                  <span className="text-violet-300 font-semibold">
                    {Math.round(xpPct)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-950/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full transition-all"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/app/billing")}
              className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Manage Plan
            </button>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={<Award className="w-4 h-4 text-violet-400" />} label="Level" value={level} />
          <StatCard icon={<Star className="w-4 h-4 text-amber-400" />} label="XP Points" value={points.toLocaleString()} />
          <StatCard icon={<Flame className="w-4 h-4 text-orange-400" />} label="Streak" value={`${streak}d`} accent={streak > 0} />
          <StatCard icon={<Trophy className="w-4 h-4 text-cyan-400" />} label="Plan" value={planLabel} />
        </div>

        // In MobileProfile, above the Menu section
<button
  onClick={() => router.push("/app/more")}   // or trigger MoreSheet
  className="w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900 transition flex items-center gap-3"
>
  <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center">
    <Sparkles className="w-4 h-4 text-violet-400" />
  </div>
  <div className="flex-1 text-left">
    <div className="text-sm font-medium text-slate-200">More Tools</div>
    <div className="text-xs text-slate-500">Code, Files, Media, Shopping…</div>
  </div>
  <ChevronRight className="w-4 h-4 text-slate-600" />
</button>

        {/* Menu */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Account
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900 hover:border-slate-700 transition text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-violet-300 transition" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.desc}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 py-3 text-sm font-medium text-red-300 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-violet-500/40 bg-violet-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}