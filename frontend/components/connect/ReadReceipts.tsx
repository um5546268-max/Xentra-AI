"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { getMessageReaders, ReadStatus } from "@/lib/chat-api";
import { usePolling } from "@/lib/usePolling";
import Avatar from "@/components/Avatar";

const READ_POLL_MS = 4000;

export default function ReadReceipts({
  chatId,
  messageId,
  isGroup,
  isMine,
}: {
  chatId: string;
  messageId: string;
  isGroup: boolean;
  isMine: boolean;
}) {
  const [status, setStatus] = useState<ReadStatus | null>(null);
  const [showList, setShowList] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isGroup || !isMine) return;
    try {
      const s = await getMessageReaders(chatId, messageId);
      setStatus(s);
    } catch {
      // silently fail
    }
  }, [chatId, messageId, isGroup, isMine]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ✅ Poll for updates every 4 seconds
  usePolling(fetchStatus, READ_POLL_MS, isGroup && isMine);

  if (!isGroup || !isMine) return null;
  if (!status) return null;
  if (status.total_members === 0) return null;

  const allRead = status.read_count >= status.total_members;
  const someRead = status.read_count > 0 && !allRead;

  return (
    <>
      <button
        onClick={() => setShowList(true)}
        className={`text-[10px] mt-0.5 flex items-center gap-1 hover:underline transition ${
          allRead
            ? "text-emerald-300"
            : someRead
            ? "text-slate-400"
            : "text-slate-500"
        }`}
        title="See who read this"
      >
        {allRead ? (
          <CheckCheck className="w-3 h-3" />
        ) : someRead ? (
          <CheckCheck className="w-3 h-3" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        {allRead
          ? "Read by all"
          : `Read by ${status.read_count} of ${status.total_members}`}
      </button>

      {showList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowList(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-violet-500/40 bg-slate-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Read receipts
                </h3>
                <p className="text-[10px] text-slate-500">
                  {status.read_count} of {status.total_members} read
                </p>
              </div>
              <button
                onClick={() => setShowList(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {status.readers.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">
                Nobody has read this yet.
              </div>
            ) : (
              <div className="space-y-2">
                {status.readers.map((r) => {
                  const name = r.full_name || r.email || "Unknown";
                  const time = r.read_at
                    ? new Date(r.read_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={r.user_id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900 transition"
                    >
                      <Avatar
                        src={r.avatar_url}
                        name={r.full_name}
                        email={r.email}
                        size={32}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 truncate">
                          {name}
                        </div>
                        {time && (
                          <div className="text-[10px] text-slate-500">
                            at {time}
                          </div>
                        )}
                      </div>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}