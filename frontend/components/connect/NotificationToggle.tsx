"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  getBrowserNotifPrefs,
  setBrowserNotifPrefs,
  getBrowserNotifPermission,
  requestBrowserNotifPermission,
  isBrowserNotifSupported,
} from "@/lib/browser-notifications";

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setEnabled(getBrowserNotifPrefs().enabled);
    setPermission(getBrowserNotifPermission());
    setSupported(isBrowserNotifSupported());
  }, []);

  const toggle = async () => {
    if (!supported) return;

    if (!enabled) {
      if (permission !== "granted") {
        const p = await requestBrowserNotifPermission();
        setPermission(p);
        if (p !== "granted") return;
      }
      setBrowserNotifPrefs({ enabled: true });
      setEnabled(true);
    } else {
      setBrowserNotifPrefs({ enabled: false });
      setEnabled(false);
    }
  };

  if (!supported) {
    return (
      <button
        disabled
        className="p-1.5 rounded-lg text-slate-600 cursor-not-allowed"
        title="Notifications not supported in this browser"
      >
        <BellOff className="w-4 h-4" />
      </button>
    );
  }

  if (permission === "denied") {
    return (
      <button
        disabled
        className="p-1.5 rounded-lg text-red-500/60 cursor-not-allowed"
        title="Notifications blocked in browser settings"
      >
        <BellOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`p-1.5 rounded-lg transition ${
        enabled
          ? "text-violet-400 hover:bg-slate-800 hover:text-violet-300"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      }`}
      title={
        enabled
          ? "Browser notifications ON — click to mute"
          : "Browser notifications OFF — click to enable"
      }
    >
      {enabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
    </button>
  );
}