import { create } from "zustand";

type Theme = "dark" | "light";

type ThemeState = {
  theme: Theme;
  toggle: () => void;
  load: () => void;
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "dark",

  load: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("xentra_theme") as Theme | null;
    if (stored) {
      set({ theme: stored });
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  },

  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    localStorage.setItem("xentra_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  },
}));