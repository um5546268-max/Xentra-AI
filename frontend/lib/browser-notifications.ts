"use client";

/**
 * Browser (OS-level) notification helpers.
 * Separate from lib/notifications.ts (which handles in-app server notifications).
 * Persists user preferences in localStorage.
 */

const PREFS_KEY = "xentra_browser_notification_prefs";

export type BrowserNotifPrefs = {
  enabled: boolean;   // master on/off
  sound: boolean;     // play a sound
  preview: boolean;   // show message text in the notification
};

const DEFAULT_PREFS: BrowserNotifPrefs = {
  enabled: true,
  sound: true,
  preview: true,
};

// ─────────────────────────────────────────────
// Preferences
// ─────────────────────────────────────────────
export function getBrowserNotifPrefs(): BrowserNotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setBrowserNotifPrefs(
  patch: Partial<BrowserNotifPrefs>
): BrowserNotifPrefs {
  const next = { ...getBrowserNotifPrefs(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }
  return next;
}

// ─────────────────────────────────────────────
// Permission
// ─────────────────────────────────────────────
export function isBrowserNotifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotifPermission(): NotificationPermission {
  if (!isBrowserNotifSupported()) return "denied";
  return Notification.permission;
}

export async function requestBrowserNotifPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotifSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// ─────────────────────────────────────────────
// Sound
// ─────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

export function playBrowserNotifChime() {
  if (!getBrowserNotifPrefs().sound) return;
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();

    const now = audioCtx!.currentTime;
    const notes = [880, 1174];
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// Show notification
// ─────────────────────────────────────────────
export function showBrowserNotification(opts: {
  title: string;
  body: string;
  chatId: string;
}) {
  if (!isBrowserNotifSupported()) return;
  if (getBrowserNotifPermission() !== "granted") return;
  if (!getBrowserNotifPrefs().enabled) return;

  const prefs = getBrowserNotifPrefs();
  const body = prefs.preview
    ? opts.body.slice(0, 120)
    : "You have a new message";

  playBrowserNotifChime();

  try {
    const n = new Notification(opts.title, {
      body,
      icon: "/x-logo.png",
      tag: `chat-${opts.chatId}`,
      silent: true,
    });

    n.onclick = () => {
      window.focus();
      window.location.href = `/app/connect?chat=${opts.chatId}`;
      n.close();
    };
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// Tab title unread badge
// ─────────────────────────────────────────────
const BASE_TITLE = "Xentra AI";

export function setTabTitleUnread(count: number) {
  if (typeof document === "undefined") return;
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}