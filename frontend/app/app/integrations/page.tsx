"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  Link2,
  AlertCircle,
} from "lucide-react";
import {
  getCatalog,
  getUserIntegrations,
  getConnectUrl,
  disconnectIntegration,
  IntegrationCatalogItem,
  UserIntegration,
} from "@/lib/integrations";

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected");

  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [connected, setConnected] = useState<UserIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, cons] = await Promise.all([
        getCatalog(),
        getUserIntegrations(),
      ]);
      setCatalog(cat.items);
      setConnected(cons);
    } catch (e: any) {
      setError(e?.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    setError(null);
    try {
      const url = await getConnectUrl(provider);
      window.location.href = url;
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to connect");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${provider}?`)) return;
    setError(null);
    try {
      await disconnectIntegration(provider);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to disconnect");
    }
  };

  const connectedProviders = new Map(
    connected.map((c) => [c.provider, c])
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="text-sm text-slate-500">
              Connect services so Xentra can act inside them.
            </p>
          </div>
        </div>

        {/* Just-connected banner */}
        {justConnected && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Connected <strong>{justConnected}</strong> successfully.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-600 py-16 text-sm">
            Loading integrations…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalog.map((item) => {
              const userInt = connectedProviders.get(item.provider);
              const isConnected = !!userInt;
              const isConnecting = connecting === item.provider;

              return (
                <div
                  key={item.provider}
                  className={`rounded-2xl border bg-slate-900/40 p-4 space-y-3 transition ${
                    isConnected
                      ? "border-emerald-500/30"
                      : "border-slate-800"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProviderIcon provider={item.provider} />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {isConnected && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5">
                        <Check className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Account info */}
                  {isConnected && userInt && (
                    <div className="rounded-lg bg-slate-950/40 px-3 py-2 text-xs text-slate-400 space-y-0.5">
                      {userInt.account_name && (
                        <div className="truncate">
                          <span className="text-slate-500">Account:</span>{" "}
                          {userInt.account_name}
                        </div>
                      )}
                      {userInt.account_email && (
                        <div className="truncate">
                          <span className="text-slate-500">Email:</span>{" "}
                          {userInt.account_email}
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-slate-500">Since:</span>{" "}
                        {new Date(userInt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(item.provider)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-red-500/50 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    ) : !item.enabled ? (
                      <button
                        disabled
                        className="flex-1 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-600 cursor-not-allowed"
                      >
                        Coming soon
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(item.provider)}
                        disabled={isConnecting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium hover:bg-violet-500 disabled:opacity-40 transition"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  // Simple color-coded badge — swap for real SVGs later
  const config: Record<string, { bg: string; text: string; label: string }> = {
    google: { bg: "bg-red-500/20", text: "text-red-300", label: "G" },
    github: { bg: "bg-slate-500/20", text: "text-slate-200", label: "GH" },
    spotify: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "SP" },
    notion: { bg: "bg-slate-500/20", text: "text-slate-200", label: "N" },
  };
  const c = config[provider] || config.notion;
  return (
    <div
      className={`w-10 h-10 rounded-lg ${c.bg} ${c.text} flex items-center justify-center font-bold text-sm shrink-0`}
    >
      {c.label}
    </div>
  );
}