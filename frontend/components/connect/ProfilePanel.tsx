"use client";

import { useEffect, useState } from "react";
import {
  X, Star, Users, Loader2, Crown, Shield,
  LogOut, UserPlus, Pin, MoreVertical, Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Chat,
  ChatMember,
  getChat,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  listPinnedMessages,
} from "@/lib/chat-api";
import { Friend, listFriends } from "@/lib/friends-api";
import SharedMedia from "./SharedMedia";
import ConnectSettings from "./ConnectSettings";

export default function ProfilePanel({ chatId }: { chatId: string }) {
  const currentUser = useAuth((state) => state.user);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [pins, setPins] = useState<Awaited<ReturnType<typeof listPinnedMessages>>>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getChat(chatId).catch(() => null),
      listPinnedMessages(chatId).catch(() => []),
    ])
      .then(([c, p]) => {
        if (cancelled) return;
        setChat(c);
        setPins(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
        Chat not found
      </div>
    );
  }

  const isGroup = chat.type === "group";
  const other = chat.members.find(
    (m) => String(m.user_id) !== String(currentUser?.id)
  );
  const myMembership = chat.members.find(
    (m) => String(m.user_id) === String(currentUser?.id)
  );
  const isAdmin = myMembership?.role === "admin";
  const isModerator = myMembership?.role === "moderator";
  const canManage = isAdmin || isModerator;

  const displayName = isGroup
    ? chat.name || "Group"
    : other?.full_name || other?.email || "Unknown";
  const initial = (displayName[0] || "?").toUpperCase();

  const handleAddMember = async (userId: string) => {
    try {
      const updated = await addGroupMember(chatId, userId);
      setChat(updated);
      setShowAddMember(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleKick = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      await removeGroupMember(chatId, userId);
      const updated = await getChat(chatId);
      setChat(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromote = async (
    userId: string,
    role: "admin" | "moderator" | "member"
  ) => {
    try {
      const updated = await updateGroupMemberRole(chatId, userId, role);
      setChat(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    try {
      await removeGroupMember(chatId, currentUser?.id || "");
      window.location.href = "/app/connect";
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
        <h3 className="text-sm font-semibold text-white">
          {isGroup ? "Group Info" : "Connection Panel"}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
            title="Connect settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
            {isGroup ? <Users className="w-10 h-10" /> : initial}
          </div>
          <h4 className="mt-3 text-base font-semibold text-white">
            {displayName}
          </h4>
          {isGroup ? (
            <>
              <p className="text-xs text-slate-500">
                {chat.members.length} member
                {chat.members.length !== 1 ? "s" : ""}
                {chat.category && ` · ${chat.category}`}
              </p>
              {chat.description && (
                <p className="text-xs text-slate-500 italic mt-2 text-center">
                  "{chat.description}"
                </p>
              )}
              {chat.is_public && (
                <div className="mt-2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
                  Public
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {other?.email || "No email"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-400">Online</span>
              </div>

              {/* Stats cards: Points + Level */}
              <div className="grid grid-cols-2 gap-2 w-full mt-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 mb-1">
                    <Star className="w-3 h-3" />
                    Learning Points
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    {(other?.points ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-violet-400 mb-1">
                    <Shield className="w-3 h-3" />
                    Level
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    {other?.level ?? 1}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Learning Interests (direct chat only) */}
      {!isGroup && other && (
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Learning Interests
            </h5>
            <span className="text-[10px] text-slate-500">
              {(other?.interests?.length ?? 0)} areas
            </span>
          </div>
          {!other.interests || other.interests.length === 0 ? (
            <div className="text-xs text-slate-600 text-center py-3">
              No interests set yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {other.interests.map((interest: string, i: number) => {
                const lower = interest.toLowerCase();
                const emoji = lower.includes("python")
                  ? "🐍"
                  : lower.includes("ai") || lower.includes("ml")
                  ? "🤖"
                  : lower.includes("math")
                  ? "📐"
                  : lower.includes("physic")
                  ? "⚛️"
                  : lower.includes("web")
                  ? "🌐"
                  : lower.includes("english")
                  ? "📖"
                  : lower.includes("design")
                  ? "🎨"
                  : lower.includes("code") || lower.includes("program")
                  ? "💻"
                  : "📚";
                return (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-300 hover:border-violet-500/40 transition"
                  >
                    <span>{emoji}</span>
                    {interest}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Group members list */}
      {isGroup && (
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Members ({chat.members.length})
            </h5>
            {canManage && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Add
              </button>
            )}
          </div>

          <div className="space-y-1">
            {chat.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isMe={String(m.user_id) === String(currentUser?.id)}
                isAdmin={isAdmin}
                canManage={canManage}
                onKick={() => handleKick(m.user_id)}
                onPromote={(role) => handlePromote(m.user_id, role)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Shared media */}
      <SharedMedia chatId={chatId} />

      {/* Pinned items */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Pinned Items
          </h5>
          <span className="text-[10px] text-slate-500">
            {pins.length} pinned
          </span>
        </div>
        {pins.length === 0 ? (
          <div className="text-xs text-slate-600 text-center py-4">
            No pinned items yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="flex items-start gap-2 rounded-lg p-2 hover:bg-slate-900 transition cursor-pointer"
              >
                <Pin className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500">
                    {pin.sender_name || "Them"}
                  </div>
                  <div className="text-xs text-slate-300 line-clamp-2">
                    {pin.content.slice(0, 100)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave group button */}
      {isGroup && (
        <div className="p-5 mt-auto">
          <button
            onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            Leave group
          </button>
        </div>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal
          chat={chat}
          currentUserId={currentUser?.id || ""}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
        />
      )}

      {/* Connect Settings modal */}
      {showSettings && (
        <ConnectSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// MEMBER ROW
// ═══════════════════════════════════════════════════════════════
function MemberRow({
  member,
  isMe,
  isAdmin,
  canManage,
  onKick,
  onPromote,
}: {
  member: ChatMember;
  isMe: boolean;
  isAdmin: boolean;
  canManage: boolean;
  onKick: () => void;
  onPromote: (role: "admin" | "moderator" | "member") => void;
}) {
  const name = member.full_name || member.email || "Unknown";
  const initial = (name[0] || "?").toUpperCase();
  const [showActions, setShowActions] = useState(false);

  const handleBlock = async () => {
    if (!confirm(`Block ${name}?\n\nYou won't see their messages anymore.`)) return;
    try {
      const { blockUser } = await import("@/lib/chat-api");
      await blockUser(member.user_id);
      alert(`${name} has been blocked. Reload to see the effect.`);
    } catch (e) {
      console.error(e);
      alert("Failed to block");
    }
  };

  const handleReport = async () => {
    const reason = prompt("Report reason (optional):");
    if (reason === null) return;
    try {
      const { reportUser } = await import("@/lib/chat-api");
      await reportUser(member.user_id, reason || undefined);
      alert("Reported. Thank you.");
    } catch (e) {
      console.error(e);
      alert("Failed to report");
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-900 transition">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-200 truncate">
          {name} {isMe && <span className="text-slate-500">(you)</span>}
        </div>
        <div className="text-[10px] text-slate-500 truncate">{member.email}</div>
      </div>

      {member.role === "admin" && (
        <span title="Admin" className="shrink-0">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
        </span>
      )}
      {member.role === "moderator" && (
        <span title="Moderator" className="shrink-0">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
        </span>
      )}

      {!isMe && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowActions((s: boolean) => !s)}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
            title="More actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showActions && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-40 overflow-hidden">
                {canManage && (
                  <>
                    {isAdmin && member.role === "member" && (
                      <button
                        onClick={() => {
                          setShowActions(false);
                          onPromote("moderator");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition text-left"
                      >
                        Promote to moderator
                      </button>
                    )}
                    {isAdmin && member.role === "moderator" && (
                      <button
                        onClick={() => {
                          setShowActions(false);
                          onPromote("admin");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-400 hover:bg-amber-500/10 transition text-left"
                      >
                        Promote to admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowActions(false);
                        onKick();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-orange-400 hover:bg-orange-500/10 transition text-left border-t border-slate-800"
                    >
                      Kick from group
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowActions(false);
                    handleBlock();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition text-left border-t border-slate-800"
                >
                  Block user
                </button>
                <button
                  onClick={() => {
                    setShowActions(false);
                    handleReport();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-yellow-400 hover:bg-yellow-500/10 transition text-left border-t border-slate-800"
                >
                  Report user
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD MEMBER MODAL
// ═══════════════════════════════════════════════════════════════
function AddMemberModal({
  chat,
  currentUserId,
  onClose,
  onAdd,
}: {
  chat: Chat;
  currentUserId: string;
  onClose: () => void;
  onAdd: (userId: string) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFriends()
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, []);

  const existingIds = new Set(chat.members.map((m) => String(m.user_id)));
  const available = friends.filter(
    (f) =>
      !existingIds.has(String(f.user_id)) &&
      String(f.user_id) !== currentUserId
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Add a member</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6">
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin mx-auto" />
          </div>
        ) : available.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-6">
            No friends available to add
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {available.map((f) => {
              const name = f.full_name || f.email || "Unknown";
              return (
                <button
                  key={f.id}
                  onClick={() => onAdd(f.user_id)}
                  className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900 transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-200 truncate">{name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {f.email}
                    </div>
                  </div>
                  <UserPlus className="w-4 h-4 text-violet-400" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}