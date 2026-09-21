"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

type Store = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  load: () => void;
};

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export const useTheme = create<Store>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
      toggle: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
      },
      load: () => applyTheme(get().theme),
    }),
    { name: "xentra-theme" }
  )
);