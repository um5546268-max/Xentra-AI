"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Store = {
  query: string;
  results: any[];
  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  setResults: (r: any[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  clear: () => void;
};

export const useMapsStore = create<Store>()(
  persist(
    (set) => ({
      query: "",
      results: [],
      loading: false,
      error: null,
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clear: () => set({ query: "", results: [], error: null, loading: false }),
    }),
    { name: "xentra-maps-store" }
  )
);