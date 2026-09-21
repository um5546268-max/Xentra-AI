"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShoppingCompareResponse } from "@/lib/shopping";

type Store = {
  query: string;
  result: ShoppingCompareResponse | null;
  elapsed: number;
  loading: boolean;
  setQuery: (q: string) => void;
  setResult: (r: ShoppingCompareResponse | null) => void;
  setElapsed: (n: number) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
};

export const useShoppingStore = create<Store>()(
  persist(
    (set) => ({
      query: "",
      result: null,
      elapsed: 0,
      loading: false,

      setQuery: (query) => set({ query }),
      setResult: (result) => set({ result }),
      setElapsed: (elapsed) => set({ elapsed }),
      setLoading: (loading) => set({ loading }),

      clear: () =>
        set({ query: "", result: null, elapsed: 0, loading: false }),
    }),
    { name: "xentra-shopping-store" }
  )
);