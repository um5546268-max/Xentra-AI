"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, SlidersHorizontal, Users, MessageSquare,
  UserPlus, Pencil,
} from "lucide-react";
import {
  Chat, listChats, getUnreadSummary,
} from "@/lib/chat-api";
import {
  Friend, FriendRequest, listFriends, listFriendRequests,
} from "@/lib/friends-api";
import { useAuth } from "@/lib/auth";
import { usePolling } from "@/lib/usePolling";
import AddFriendModal from "@/components/connect/AddFriendModal";
import CreateGroupModal from "@/components/connect/CreateGroupModal";

const AVATAR_COLORS = [
  "from-violet-500 to-cyan-500",
  "from-emerald-500 to-cyan-500",
  "from-pink-500 to-violet-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-slate-500 to-slate-700",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Tab = "chats" | "groups" | "requests";

export default function MobileConnect() {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>("chats");
  const [search, setSearch] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [c, f, r] = await Promise.all([
        listChats().catch(() => []),
        listFriends().catch(() => []),
        listFriendRequests().catch(() => []),
      ]);
      setChats(c);
      setFriends(f);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  };

  const pollUnread = async () => {
    try {
      const items = await getUnreadSummary();
      const map: Record<string, number> = {};
      for (const item of items) map[item.chat_id] = item.unread;
      setUnread(map);
    } catch {}
  };

  useEffect(() => {
    refresh();
  }, []);

  usePolling(pollUnread, 5000, true);

  const directChats = useMemo(
    () =>
      chats
        .filter((c) => c.type === "direct")
        .filter((c) => {
          if (!search.trim()) return true;
          const name =
            c.members.find(
              (m) => String(m.user_id) !== String(currentUser?.id)
            )?.full_name || "";
          return name.toLowerCase().includes(search.toLowerCase());
        }),
    [chats, search, currentUser?.id]
  );

  const groupChats = useMemo(
    () =>
      chats
        .filter((c) => c.type === "group")
        .filter((c) =>
          search.trim()
            ? (c.name || "").toLowerCase().includes(search.toLowerCase())
            : true
        ),
    [chats, search]
  );

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/40"
            style={{
              background:
                "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            }}
          >
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Connect</div>
            <div className="text-[11px] text-slate-400">
              Chat with Xentra users
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddFriend(true)}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
            title="Add friend"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
            title="New group"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users or groups…"
            className="w-full rounded-full border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-thin">
        <TabBtn
          active={tab === "chats"}
          onClick={() => setTab("chats")}
          label="Chats"
          count={directChats.length}
        />
        <TabBtn
          active={tab === "groups"}
          onClick={() => setTab("groups")}
          label="Groups"
          count={groupChats.length}
        />
        <TabBtn
          active={tab === "requests"}
          onClick={() => setTab("requests")}
          label="Requests"
          count={requests.length}
        />
      </div>

      {/* Online Now row (only on chats/groups tab) */}
      {tab !== "requests" && friends.length > 0 && (
        <div className="pb-3">
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Online Now
            </div>
            <button
              onClick={() => router.push("/app/connect")}
              className="text-[11px] text-blue-400"
            >
              See all →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 scrollbar-thin">
            {friends.slice(0, 8).map((f) => {
              const name = f.full_name || f.email || "Friend";
              const firstName = name.split(" ")[0];
              const initial = name[0].toUpperCase();
              const color = colorFor(f.id);
              return (
                <button
                  key={f.id}
                  onClick={async () => {
                    try {
                      const { createDirectChat } = await import(
                        "@/lib/chat-api"
                      );
                      const chat = await createDirectChat(f.user_id);
                      await refresh();
                      // ✅ FIXED: full-screen mobile chat view
                      router.push(`/app/connect/${chat.id}`);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                  title={name}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-900 group-hover:ring-blue-500/50 transition`}
                    >
                      {initial}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-[56px] truncate group-hover:text-slate-200 transition">
                    {firstName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* New Group button (only on groups tab) */}
      {tab === "groups" && groupChats.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-500/5 py-3 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Group
          </button>
        </div>
      )}

      {/* List */}
      <div className="px-4 pb-4 space-y-1.5">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Loading…
          </div>
        ) : tab === "chats" ? (
          directChats.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-6 h-6" />}
              text="No chats yet. Start one from a friend."
            />
          ) : (
            directChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                currentUserId={currentUser?.id || ""}
                unreadCount={unread[chat.id] || 0}
                // ✅ FIXED: full-screen mobile chat view
                onClick={() => router.push(`/app/connect/${chat.id}`)}
              />
            ))
          )
        ) : tab === "groups" ? (
          groupChats.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-xs text-slate-500 max-w-xs">
                No groups yet. Start one to chat with multiple friends.
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/30 transition active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                }}
              >
                <Users className="w-3.5 h-3.5 inline mr-1.5" />
                Create Group
              </button>
            </div>
          ) : (
            groupChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                currentUserId={currentUser?.id || ""}
                unreadCount={unread[chat.id] || 0}
                // ✅ FIXED: full-screen mobile chat view
                onClick={() => router.push(`/app/connect/${chat.id}`)}
              />
            ))
          )
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-6 h-6" />}
            text="No pending requests."
          />
        ) : (
          requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              onAccept={async () => {
                const { acceptFriendRequest } = await import(
                  "@/lib/friends-api"
                );
                await acceptFriendRequest(req.id);
                refresh();
              }}
              onDecline={async () => {
                const { declineFriendRequest } = await import(
                  "@/lib/friends-api"
                );
                await declineFriendRequest(req.id);
                refresh();
              }}
            />
          ))
        )}
      </div>

      {/* Floating Action Button — context aware */}
      <button
        onClick={() => {
          if (tab === "groups") setShowCreateGroup(true);
          else setShowAddFriend(true);
        }}
        className="fixed right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/40 transition active:scale-95"
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
          bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
        }}
        title={tab === "groups" ? "New group" : "New chat"}
      >
        {tab === "groups" ? (
          <Users className="w-5 h-5" />
        ) : (
          <Pencil className="w-5 h-5" />
        )}
      </button>

      {/* Modals */}
      {showAddFriend && (
        <AddFriendModal
          onClose={() => {
            setShowAddFriend(false);
            refresh();
          }}
        />
      )}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={async () => {
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab Button ───
function TabBtn({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? "text-white shadow-lg"
          : "text-slate-400 bg-slate-900/60 border border-slate-800 hover:text-slate-200"
      }`}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            }
          : undefined
      }
    >
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
          active
            ? "bg-white/20 text-white"
            : "bg-slate-800 text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Empty State ───
function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
        {icon}
      </div>
      <div className="text-xs text-slate-500 max-w-xs">{text}</div>
    </div>
  );
}

// ─── Chat Row ───
function ChatRow({
  chat,
  currentUserId,
  unreadCount,
  onClick,
}: {
  chat: Chat;
  currentUserId: string;
  unreadCount: number;
  onClick: () => void;
}) {
  const other = chat.members.find(
    (m) => String(m.user_id) !== String(currentUserId)
  );
  const name =
    chat.type === "direct"
      ? other?.full_name || other?.email || "Unknown"
      : chat.name || "Group";
  const initial = (name[0] || "?").toUpperCase();
  const color = colorFor(chat.id);

  let preview = chat.last_message_preview || "No messages yet";
  if (preview.length > 40) preview = preview.slice(0, 40) + "…";

  let time = "";
  if (chat.last_message_at) {
    const d = new Date(chat.last_message_at);
    time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left"
    >
      <div className="relative shrink-0">
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm`}
        >
          {chat.type === "group" ? <Users className="w-5 h-5" /> : initial}
        </div>
        {hasUnread && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-100 truncate">
            {name}
          </span>
          {time && (
            <span className="text-[10px] text-slate-500 shrink-0">
              {time}
            </span>
          )}
        </div>
        <div
          className={`text-xs truncate mt-0.5 ${
            hasUnread ? "text-slate-200 font-medium" : "text-slate-500"
          }`}
        >
          {preview}
        </div>
      </div>
    </button>
  );
}

// ─── Request Row ───
function RequestRow({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const name =
    (request as any).other_user_name ||
    (request as any).other_user_email ||
    "Unknown";
  const initial = (name[0] || "?").toUpperCase();
  const color = colorFor(request.id);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
      <div
        className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm shrink-0`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-100 truncate">
          {name}
        </div>
        <div className="text-[11px] text-slate-500">
          wants to be friends
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onAccept}
          className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition active:scale-95"
          title="Accept"
        >
          ✓
        </button>
        <button
          onClick={onDecline}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95"
          title="Decline"
        >
          ✕
        </button>
      </div>
    </div>
  );
}