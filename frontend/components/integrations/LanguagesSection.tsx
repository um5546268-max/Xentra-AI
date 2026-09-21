"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  CheckCircle2,
  Loader2,
  Terminal,
  AlertCircle,
  RefreshCw,
  Code2,
} from "lucide-react";
import {
  listLanguages,
  installLanguage,
  getInstallStatus,
  Language,
} from "@/lib/integrations";
import { BrandIcon } from "./BrandIcon";

export function LanguagesSection() {
  const [langs, setLangs] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listLanguages();
      setLangs([...data]); // spread forces a new array reference
    } catch (e) {
      console.error("[languages] load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const handleInstall = async (key: string) => {
    setInstallingKey(key);
    setLogLines([`$ Launching installer for ${key}…`]);

    try {
      const result = await installLanguage(key);
      setLogLines((prev) => [
        ...prev,
        (result && (result as any).message) ||
          "Installer launched. Check for a UAC prompt.",
        "→ An elevated PowerShell window should now be open.",
        "→ Click 'Yes' on the UAC prompt.",
        "→ Wait for the install to finish.",
        "→ This page will auto-detect when it's done.",
      ]);

      // Poll for install completion every 3s (up to 90s)
      let attempts = 0;
      const maxAttempts = 30;
      const POLL_MS = 3000;

      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await getInstallStatus(key);
          if (res.installed) {
            setLogLines((prev) => [
              ...prev,
              `✓ ${key} installed — ${res.version ?? "unknown version"}`,
            ]);
            clearInterval(poll);
            setInstallingKey(null);
            await load();
            return;
          }
          if (attempts >= maxAttempts) {
            setLogLines((prev) => [
              ...prev,
              `⚠ Couldn't detect install after 90s.`,
              `→ Click the ↻ Refresh button in the header.`,
              `→ If it still shows "Install", restart the backend.`,
            ]);
            clearInterval(poll);
            setInstallingKey(null);
          }
        } catch {
          // keep polling silently
        }
      }, POLL_MS);
    } catch (err: any) {
      setLogLines((prev) => [...prev, `✗ ${err?.message ?? "Install failed"}`]);
      setInstallingKey(null);
    }
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setLogLines((prev) => [
      ...prev,
      `$ Copied to clipboard: ${cmd}`,
      "→ Paste in an Administrator PowerShell if the auto-installer fails.",
    ]);
  };

  const installed = langs.filter((l) => l.installed).length;

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
          <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-100">
              Language Toolchains
            </div>
            <div className="text-xs text-slate-500">
              {loading
                ? "Loading…"
                : `${installed} of ${langs.length} installed`}
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
        <>
          <div className="border-t border-slate-800 divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : langs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No languages available
              </div>
            ) : (
              langs.map((l) => (
                <div
                  key={l.key}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-900/40 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    <BrandIcon name={l.key} size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {l.label}
                      </span>
                      {l.installed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-1.5 py-0.5 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          INSTALLED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {l.installed && l.version ? (
                        <code className="text-emerald-400">{l.version}</code>
                      ) : (
                        <>
                          {l.description}
                          {" · "}
                          <span className="font-mono text-slate-600">
                            {l.exts.join(" ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {!l.installed && (
                      <>
                        <button
                          onClick={() => handleCopyCommand(l.install_command)}
                          className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                          title="Copy install command"
                        >
                          Copy cmd
                        </button>
                        <button
                          onClick={() => handleInstall(l.key)}
                          disabled={installingKey !== null}
                          className="flex items-center gap-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg px-3 py-1.5 transition disabled:opacity-40"
                        >
                          {installingKey === l.key ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Installing…
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              Install
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Install log */}
          {logLines.length > 0 && (
            <div className="border-t border-slate-800 p-3 bg-slate-950/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Terminal className="w-3.5 h-3.5" />
                  Install log
                </div>
                <button
                  onClick={() => setLogLines([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              <div
                ref={logRef}
                className="max-h-64 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-0.5 bg-black/40 rounded p-2"
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
                        : l.startsWith("⚠")
                        ? "text-yellow-400"
                        : l.startsWith("→")
                        ? "text-slate-500"
                        : ""
                    }
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help footer */}
          <div className="border-t border-slate-800 px-4 py-3 flex items-start gap-2 text-[11px] text-yellow-300 bg-yellow-500/5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <strong>How installs work:</strong> clicking{" "}
              <em>Install</em> opens an elevated PowerShell window (UAC prompt).
              Approve it and the install runs there. This page auto-detects when
              it finishes.
              <br />
              <strong>If it fails:</strong> click <em>Copy cmd</em> and paste
              into an <strong>Administrator PowerShell</strong> manually. Then
              click Refresh.
              <br />
              <strong>After install:</strong> if the language still shows
              "Install", restart the backend so it reloads the system PATH.
            </div>
          </div>
        </>
      )}
    </div>
  );
}