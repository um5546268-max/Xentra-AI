"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Palette, Type, Ruler, WrapText, Terminal, Save, MapPin } from "lucide-react";

type Settings = {
  theme: "dark" | "light";
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  pythonVersion: string;
  terminalFontSize: number;
  autoSave: boolean;
  projectLocation: string;
};

const DEFAULT: Settings = {
  theme: "dark",
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  pythonVersion: "3.11",
  terminalFontSize: 12,
  autoSave: true,
  projectLocation: "Internal Storage",
};

const STORAGE_KEY = "xentra-code-settings";

export function loadCodeSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export default function MobileCodeSettings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    setSettings(loadCodeSettings());
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("xentra:code-settings-changed"));
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">Settings</div>
          <div className="text-[10px] text-slate-500">Code Workspace</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Editor section */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">
            Editor
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <Row
              icon={<Palette className="w-4 h-4 text-violet-400" />}
              label="Theme"
              value={settings.theme === "dark" ? "Dark" : "Light"}
              onClick={() =>
                update("theme", settings.theme === "dark" ? "light" : "dark")
              }
            />
            <Row
              icon={<Type className="w-4 h-4 text-cyan-400" />}
              label="Font Size"
              value={`${settings.fontSize}`}
              onClick={() => {
                const next = prompt(
                  "Font size (px):",
                  String(settings.fontSize)
                );
                if (next) update("fontSize", Math.max(10, Math.min(24, Number(next))));
              }}
            />
            <Row
              icon={<Ruler className="w-4 h-4 text-emerald-400" />}
              label="Tab Size"
              value={`${settings.tabSize}`}
              onClick={() => {
                const next = prompt("Tab size:", String(settings.tabSize));
                if (next) update("tabSize", Math.max(2, Math.min(8, Number(next))));
              }}
            />
            <Row
              icon={<WrapText className="w-4 h-4 text-amber-400" />}
              label="Word Wrap"
              toggle={settings.wordWrap}
              onClick={() => update("wordWrap", !settings.wordWrap)}
              last
            />
          </div>
        </div>

        {/* Run & Terminal */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">
            Run & Terminal
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <Row
              icon={<Terminal className="w-4 h-4 text-violet-400" />}
              label="Default Python Version"
              value={settings.pythonVersion}
              onClick={() => {
                const next = prompt(
                  "Python version:",
                  settings.pythonVersion
                );
                if (next) update("pythonVersion", next);
              }}
            />
            <Row
              icon={<Type className="w-4 h-4 text-cyan-400" />}
              label="Terminal Font Size"
              value={`${settings.terminalFontSize}`}
              onClick={() => {
                const next = prompt(
                  "Terminal font size (px):",
                  String(settings.terminalFontSize)
                );
                if (next)
                  update(
                    "terminalFontSize",
                    Math.max(10, Math.min(20, Number(next)))
                  );
              }}
            />
            <Row
              icon={<Save className="w-4 h-4 text-emerald-400" />}
              label="Auto Save"
              toggle={settings.autoSave}
              onClick={() => update("autoSave", !settings.autoSave)}
              last
            />
          </div>
        </div>

        {/* General */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">
            General
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <Row
              icon={<MapPin className="w-4 h-4 text-amber-400" />}
              label="Project Location"
              value={settings.projectLocation}
              onClick={() => {
                const next = prompt(
                  "Project location:",
                  settings.projectLocation
                );
                if (next) update("projectLocation", next);
              }}
              last
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Setting Row ───
function Row({
  icon,
  label,
  value,
  toggle,
  onClick,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  toggle?: boolean;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-900/60 transition text-left ${
        !last ? "border-b border-slate-800/60" : ""
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-slate-950/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm text-slate-200">{label}</span>
      {toggle !== undefined ? (
        <span
          className={`relative w-11 h-6 rounded-full transition ${
            toggle ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              toggle ? "translate-x-5" : ""
            }`}
          />
        </span>
      ) : (
        <span className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
          {value}
        </span>
      )}
    </button>
  );
}