"use client";

import ChatWindowPanel from "@/components/connect/ChatWindowPanel";

export default function MobileChatView({ chatId }: { chatId: string }) {
  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Chat panel — takes all available height minus bottom nav */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatWindowPanel chatId={chatId} />
      </div>

      {/* Spacer for fixed bottom nav — mobile only */}
      <div
        className="shrink-0"
        style={{ height: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      />
    </div>
  );
}