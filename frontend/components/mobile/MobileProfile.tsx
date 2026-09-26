"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Settings, HelpCircle, Shield, Bell, Globe,
  Info, LogOut, ChevronRight, Crown, Sparkles, Flame, Star,
  Award, BookOpen, Trophy, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getGamificationStats,
  GamificationStats,
} from "@/lib/gamification";

const MENU_ITEMS = [
  { id: "profile",       label: "My Profile",     icon: UserIcon,    href: "/app/settings" },
  { id: "settings",      label: "Settings",       icon: Settings,    href: "/app/settings" },
  { id: "help",          label: "Help & Support", icon: HelpCircle,  href: "/help" },
  { id: "privacy",       label: "Privacy & Security", icon: Shield,  href: "/app/permissions" },
  { id: "notifications", label: "Notifications",  icon: Bell,        href: "/app/settings" },
  { id: "language",      label: "Language",       icon: Globe,       href: "/app/settings" },
  { id: "about",         label: "About Xentra",   icon: Info,        href: "/about" },
];

export default function MobileProfile() {
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
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Profile</div>
            <div className="text-[11px] text-slate-500">Your account & progress</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-600/25 via-violet-900/20 to-cyan-900/10 p-5">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg shadow-violet-500/30">
              {initials || "X"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-white truncate">{name}</div>
              <div className="text-[11px] text-slate-400 truncate">{email}</div>
              <div className="inline-flex items-center gap-1 mt-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5">
                <Crown className="w-3 h-3 text-amber-300" />
                <span className="text-[10px] font-semibold text-amber-300">
                  {planLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Level / XP row */}
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-violet-500/30 bg-slate-950/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-300 mb-0.5">
                <Award className="w-3 h-3" />
                Level
              </div>
              <div className="text-xl font-bold text-white">{level}</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-slate-950/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-300 mb-0.5">
                <Star className="w-3 h-3" />
                XP Points
              </div>
              <div className="text-xl font-bold text-white">
                {points.toLocaleString()}
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div className="relative mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                {xpInLevel} / {xpToNext} XP
              </span>
              <span className="text-violet-300 font-semibold">{Math.round(xpPct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>

          {/* Streak row */}
          <div className="relative mt-3 flex items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">
                {streak} Day Streak
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
            <Trophy className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-200">{level}</div>
            <div className="text-[10px] text-slate-500">Level</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
            <Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-200">
              {streak}d
            </div>
            <div className="text-[10px] text-slate-500">Streak</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
            <BookOpen className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-200">—</div>
            <div className="text-[10px] text-slate-500">Sessions</div>
          </div>
        </div>
      </div>

      {/* Upgrade banner (if free) */}
      {plan === "free" && (
        <div className="px-4 pb-4">
          <button
            onClick={() => router.push("/app/billing")}
            className="w-full relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-600/20 via-slate-900 to-cyan-600/10 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">
                  Upgrade to Ultimate
                </div>
                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Unlock unlimited learning, AI agents, and more!
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </div>
          </button>
        </div>
      )}
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
      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-900 transition text-left ${
                  i !== MENU_ITEMS.length - 1 ? "border-b border-slate-800/60" : ""
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="flex-1 text-sm text-slate-200">
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 py-3 text-sm font-semibold text-red-300 transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}