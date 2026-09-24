"use client";

import { useEffect, useState } from "react";
import { Search, Users, Loader2, Plus, ArrowLeft } from "lucide-react";
import {
  Chat, discoverPublicGroups, joinPublicGroup,
} from "@/lib/chat-api";

const CATEGORIES = [
  { value: "", label: "All", emoji: "🌐" },
  { value: "study", label: "Study", emoji: "📚" },
  { value: "programming", label: "Programming", emoji: "💻" },
  { value: "ai", label: "AI", emoji: "🤖" },
  { value: "college", label: "College", emoji: "🎓" },
  { value: "project", label: "Project", emoji: "🚀" },
];

export default function DiscoverPanel({
  onJoined,
  onBack,
}: {
  onJoined: (chatId: string) => void;
  onBack: () => void;
}) {
  const [groups, setGroups] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const result = await discoverPublicGroups({
        search: search || undefined,
        category: category || undefined,
      });
      setGroups(result);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchGroups, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const handleJoin = async (chatId: string) => {
    setJoiningId(chatId);
    try {
      const chat = await joinPublicGroup(chatId);
      onJoined(chat.id);
      setGroups((prev) => prev.filter((g) => g.id !== chatId));
    } catch (e) {
      console.error("Join failed:", e);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Discover Groups</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Find public groups to join
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`text-[10px] px-2 py-1 rounded-full border transition ${
              category === c.value
                ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                : "border-slate-800 bg-slate-900 text-slate-500 hover:bg-slate-800"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 px-4">
            No public groups found.
            <br />
            <span className="text-slate-600 mt-2 inline-block">
              Try creating one with the "New Group" button and mark it as public!
            </span>
          </div>
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              joining={joiningId === g.id}
              onJoin={() => handleJoin(g.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  joining,
  onJoin,
}: {
  group: Chat;
  joining: boolean;
  onJoin: () => void;
}) {
  const initial = (group.name?.[0] || "?").toUpperCase();
  const categoryEmoji =
    CATEGORIES.find((c) => c.value === group.category)?.emoji || "💬";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 hover:border-violet-500/40 transition">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">
              {group.name}
            </h4>
            {group.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                {categoryEmoji} {group.category}
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
            <Users className="w-3 h-3" />
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <button
        onClick={onJoin}
        disabled={joining}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition"
      >
        {joining ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Joining…
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            Join group
          </>
        )}
      </button>
    </div>
  );
}