import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  plan: "free" | "pro" | "ultimate" | string;   // 👈 ADD
  emergency_stop?: boolean;                     // 👈 ADD (optional)
  created_at: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  signup: (email: string, password: string, fullName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => void;
  googleSignIn: (credential: string) => Promise<boolean>;
  githubSignIn: (code: string) => Promise<boolean>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("xentra_token");
    const userRaw = localStorage.getItem("xentra_user");
    if (token && userRaw) {
      try {
        set({ token, user: JSON.parse(userRaw) });
      } catch {
        localStorage.removeItem("xentra_token");
        localStorage.removeItem("xentra_user");
      }
    }
  },

  signup: async (email, password, fullName) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ loading: false, error: data.detail || "Signup failed" });
        return false;
      }

      localStorage.setItem("xentra_token", data.access_token);
      localStorage.setItem("xentra_user", JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, loading: false, error: null });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

  githubSignIn: async (code) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.detail || "GitHub sign-in failed" });
        return false;
      }
      localStorage.setItem("xentra_token", data.access_token);
      localStorage.setItem("xentra_user", JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, loading: false, error: null });
      return true;
    } catch {
      set({ loading: false, error: "Network error" });
      return false;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ loading: false, error: data.detail || "Login failed" });
        return false;
      }

      localStorage.setItem("xentra_token", data.access_token);
      localStorage.setItem("xentra_user", JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, loading: false, error: null });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

    googleSignIn: async (credential) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ loading: false, error: data.detail || "Google sign-in failed" });
        return false;
      }

      localStorage.setItem("xentra_token", data.access_token);
      localStorage.setItem("xentra_user", JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, loading: false, error: null });
      return true;
    } catch {
      set({ loading: false, error: "Network error — is the backend running?" });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("xentra_token");
    localStorage.removeItem("xentra_user");
    set({ user: null, token: null, error: null });
  },
}));