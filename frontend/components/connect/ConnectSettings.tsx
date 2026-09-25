"use client";

import { useEffect, useState } from "react";
import {
  X, Bell, Volume2, Eye, Languages, Type, Image as ImageIcon,
  ShieldOff, Trash2, Check,
} from "lucide-react";
import {
  getBrowserNotifPrefs,
  setBrowserNotifPrefs,
  getBrowserNotifPermission,
  requestBrowserNotifPermission,
  isBrowserNotifSupported,
  BrowserNotifPrefs,
} from "@/lib/browser-notifications";
import { listMyBlocks, unblockUser, BlockedUser } from "@/lib/chat-api";

type WallpaperChoice = "nebula" | "minimal" | "none";

export type ConnectSettingsState = {
  wallpaper: WallpaperChoice;
  fontSize: "sm" | "base" | "lg";
  defaultLang: string;
};

const SETTINGS_KEY = "xentra_connect_settings";

export function loadConnectSettings(): ConnectSettingsState {
  if (typeof window === "undefined") {
    return { wallpaper: "nebula", fontSize: "sm", defaultLang: "English" };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw)
      return { wallpaper: "nebula", fontSize: "sm", defaultLang: "English" };
    return {
      wallpaper: "nebula",
      fontSize: "sm",
      defaultLang: "English",
      ...JSON.parse(raw),
    };
  } catch {
    return { wallpaper: "nebula", fontSize: "sm", defaultLang: "English" };
  }
}

export function saveConnectSettings(patch: Partial<ConnectSettingsState>) {
  const current = loadConnectSettings();
  const next = { ...current, ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }
  return next;
}

export default function ConnectSettings({
  onClose,
}: {
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ConnectSettingsState>(
    loadConnectSettings()
  );
  const [notifPrefs, setNotifPrefs] = useState<BrowserNotifPrefs | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [notifSupported, setNotifSupported] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  useEffect(() => {
    setNotifPrefs(getBrowserNotifPrefs());
    setNotifPermission(getBrowserNotifPermission());
    setNotifSupported(isBrowserNotifSupported());
    listMyBlocks()
      .then(setBlocked)
      .catch(() => setBlocked([]))
      .finally(() => setLoadingBlocked(false));
  }, []);

  const updateSetting = <K extends keyof ConnectSettingsState>(
    key: K,
    value: ConnectSettingsState[K]
  ) => {
    const next = saveConnectSettings({ [key]: value } as any);
    setSettings(next);
    // Dispatch custom event so ChatWindowPanel can react (wallpaper/font)
    window.dispatchEvent(
      new CustomEvent("xentra:connect-settings-changed", { detail: next })
    );
  };

  const updateNotifPref = (patch: Partial<BrowserNotifPrefs>) => {
    const next = setBrowserNotifPrefs(patch);
    setNotifPrefs(next);
  };

  const handleRequestPermission = async () => {
    const p = await requestBrowserNotifPermission();
    setNotifPermission(p);
  };

  const handleUnblock = async (userId: string) => {
    try {
      await unblockUser(userId);
      setBlocked((prev) => prev.filter((b) => b.user_id !== userId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 shadow-2xl shadow-violet-500/20 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Connect Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preferences for chats and messages
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Notifications */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Notifications
              </h3>
            </div>

            {!notifSupported ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
                Notifications not supported in this browser.
              </div>
            ) : notifPermission === "denied" ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                Notifications blocked in browser settings.
              </div>
            ) : notifPermission !== "granted" ? (
              <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 space-y-2">
                <div className="text-xs text-slate-300">
                  Enable desktop notifications for new messages.
                </div>
                <button
                  onClick={handleRequestPermission}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
                >
                  Allow notifications
                </button>
              </div>
            ) : notifPrefs ? (
              <div className="space-y-2">
                <ToggleRow
                  icon={<Bell className="w-3.5 h-3.5" />}
                  label="Desktop notifications"
                  hint="Popup when a message arrives"
                  value={notifPrefs.enabled}
                  onChange={(v) => updateNotifPref(v ? { enabled: true } : { enabled: false })}
                />
                <ToggleRow
                  icon={<Volume2 className="w-3.5 h-3.5" />}
                  label="Sound"
                  hint="Play a chime"
                  value={notifPrefs.sound}
                  onChange={(v) => updateNotifPref(v ? { sound: true } : { sound: false })}
                />
                <ToggleRow
                  icon={<Eye className="w-3.5 h-3.5" />}
                  label="Show preview"
                  hint="Message text in popup"
                  value={notifPrefs.preview}
                  onChange={(v) => updateNotifPref(v ? { preview: true } : { preview: false })}
                />
              </div>
            ) : null}
          </section>

          {/* Translation */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Translation
              </h3>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-300 mb-2">
                Default target language
              </div>
              <select
                value={settings.defaultLang}
                onChange={(e) => updateSetting("defaultLang", e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {["Urdu", "Hindi", "English", "Arabic", "Spanish", "French", "German", "Chinese", "Japanese", "Russian"].map(
                  (l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-fuchsia-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Appearance
              </h3>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 mb-2">
              <div className="text-xs text-slate-300 mb-2">Wallpaper</div>
              <div className="grid grid-cols-3 gap-2">
                {(["nebula", "minimal", "none"] as WallpaperChoice[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => updateSetting("wallpaper", w)}
                    className={`rounded-lg border py-2 text-xs font-medium transition ${
                      settings.wallpaper === w
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {w === "nebula" ? "🌌 Nebula" : w === "minimal" ? "⬛ Minimal" : "🚫 None"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2">
                <Type className="w-3.5 h-3.5" /> Message font size
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["sm", "base", "lg"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => updateSetting("fontSize", f)}
                    className={`rounded-lg border py-2 text-xs font-medium transition ${
                      settings.fontSize === f
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {f === "sm" ? "Small" : f === "base" ? "Medium" : "Large"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Blocked users */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldOff className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Blocked Users
              </h3>
            </div>
            {loadingBlocked ? (
              <div className="text-xs text-slate-500 text-center py-3">
                Loading…
              </div>
            ) : blocked.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500 text-center">
                You haven't blocked anyone
              </div>
            ) : (
              <div className="space-y-1">
                {blocked.map((b) => {
                  const name = b.full_name || b.email || "Unknown";
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 truncate">
                          {name}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblock(b.user_id)}
                        className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800 transition"
                      >
                        Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Danger zone */}
          <section>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <div className="text-xs text-red-300 font-medium mb-2">
                Danger zone
              </div>
              <button
                onClick={() => {
                  if (
                    !confirm(
                      "This clears your locally saved chat data. Continue?"
                    )
                  )
                    return;
                  localStorage.removeItem("xentra_connect_settings");
                  location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/40 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Connect preferences
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <span className="text-slate-400 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <div className="text-xs text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500">{hint}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-10 h-5 rounded-full transition ${
          value ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}