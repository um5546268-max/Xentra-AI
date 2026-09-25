"use client";

import { useEffect, useState } from "react";
import {
  Search, UserPlus, MessageSquare, Loader2, Check, X, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePolling } from "@/lib/usePolling";
import { Chat, listChats, getUnreadSummary } from "@/lib/chat-api";
import {
  Friend, FriendRequest, listFriends, listFriendRequests,
  acceptFriendRequest, declineFriendRequest,
} from "@/lib/friends-api";
import AddFriendModal from "./AddFriendModal";
import CreateGroupModal from "./CreateGroupModal";
import DiscoverPanel from "./DiscoverPanel";

type Tab = "chats" | "friends" | "groups" | "discover" | "requests";

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

export default function ChatListPanel({
  selectedChatId,
  onSelectChat,
}: {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}) {
  const currentUser = useAuth((state) => state.user);
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

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineFriendRequest(id);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredChats = chats.filter((c) => {
    const name =
      c.type === "direct"
        ? c.members.find((m) => String(m.user_id) !== String(currentUser?.id))?.full_name || ""
        : c.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const directChats = filteredChats.filter((c) => c.type === "direct");
  const groupChats = filteredChats.filter((c) => c.type === "group");

  // ✅ Discover panel takes over the whole list area (still keeps the outer container layout)
  return (
    <div className="flex flex-col h-full">
      {/* ── If Discover is active, render the full DiscoverPanel instead of the normal UI ── */}
      {tab === "discover" ? (
        <DiscoverPanel
          onBack={() => setTab("chats")}
          onJoined={async (chatId) => {
            await refresh();
            onSelectChat(chatId);
            setTab("chats");
          }}
        />
      ) : (
        <>
          {/* Header */}
                <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-lg font-bold text-white">Connect</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddFriend(true)}
              className="flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-300 hover:bg-violet-500/20 transition"
              title="Add Friend"
            >
              <UserPlus className="w-3 h-3" />
              Add Friend
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition"
              title="New Group"
            >
              <Users className="w-3 h-3" />
              New Group
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Chat with friends, classmates and Xentra users
        </p>
      </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people, groups…"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 border-b border-slate-800">
            <TabButton active={tab === "chats"} onClick={() => setTab("chats")} label="Chats" count={directChats.length} />
            <TabButton active={tab === "friends"} onClick={() => setTab("friends")} label="Friends" count={friends.length} />
            <TabButton active={tab === "groups"} onClick={() => setTab("groups")} label="Groups" count={groupChats.length} />
            <TabButton active={tab === "discover"} onClick={() => setTab("discover")} label="Discover" count={0} />
            <TabButton active={tab === "requests"} onClick={() => setTab("requests")} label="Requests" count={requests.length} />
          </div>

                {/* Friends row */}
      <div className="border-b border-slate-800">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Friends
          </h3>
        </div>

        {friends.length === 0 ? (
          <div className="px-4 pb-3 text-[11px] text-slate-600">
            No friends yet — click Add Friend
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-thin">
            {friends.slice(0, 12).map((f) => {
              const name = f.full_name || f.email || "Friend";
              const firstName = name.split(" ")[0];
              const initial = name[0].toUpperCase();
              const color = colorFor(f.id);

              return (
                <button
                  key={f.id}
                  onClick={async () => {
                    try {
                      const { createDirectChat } = await import("@/lib/chat-api");
                      const chat = await createDirectChat(f.user_id);
                      await refresh();
                      onSelectChat(chat.id);
                    } catch (e) {
                      console.error("Failed to open chat:", e);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                  title={name}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-900 group-hover:ring-violet-500/50 transition`}
                    >
                      {initial}
                    </div>
                    {/* online dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-[56px] truncate group-hover:text-slate-200 transition">
                    {firstName}
                  </span>
                </button>
              );
            })}

            {friends.length > 12 && (
              <button
                onClick={() => setTab("friends")}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
                title="View all friends"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-medium group-hover:border-violet-500/50 group-hover:text-violet-300 transition">
                  +{friends.length - 12}
                </div>
                <span className="text-[10px] text-slate-500">more</span>
              </button>
            )}
          </div>
        )}
      </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
              </div>
            ) : tab === "chats" ? (
              directChats.length === 0 ? (
                <EmptyTab
                  icon={<MessageSquare className="w-5 h-5 text-slate-500" />}
                  text="No chats yet. Go to the Friends tab to start one."
                />
              ) : (
                directChats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    currentUserId={currentUser?.id || ""}
                    active={selectedChatId === chat.id}
                    unreadCount={unread[chat.id] || 0}
                    onClick={() => onSelectChat(chat.id)}
                  />
                ))
              )
            ) : tab === "friends" ? (
              friends.length === 0 ? (
                <EmptyTab
                  icon={<UserPlus className="w-5 h-5 text-slate-500" />}
                  text="No friends yet. Add one to start."
                />
              ) : (
                friends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    onStartChat={async () => {
                      try {
                        const { createDirectChat } = await import("@/lib/chat-api");
                        const chat = await createDirectChat(friend.user_id);
                        await refresh();
                        onSelectChat(chat.id);
                      } catch (e) {
                        console.error("Failed to create chat:", e);
                      }
                    }}
                  />
                ))
              )
            ) : tab === "groups" ? (
              groupChats.length === 0 ? (
                <EmptyTab
                  icon={<Users className="w-5 h-5 text-slate-500" />}
                  text="No groups yet. Create one above."
                />
              ) : (
                groupChats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    currentUserId={currentUser?.id || ""}
                    active={selectedChatId === chat.id}
                    unreadCount={unread[chat.id] || 0}
                    onClick={() => onSelectChat(chat.id)}
                  />
                ))
              )
            ) : requests.length === 0 ? (
              <EmptyTab
                icon={<UserPlus className="w-5 h-5 text-slate-500" />}
                text="No pending requests."
              />
            ) : (
              requests.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  onAccept={() => handleAccept(req.id)}
                  onDecline={() => handleDecline(req.id)}
                />
              ))
            )}
          </div>

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
              onCreated={async (chatId) => {
                await refresh();
                onSelectChat(chatId);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
        active
          ? "bg-violet-500/20 text-violet-300"
          : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-violet-500/30 text-violet-200" : "bg-slate-800 text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyTab({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center py-10 px-4">
      {icon}
      <span className="text-xs text-slate-600">{text}</span>
    </div>
  );
}

function ChatRow({
  chat,
  currentUserId,
  active,
  unreadCount,
  onClick,
}: {
  chat: Chat;
  currentUserId: string;
  active: boolean;
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

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg p-2 transition text-left ${
        active ? "bg-slate-800/80 ring-1 ring-violet-500/40" : "hover:bg-slate-900"
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm`}
        >
          {chat.type === "group" ? <Users className="w-5 h-5" /> : initial}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${active ? "text-white" : "text-slate-200"}`}>
            {name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {time && <span className="text-[10px] text-slate-500">{time}</span>}
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
        <div
          className={`text-xs truncate mt-0.5 ${
            unreadCount > 0 ? "text-slate-300 font-medium" : "text-slate-500"
          }`}
        >
          {preview}
        </div>
      </div>
    </button>
  );
}

function FriendRow({
  friend,
  onStartChat,
}: {
  friend: { id: string; user_id: string; full_name: string | null; email: string | null };
  onStartChat: () => void;
}) {
  const name = friend.full_name || friend.email || "Unknown";
  const initial = (name[0] || "?").toUpperCase();
  const color = colorFor(friend.id);

  return (
    <button
      onClick={onStartChat}
      className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900 transition text-left group"
    >
      <div
        className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm shrink-0`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-200 truncate">{name}</div>
        <div className="text-[10px] text-slate-500 truncate">{friend.email}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition text-violet-400 text-[10px] font-medium pr-2">
        Start chat →
      </div>
    </button>
  );
}

function RequestRow({ request, onAccept, onDecline }: any) {
  const name = request.other_user_name || request.other_user_email || "Unknown";
  const initial = (name[0] || "?").toUpperCase();
  const color = colorFor(request.id);

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900 transition">
      <div
        className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold text-sm shrink-0`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-200 truncate">{name}</div>
        <div className="text-[10px] text-slate-500">wants to be friends</div>
      </div>
      <button
        onClick={onAccept}
        className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition"
        title="Accept"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDecline}
        className="w-7 h-7 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center text-slate-400 hover:text-white transition"
        title="Decline"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}