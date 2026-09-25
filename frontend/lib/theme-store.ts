"use client";

import { create } from "zustand";

type Theme = "dark" | "light";

type ThemeState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  loadTheme: () => void;
};

const STORAGE_KEY = "xentra_theme";

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "dark",

  loadTheme: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored || "dark";
    set({ theme: initial });
    applyTheme(initial);
  },

  setTheme: (t) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, t);
    }
    set({ theme: t });
    applyTheme(t);
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}