"use client";

import ChatWindowPanel from "@/components/connect/ChatWindowPanel";

export default function MobileChatView({ chatId }: { chatId: string }) {
  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* ChatWindowPanel handles its own header with back button */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatWindowPanel chatId={chatId} />
      </div>

      {/* Spacer so input sits above the bottom nav */}
      <div
        className="shrink-0 md:hidden"
        style={{ height: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      />
    </div>
  );
}