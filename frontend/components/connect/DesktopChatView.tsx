"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DesktopChatView({ chatId }: { chatId: string }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the connect page with the chat selected
    router.replace(`/app/connect?chat=${chatId}`);
  }, [chatId, router]);

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}