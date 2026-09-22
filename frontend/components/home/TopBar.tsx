"use client";

import { useState } from "react";
import { Search, Bell, Moon, Sun, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function TopBar() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800 bg-slate-950/60 backdrop-blur shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search anything… (e.g. &quot;Explain photosynthesis&quot;, &quot;Create flashcards&quot;, &quot;My notes&quot;)"
          className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 pl-1 pr-3 py-1 ml-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-medium truncate max-w-[100px]">
              {user?.full_name?.split(" ")[0] || "User"}
            </div>
            <div className="text-[10px] text-slate-500">Student</div>
          </div>
        </div>

        {/* Pro badge */}
        <div className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 px-2.5 py-1.5 text-xs font-medium text-amber-300">
          <Sparkles className="w-3 h-3" />
          Pro
        </div>
      </div>
    </div>
  );
}