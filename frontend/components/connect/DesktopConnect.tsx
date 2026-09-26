"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGuestGuard } from "@/lib/useGuestGuard";
import SignInRequiredModal from "@/components/SignInRequiredModal";
import ChatListPanel from "@/components/connect/ChatListPanel";
import ChatWindowPanel from "@/components/connect/ChatWindowPanel";
import ProfilePanel from "@/components/connect/ProfilePanel";

export default function DesktopConnect() {
  const { modalOpen, modalMessage, closeModal } = useGuestGuard();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get("chat");

  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialChatId
  );

  // Sync when the URL query param changes (e.g. navigating from mobile back to desktop)
  useEffect(() => {
    const id = searchParams.get("chat");
    if (id && id !== selectedChatId) {
      setSelectedChatId(id);
    }
  }, [searchParams, selectedChatId]);

  // Also update the URL when a chat is selected (for deep-linking)
  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    // Update URL without a full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("chat", id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="h-full flex bg-slate-950 overflow-hidden">
      <div className="w-80 shrink-0 border-r border-slate-800 overflow-hidden flex flex-col">
        <ChatListPanel
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {selectedChatId ? (
          <ChatWindowPanel chatId={selectedChatId} />
        ) : (
          <EmptyState />
        )}
      </div>

      {selectedChatId && (
        <div className="w-80 shrink-0 border-l border-slate-800 overflow-hidden flex flex-col">
          <ProfilePanel chatId={selectedChatId} />
        </div>
      )}

      <SignInRequiredModal
        open={modalOpen}
        onClose={closeModal}
        message={modalMessage}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div className="max-w-sm space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-violet-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-200">
          Welcome to Connect
        </h3>
        <p className="text-sm text-slate-500">
          Select a chat on the left or add a friend to start messaging.
        </p>
      </div>
    </div>
  );
}