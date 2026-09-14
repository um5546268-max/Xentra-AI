"use client";

import { use } from "react";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-slate-800 p-4">
        <div className="text-sm text-slate-500">Conversation</div>
        <div className="font-mono text-xs text-slate-400 truncate">{conversationId}</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="text-slate-500">
            This is where the AI chat will live.
          </div>
          <div className="text-xs text-slate-600">
            Phase 2 · Day 9 — streaming responses, message history, markdown
          </div>
        </div>
      </div>
    </div>
  );
}