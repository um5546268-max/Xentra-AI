import api from "./api";

export type Permission = {
  key: string;
  scope: string;
  tier: "low" | "medium" | "high";
  label: string;
  description: string;
  enabled: boolean;
};

export type PermissionListResponse = {
  count: number;
  permissions: Permission[];
  summary: {
    total: number;
    by_tier: {
      low: { on: number; off: number };
      medium: { on: number; off: number };
      high: { on: number; off: number };
    };
  };
};

export type PermissionUpdate = {
  key: string;
  enabled: boolean;
};

export const listPermissions = async (): Promise<PermissionListResponse> => {
  const res = await api.get("/api/permissions");
  return res.data;
};

export const updatePermissions = async (
  updates: PermissionUpdate[]
): Promise<{ updated: number }> => {
  const res = await api.patch("/api/permissions", { updates });
  return res.data;
};

export const resetPermissions = async (): Promise<{ reset: number }> => {
  const res = await api.post("/api/permissions/reset");
  return res.data;
};

export const checkPermission = async (
  key: string
): Promise<{ key: string; allowed: boolean; scope: string; tier: string; label: string }> => {
  const res = await api.get("/api/permissions/check", { params: { key } });
  return res.data;
};

// ----- Helpers -----

export const tierMeta = (tier: string) => {
  switch (tier) {
    case "low":
      return {
        emoji: "🟢",
        label: "Low risk",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/30",
      };
    case "medium":
      return {
        emoji: "🟡",
        label: "Medium risk",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/30",
      };
    case "high":
      return {
        emoji: "🔴",
        label: "High risk",
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
      };
    default:
      return {
        emoji: "⚪",
        label: tier,
        color: "text-slate-400",
        bg: "bg-slate-500/10 border-slate-500/30",
      };
  }
};

export const scopeLabel = (scope: string): string => {
  const map: Record<string, string> = {
    browser: "🌐 Browser",
    files: "📁 Files",
    code: "💻 Code",
    media: "🎵 Media",
    shopping: "🛒 Shopping",
    maps: "🗺️ Maps",
    email: "📧 Email",
    tasks: "📋 Tasks",
    automation: "⚙️ Automation",
    memory: "🧠 Memory",
    integrations: "🔌 Integrations",
    images: "🎨 Images",
    voice: "🎙️ Voice",
  };
  return map[scope] || scope;
};