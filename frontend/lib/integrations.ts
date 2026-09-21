import api from "./api";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
export type Integration = {
  provider: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  auth_type: string;
  connected: boolean;
  status: string;
  account_email: string | null;
  account_name: string | null;
  expires_at: string | null;
};

export type Language = {
  key: string;
  label: string;
  description: string;
  exts: string[];
  installed: boolean;
  path: string | null;
  version: string | null;
  install_command: string;
};

// ═══════════════════════════════════════════════════════════════
// Provider metadata — enriches the raw backend response
// ═══════════════════════════════════════════════════════════════
const PROVIDER_META: Record<
  string,
  { name: string; description: string; icon: string; enabled: boolean }
> = {
  google: {
    name: "Google",
    description: "Gmail, Calendar, Drive, YouTube",
    icon: "google",
    enabled: true,
  },
  github: {
    name: "GitHub",
    description: "Repositories, issues, pull requests",
    icon: "github",
    enabled: true,
  },
  spotify: {
    name: "Spotify",
    description: "Music playback and playlists",
    icon: "spotify",
    enabled: true,
  },
  youtube: {
    name: "YouTube",
    description: "Watch history and subscriptions",
    icon: "youtube",
    enabled: true,
  },
  notion: {
    name: "Notion",
    description: "Notes, docs, and databases",
    icon: "notion",
    enabled: false,
  },
  slack: {
    name: "Slack",
    description: "Team messages and channels",
    icon: "slack",
    enabled: false,
  },
  discord: {
    name: "Discord",
    description: "Servers and DMs",
    icon: "discord",
    enabled: false,
  },
};

// Every provider we always want to show in the UI — connected or not
const ALL_PROVIDERS = [
  "google",
  "github",
  "spotify",
  "youtube",
  "notion",
];

// ═══════════════════════════════════════════════════════════════
// Normalizer — map raw backend rows into our UI shape
// ═══════════════════════════════════════════════════════════════
function normalize(raw: any, provider: string): Integration {
  const meta = PROVIDER_META[provider] ?? {
    name: provider,
    description: "",
    icon: provider,
    enabled: true,
  };

  const status: string = raw?.status ?? "disconnected";
  const connected = status === "connected";

  return {
    provider,
    name: meta.name,
    description: meta.description,
    icon: meta.icon,
    enabled: meta.enabled,
    auth_type: "oauth2",
    connected,
    status,
    account_email: raw?.account_email ?? null,
    account_name: raw?.account_name ?? null,
    expires_at: raw?.expires_at ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// Cache-busting helper — forces fresh GET requests
// ═══════════════════════════════════════════════════════════════
const noCacheParams = () => ({ _t: Date.now() });
const noCacheHeaders = { "Cache-Control": "no-cache" };

// ═══════════════════════════════════════════════════════════════
// Accounts API
// ═══════════════════════════════════════════════════════════════
export const listIntegrations = async (): Promise<Integration[]> => {
  const res = await api.get("/api/integrations", {
    params: noCacheParams(),
    headers: noCacheHeaders,
  });

  // Backend may return an array, { integrations: [...] }, or { connected: [...] }
  const raw: any[] = Array.isArray(res.data)
    ? res.data
    : res.data.integrations ?? res.data.connected ?? [];

  // Build a lookup from the user's connected rows
  const byProvider: Record<string, any> = {};
  for (const row of raw) {
    if (row?.provider) byProvider[row.provider] = row;
  }

  // Return ALL known providers — connected OR not — enriched with meta
  return ALL_PROVIDERS.map((p) => normalize(byProvider[p], p));
};

export const connectIntegration = async (
  provider: string
): Promise<{ url: string | null }> => {
  const res = await api.post(`/api/integrations/${provider}/connect`);
  return { url: res.data?.url ?? res.data?.auth_url ?? null };
};

export const disconnectIntegration = async (provider: string): Promise<void> => {
  await api.delete(`/api/integrations/${provider}`);
};

// ═══════════════════════════════════════════════════════════════
// Languages API
// ═══════════════════════════════════════════════════════════════
export const listLanguages = async (): Promise<Language[]> => {
  const res = await api.get("/api/integrations/languages", {
    params: noCacheParams(),
    headers: noCacheHeaders,
  });
  return res.data.languages ?? [];
};

/**
 * Launch an install. On Windows the backend opens an elevated PowerShell
 * window (UAC prompt) — this call returns immediately with a status.
 *
 * Returns: { status: "launched" | "already_installing", message?: string }
 */
export const installLanguage = async (
  key: string
): Promise<{ status: string; message?: string }> => {
  const res = await api.post("/api/integrations/languages/install", { key });
  return res.data;
};

/**
 * Poll this after installLanguage() to check when the elevated install
 * finished. Returns fresh detection + in-memory install state.
 */
export const getInstallStatus = async (
  key: string
): Promise<{
  key: string;
  installed: boolean;
  version: string | null;
  install_state: {
    status: "installing" | "done" | "error";
    startedAt: number;
    message?: string;
  } | null;
}> => {
  const res = await api.get(`/api/integrations/languages/status/${key}`, {
    params: noCacheParams(),
    headers: noCacheHeaders,
  });
  return res.data;
};