"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Track = {
  id: string;
  title: string;
  artist?: string;
  image?: string | null;
  url?: string;
  uri?: string;
  source: "spotify" | "youtube" | "local";
  duration_ms?: number;
};

type Store = {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;

  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (ms: number) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
};

export const usePlayerStore = create<Store>()(
  persist(
    (set, get) => ({
      current: null,
      queue: [],
      playing: false,
      positionMs: 0,
      durationMs: 0,
      volume: 1.0,
      muted: false,

      play: (track, queue) =>
        set({
          current: track,
          queue: queue ?? get().queue,
          playing: true,
          positionMs: 0,
          durationMs: track.duration_ms ?? 0,
        }),

      pause: () => set({ playing: false }),
      resume: () => set({ playing: true }),

      stop: () =>
        set({
          current: null,
          playing: false,
          positionMs: 0,
          durationMs: 0,
        }),

      next: () => {
        const { queue, current } = get();
        if (!current || queue.length === 0) return;
        const idx = queue.findIndex((t) => t.id === current.id);
        const nextIdx = (idx + 1) % queue.length;
        const t = queue[nextIdx];
        set({
          current: t,
          playing: true,
          positionMs: 0,
          durationMs: t.duration_ms ?? 0,
        });
      },

      previous: () => {
        const { queue, current } = get();
        if (!current || queue.length === 0) return;
        const idx = queue.findIndex((t) => t.id === current.id);
        const prevIdx = (idx - 1 + queue.length) % queue.length;
        const t = queue[prevIdx];
        set({
          current: t,
          playing: true,
          positionMs: 0,
          durationMs: t.duration_ms ?? 0,
        });
      },

      seek: (ms) => set({ positionMs: ms }),
      setPosition: (ms) => set({ positionMs: ms }),
      setDuration: (ms) => set({ durationMs: ms }),

      setVolume: (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        set({ volume: clamped, muted: clamped === 0 ? get().muted : false });
      },

      toggleMute: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: "xentra-player-store",
      partialize: (state) => ({
        volume: state.volume,
        muted: state.muted,
      }),
    }
  )
);