"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatListPanel from "@/components/connect/ChatListPanel";
import ChatWindowPanel from "@/components/connect/ChatWindowPanel";
import ProfilePanel from "@/components/connect/ProfilePanel";

export default function DesktopChatView({ chatId }: { chatId: string }) {
  const router = useRouter();

  // Redirect to /app/connect with the chat preselected (avoids duplicate layout)
  useEffect(() => {
    router.replace(`/app/connect?chat=${chatId}`);
  }, [chatId, router]);

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}