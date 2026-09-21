"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
} from "lucide-react";
import {
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
  Integration,
} from "@/lib/integrations";
import { BrandIcon } from "./BrandIcon";

export function AccountsSection() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listIntegrations();
      console.log("[integrations] raw response:", data);
      setItems(data);
    } catch (e: any) {
      console.error("[integrations] load failed:", e);
      setError(e?.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = async (provider: string) => {
    setBusy(provider);
    try {
      const { url } = await connectIntegration(provider);
      if (url) window.location.href = url;
      else await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${provider}?`)) return;
    setBusy(provider);
    try {
      await disconnectIntegration(provider);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const connected = items.filter((i) => i.connected).length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 hover:bg-slate-900/60 transition">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <Plug className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-100">
              Connected Accounts
            </div>
            <div className="text-xs text-slate-500">
              {loading
                ? "Loading…"
                : `${connected} of ${items.length} connected`}
            </div>
          </div>
        </button>

        <button
          onClick={load}
          disabled={loading}
          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition disabled:opacity-40 shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/60">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-red-400">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No integrations available
            </div>
          ) : (
            items.map((item, idx) => {
              // Robust field fallbacks for whatever the backend sends
              const provider =
                item.provider ?? (item as any).key ?? `item-${idx}`;
              const displayName =
                item.name ?? (item as any).label ?? capitalize(provider);
              const iconKey =
                item.icon ?? (item as any).logo ?? provider;
              const description =
                item.description ?? (item as any).desc ?? "";

              return (
                <div
                  key={provider}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-900/40 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    <BrandIcon name={iconKey} size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {displayName}
                      </span>
                      {item.connected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5" />
                          CONNECTED
                        </span>
                      )}
                      {!item.enabled && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 shrink-0">
                          DISABLED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.account_email || item.account_name || description}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.connected ? (
                      <button
                        onClick={() => handleDisconnect(provider)}
                        disabled={busy === provider}
                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 rounded-lg px-2.5 py-1.5 transition disabled:opacity-40"
                      >
                        {busy === provider ? "…" : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(provider)}
                        disabled={busy === provider || !item.enabled}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg px-3 py-1.5 transition disabled:opacity-40"
                      >
                        {busy === provider ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3 h-3" />
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}