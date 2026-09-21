"use client";

import { create } from "zustand";

export type LiveBee = {
  id: string;
  type: string;
  title: string;
  progress: number;
  status: string;
  stoppable: boolean;
};

type Store = {
  bees: LiveBee[];
  setBees: (b: LiveBee[]) => void;
  updateProgress: (map: Record<string, number>) => void;
  removeBee: (id: string) => void;
  clear: () => void;
};

export const useLiveBees = create<Store>((set) => ({
  bees: [],
  setBees: (bees) => set({ bees }),
  updateProgress: (map) =>
    set((s) => ({
      bees: s.bees.map((b) =>
        map[b.id] !== undefined ? { ...b, progress: map[b.id] } : b
      ),
    })),
  removeBee: (id) =>
    set((s) => ({ bees: s.bees.filter((b) => b.id !== id) })),
  clear: () => set({ bees: [] }),
}));