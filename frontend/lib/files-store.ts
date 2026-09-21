"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Store = {
  query: string;
  results: any[];
  loading: boolean;
  setQuery: (q: string) => void;
  setResults: (r: any[]) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
};

export const useFilesStore = create<Store>()(
  persist(
    (set) => ({
      query: "",
      results: [],
      loading: false,
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
      clear: () => set({ query: "", results: [], loading: false }),
    }),
    { name: "xentra-files-store" }
  )
);