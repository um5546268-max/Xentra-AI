"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  CheckCircle2,
  Loader2,
  Terminal,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  listLanguages,
  installLanguage,
  Language,
} from "@/lib/languages";

export function LanguagesPanel() {
  const [langs, setLangs] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setLangs(await listLanguages());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const handleInstall = async (key: string) => {
    setInstallingKey(key);
    setLogLines([`$ Installing ${key}…`]);

    try {
      await installLanguage(key, (evt) => {
        if (evt.status === "log") {
          setLogLines((prev) => [...prev, evt.line].slice(-200));
        } else if (evt.status === "done") {
          setLogLines((prev) => [
            ...prev,
            evt.installed
              ? `✓ ${key} installed — ${evt.version}`
              : `✗ ${key} not detected after install`,
          ]);
        } else if (evt.status === "error") {
          setLogLines((prev) => [...prev, `✗ ${evt.message}`]);
        } else if (evt.status === "starting") {
          setLogLines((prev) => [...prev, `$ ${evt.command}`]);
        }
      });
    } catch (err: any) {
      setLogLines((prev) => [...prev, `✗ ${err?.message}`]);
    } finally {
      setInstallingKey(null);
      await load(); // Refresh installed status
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-200">
            Language Toolchains
          </div>
          <div className="text-xs text-slate-500">
            Install compilers & runtimes to enable more languages in the Code Workspace.
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {langs.map((l) => (
          <div
            key={l.key}
            className={`rounded-xl border p-4 space-y-3 transition ${
              l.installed
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {l.installed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="font-medium text-slate-100 truncate">
                    {l.label}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {l.description}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {l.exts.map((e) => (
                    <span
                      key={e}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-400"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                {l.installed && l.version && (
                  <div className="text-[11px] text-emerald-400 font-mono mt-2 truncate">
                    {l.version}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {l.installed ? (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-2 py-0.5">
                    INSTALLED
                  </span>
                ) : (
                  <button
                    onClick={() => handleInstall(l.key)}
                    disabled={installingKey !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                  >
                    {installingKey === l.key ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Installing
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        Install
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {!l.installed && l.install_command && (
              <div className="rounded bg-slate-950 border border-slate-800 px-2 py-1.5">
                <div className="text-[10px] text-slate-500 mb-0.5">
                  Command
                </div>
                <code className="text-[10px] text-slate-400 font-mono break-all">
                  {l.install_command}
                </code>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Install log */}
      {logLines.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Terminal className="w-3.5 h-3.5" />
            Install log
          </div>
          <div
            ref={logRef}
            className="max-h-64 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-0.5"
          >
            {logLines.map((l, i) => (
              <div
                key={i}
                className={
                  l.startsWith("✓")
                    ? "text-emerald-400"
                    : l.startsWith("✗")
                    ? "text-red-400"
                    : l.startsWith("$")
                    ? "text-violet-400"
                    : ""
                }
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for winget** */}
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2 text-xs text-yellow-300">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div>
          <strong>Windows:</strong> some installers use <code>winget</code>.
          If installs fail, install "App Installer" from the Microsoft Store,
          then refresh.
        </div>
      </div>
    </div>
  );
}