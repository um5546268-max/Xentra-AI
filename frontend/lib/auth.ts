import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  plan: "free" | "pro" | "ultimate" | string;
  emergency_stop?: boolean;
  created_at: string;
  avatar_url?: string | null;
  display_name?: string | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isGuest: boolean;

  signup: (email: string, password: string, fullName: string, remember?: boolean) => Promise<boolean>;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => void;
  googleSignIn: (credential: string, remember?: boolean) => Promise<boolean>;
  githubSignIn: (code: string, remember?: boolean) => Promise<boolean>;
  continueAsGuest: () => void;
  updateProfile: (patch: {
    full_name?: string;
    avatar_url?: string | null;
  }) => Promise<boolean>;
};

// ─── Token storage helpers (localStorage vs sessionStorage) ─────────────
const TOKEN_KEY = "xentra_token";
const USER_KEY = "xentra_user";
const GUEST_KEY = "xentra_guest";
const REMEMBER_KEY = "xentra_remember"; // "true" if user chose Stay logged in

const saveAuth = (token: string, user: User, remember: boolean) => {
  if (typeof window === "undefined") return;
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  // Clean the "other" storage to avoid duplicates
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);

  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
};

const readAuth = (): { token: string | null; user: User | null; remember: boolean } => {
  if (typeof window === "undefined") return { token: null, user: null, remember: false };

  // Prefer localStorage (remembered), fall back to sessionStorage
  const token =
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const userRaw =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  const remember = localStorage.getItem(REMEMBER_KEY) === "true";

  let user: User | null = null;
  if (userRaw) {
    try { user = JSON.parse(userRaw); } catch { user = null; }
  }
  return { token, user, remember };
};

const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
};

// ─── Store ──────────────────────────────────────────────────────────────
export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  isGuest: false,

  loadFromStorage: () => {
    const { token, user } = readAuth();
    const guest = typeof window !== "undefined"
      ? localStorage.getItem(GUEST_KEY) === "true"
      : false;
    if (token && user) {
      set({ token, user, isGuest: guest });
    }
  },

  updateProfile: async (patch) => {
    set({ loading: true, error: null });
    try {
      const { token } = readAuth();
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "Update failed" });
        return false;
      }
      // Persist to whichever store we're using
      const remember = localStorage.getItem(REMEMBER_KEY) === "true";
      const store = remember ? localStorage : sessionStorage;
      store.setItem(USER_KEY, JSON.stringify(data));
      set({ user: data, loading: false, error: null });
      return true;
    } catch {
      set({ loading: false, error: "Network error" });
      return false;
    }
  },

  continueAsGuest: () => {
    if (typeof window === "undefined") return;
    const guestUser: User = {
      id: "guest",
      email: "guest@xentra.ai",
      full_name: "Guest User",
      is_admin: false,
      plan: "free",
      created_at: new Date().toISOString(),
      avatar_url: null,
    };
    localStorage.setItem(GUEST_KEY, "true");
    localStorage.setItem(TOKEN_KEY, "guest-token");
    localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
    set({ user: guestUser, token: "guest-token", isGuest: true, error: null });
  },

  signup: async (email, password, fullName, remember = false) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "Signup failed" });
        return false;
      }

      localStorage.removeItem(GUEST_KEY);
      saveAuth(data.access_token, data.user, remember);
      set({ user: data.user, token: data.access_token, loading: false, error: null, isGuest: false });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

  githubSignIn: async (code, remember = true) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "GitHub sign-in failed" });
        return false;
      }
      localStorage.removeItem(GUEST_KEY);
      // OAuth: default to remembered (user clicked a button, expects to stay in)
      saveAuth(data.access_token, data.user, remember);
      set({ user: data.user, token: data.access_token, loading: false, error: null, isGuest: false });
      return true;
    } catch {
      set({ loading: false, error: "Network error" });
      return false;
    }
  },

  login: async (email, password, remember = false) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "Login failed" });
        return false;
      }

      localStorage.removeItem(GUEST_KEY);
      saveAuth(data.access_token, data.user, remember);
      set({ user: data.user, token: data.access_token, loading: false, error: null, isGuest: false });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

  googleSignIn: async (credential, remember = true) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "Google sign-in failed" });
        return false;
      }

      localStorage.removeItem(GUEST_KEY);
      saveAuth(data.access_token, data.user, remember);
      set({ user: data.user, token: data.access_token, loading: false, error: null, isGuest: false });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      // Clean any other xentra-* cached data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === TOKEN_KEY || key === USER_KEY) continue;
        if (key.startsWith("xentra-") || key.startsWith("xentra_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
    clearAuth();
    set({ user: null, token: null, error: null, isGuest: false });
  },
}));