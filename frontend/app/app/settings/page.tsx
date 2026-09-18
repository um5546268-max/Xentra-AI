"use client";

import { useEffect } from "react";
import {
  Volume2,
  Play,
  Square,
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { useVoice } from "@/lib/voice-store";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    settings,
    voices,
    loading,
    save,
    loadVoices,
    load: loadVoice,
    speakText,
    stop,
    speaking,
  } = useVoice();

  useEffect(() => {
    loadVoice();
    loadVoices();
  }, [loadVoice, loadVoices]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 border border-slate-500/40 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-slate-500">
              Configure Xentra to your preferences.
            </p>
          </div>
        </div>

        {/* Account */}
        <Section title="Account" icon={<UserIcon className="w-4 h-4" />}>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm text-slate-200">
              {user?.full_name || user?.email || "—"}
            </div>
            {user?.email && (
              <div className="text-xs text-slate-500">{user.email}</div>
            )}
          </div>
        </Section>

        {/* Voice Settings */}
        <Section
          title="Voice"
          icon={<Volume2 className="w-4 h-4" />}
          subtitle="How Xentra speaks and listens"
        >
          {loading || !settings ? (
            <div className="text-sm text-slate-500 py-6 text-center">
              Loading voice settings…
            </div>
          ) : (
            <div className="space-y-3">
              {/* Voice selection */}
              <SettingRow
                label="Voice"
                hint="Which voice Xentra uses"
              >
                <select
                  value={settings.voice_name || ""}
                  onChange={(e) =>
                    save({ voice_name: e.target.value || null })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="">Default (browser picks)</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} — {v.lang}
                    </option>
                  ))}
                </select>
              </SettingRow>

              {/* Language */}
              <SettingRow
                label="Language"
                hint="Speech recognition language"
              >
                <select
                  value={settings.language}
                  onChange={(e) => save({ language: e.target.value })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="ur-PK">Urdu (Pakistan)</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="ar-SA">Arabic</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </SettingRow>

              {/* Rate */}
              <SettingRow
                label={`Speech rate: ${settings.rate.toFixed(2)}×`}
                hint="How fast Xentra speaks"
              >
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={settings.rate}
                  onChange={(e) => save({ rate: parseFloat(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </SettingRow>

              {/* Pitch */}
              <SettingRow
                label={`Pitch: ${settings.pitch.toFixed(2)}`}
                hint="Higher = higher-pitched voice"
              >
                <input
                  type="range"
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  value={settings.pitch}
                  onChange={(e) => save({ pitch: parseFloat(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </SettingRow>

              {/* Volume */}
              <SettingRow
                label={`Volume: ${(settings.volume * 100).toFixed(0)}%`}
                hint="How loud Xentra speaks"
              >
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={settings.volume}
                  onChange={(e) => save({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </SettingRow>

              {/* Auto-speak */}
              <SettingRow
                label="Auto-speak replies"
                hint="Speak every AI response automatically"
              >
                <button
                  onClick={() => save({ auto_speak: !settings.auto_speak })}
                  className={`relative w-11 h-6 rounded-full transition ${
                    settings.auto_speak ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.auto_speak ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </SettingRow>

              {/* Test */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="text-sm text-slate-200">
                  Test your voice
                </div>
                <div className="text-xs text-slate-500">
                  Click to hear Xentra with your current settings.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      speakText(
                        "Hello! This is how Xentra will sound with your current voice settings."
                      )
                    }
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Test voice
                  </button>
                  {speaking && (
                    <button
                      onClick={stop}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Security quick links */}
        <Section
          title="Security"
          icon={<Shield className="w-4 h-4" />}
          subtitle="Manage permissions and audit"
        >
          <div className="grid grid-cols-3 gap-2">
            <a
              href="/app/permissions"
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 text-center hover:bg-slate-900 hover:border-slate-700 transition"
            >
              <div className="text-sm text-slate-200">Permissions</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Control what Xentra can do
              </div>
            </a>
            <a
              href="/app/pending"
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 text-center hover:bg-slate-900 hover:border-slate-700 transition"
            >
              <div className="text-sm text-slate-200">Pending actions</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Approve dangerous actions
              </div>
            </a>
            <a
              href="/app/audit"
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3 text-center hover:bg-slate-900 hover:border-slate-700 transition"
            >
              <div className="text-sm text-slate-200">Audit log</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                See everything Xentra did
              </div>
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <div>
          <div className="text-sm font-semibold text-slate-200">{title}</div>
          {subtitle && (
            <div className="text-xs text-slate-500">{subtitle}</div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-slate-200">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      {children}
    </div>
  );
}