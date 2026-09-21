"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Store = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  commandCenterCollapsed: boolean;
  toggleCommandCenter: () => void;
  setCommandCenterCollapsed: (v: boolean) => void;
};

export const useShellStore = create<Store>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      commandCenterCollapsed: false,
      toggleCommandCenter: () =>
        set((s) => ({
          commandCenterCollapsed: !s.commandCenterCollapsed,
        })),
      setCommandCenterCollapsed: (commandCenterCollapsed) =>
        set({ commandCenterCollapsed }),
    }),
    { name: "xentra-shell-store" }
  )
);