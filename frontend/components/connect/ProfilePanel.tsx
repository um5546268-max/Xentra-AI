"use client";

import { useEffect, useState } from "react";
import {
  X, Star, Users, FileText, Image as ImageIcon, Video, Pin,
  Loader2, Crown, Shield, User as UserIcon, LogOut, UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Chat, ChatMember, getChat, addGroupMember, removeGroupMember,
  updateGroupMemberRole,
} from "@/lib/chat-api";
import { Friend, listFriends } from "@/lib/friends-api";

export default function ProfilePanel({ chatId }: { chatId: string }) {
  const currentUser = useAuth((state) => state.user);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChat(chatId)
      .then((c) => {
        if (!cancelled) setChat(c);
      })
      .catch(() => {})
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

  const displayName = isGroup ? chat.name || "Group" : other?.full_name || other?.email || "Unknown";
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

  const handlePromote = async (userId: string, role: "admin" | "moderator" | "member") => {
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
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
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
                {chat.members.length} member{chat.members.length !== 1 ? "s" : ""}
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
            </>
          )}
        </div>
      </div>

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

      {/* Direct chat: shared media placeholder */}
      {!isGroup && (
        <>
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Shared Files & Media
              </h5>
              <button className="text-[10px] text-violet-400 hover:text-violet-300">
                View All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MediaThumb icon={<FileText className="w-4 h-4" />} label="Files" sub="—" />
              <MediaThumb icon={<ImageIcon className="w-4 h-4" />} label="Images" sub="—" />
              <MediaThumb icon={<Video className="w-4 h-4" />} label="Videos" sub="—" />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pinned Items
              </h5>
              <button className="text-[10px] text-violet-400 hover:text-violet-300">
                View All
              </button>
            </div>
            <div className="text-xs text-slate-600 text-center py-4">
              No pinned items yet
            </div>
          </div>
        </>
      )}

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
    </div>
  );
}

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

  return (
    <div className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-900 transition group">
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
        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Admin" />
      )}
      {member.role === "moderator" && (
        <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" title="Moderator" />
      )}

      {canManage && !isMe && (
        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
          {isAdmin && member.role === "member" && (
            <button
              onClick={() => onPromote("moderator")}
              className="text-[9px] text-cyan-400 hover:text-cyan-300 px-1"
              title="Promote to moderator"
            >
              Mod
            </button>
          )}
          {isAdmin && member.role === "moderator" && (
            <button
              onClick={() => onPromote("admin")}
              className="text-[9px] text-amber-400 hover:text-amber-300 px-1"
              title="Promote to admin"
            >
              Admin
            </button>
          )}
          <button
            onClick={onKick}
            className="text-[9px] text-red-400 hover:text-red-300 px-1"
            title="Remove"
          >
            Kick
          </button>
        </div>
      )}
    </div>
  );
}

function MediaThumb({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-violet-500/40 transition cursor-pointer">
      <div className="aspect-square flex items-center justify-center bg-slate-900 text-violet-300">
        {icon}
      </div>
      <div className="p-1.5">
        <div className="text-[9px] text-slate-300 truncate">{label}</div>
        <div className="text-[8px] text-slate-600">{sub}</div>
      </div>
    </div>
  );
}

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
    (f) => !existingIds.has(String(f.user_id)) && String(f.user_id) !== currentUserId
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
                    <div className="text-[10px] text-slate-500 truncate">{f.email}</div>
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