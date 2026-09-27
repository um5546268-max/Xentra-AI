"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function AuthLoader() {
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();

    // Also re-hydrate if the tab regains focus (e.g. returning from OAuth)
    const onFocus = () => loadFromStorage();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadFromStorage]);

  return null;
}