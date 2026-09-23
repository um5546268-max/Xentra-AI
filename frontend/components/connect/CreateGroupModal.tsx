"use client";

import { useEffect, useState } from "react";
import {
  X, Users, Loader2, Check, UserPlus, AlertCircle,
} from "lucide-react";
import { Friend, listFriends } from "@/lib/friends-api";
import { createGroupChat } from "@/lib/chat-api";

const CATEGORIES = [
  { value: "study", label: "Study", emoji: "📚" },
  { value: "programming", label: "Programming", emoji: "💻" },
  { value: "ai", label: "AI", emoji: "🤖" },
  { value: "college", label: "College / Class", emoji: "🎓" },
  { value: "project", label: "Project", emoji: "🚀" },
  { value: "other", label: "Other", emoji: "💬" },
];

export default function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("study");
  const [isPublic, setIsPublic] = useState(true);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load friends
  useEffect(() => {
    listFriends()
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, []);

  const toggleFriend = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const chat = await createGroupChat({
        name: trimmed,
        description: description.trim() || undefined,
        category,
        is_public: isPublic,
        member_ids: Array.from(selected),
      });
      onCreated(chat.id);
      onClose();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Failed to create group";
      setError(detail);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create a group</h2>
            <p className="text-xs text-slate-500">Add your friends to get started</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Group name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CS Study Group"
              maxLength={120}
              autoFocus
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    category === cat.value
                      ? "border-violet-500 bg-violet-500/20 text-violet-200"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
            <div>
              <div className="text-sm text-slate-200">Public group</div>
              <div className="text-[10px] text-slate-500">
                Anyone can discover and join
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition ${
                isPublic ? "bg-violet-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  isPublic ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Friends picker */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Add members ({selected.size} selected)
            </label>
            {loadingFriends ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-6 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-500">
                No friends yet. Add a friend first.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-1 space-y-1">
                {friends.map((f) => {
                  const isSelected = selected.has(f.user_id);
                  const name = f.full_name || f.email || "Unknown";
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFriend(f.user_id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 transition text-left ${
                        isSelected ? "bg-violet-500/20" : "hover:bg-slate-800"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 truncate">
                          {name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {f.email}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                          isSelected
                            ? "bg-violet-600 border-violet-600"
                            : "border-slate-700"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-slate-800 shrink-0">
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}