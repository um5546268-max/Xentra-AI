"use client";

import { create } from "zustand";
import { getUnreadSummary } from "./chat-api";

type UnreadState = {
  total: number;
  byChat: Record<string, number>;
  lastFetch: number;
  loading: boolean;
  fetch: () => Promise<void>;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useUnreadStore = create<UnreadState>((set, get) => ({
  total: 0,
  byChat: {},
  lastFetch: 0,
  loading: false,

  fetch: async () => {
    const now = Date.now();
    // Dedupe: skip if fetched in the last 10 seconds
    if (now - get().lastFetch < 10_000) return;

    set({ loading: true });
    try {
      const items = await getUnreadSummary();
      const byChat: Record<string, number> = {};
      let total = 0;
      for (const item of items) {
        byChat[item.chat_id] = item.unread;
        total += item.unread;
      }
      set({ byChat, total, lastFetch: now, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

/** Start a single global poll — called once from the app layout. */
export function startGlobalUnreadPoll() {
  if (pollTimer) return; // already running
  const store = useUnreadStore.getState();
  store.fetch();
  pollTimer = setInterval(() => {
    useUnreadStore.getState().fetch();
  }, 30_000); // every 30s instead of 5-8s
}

export function stopGlobalUnreadPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}