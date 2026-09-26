"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const MobileChatView = dynamic(
  () => import("@/components/mobile/MobileChatView"),
  { ssr: false }
);

const DesktopChatView = dynamic(
  () => import("@/components/connect/DesktopChatView"),
  { ssr: false }
);

export default function ConnectChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isMobile ? (
    <MobileChatView chatId={chatId} />
  ) : (
    <DesktopChatView chatId={chatId} />
  );
}