"use client";

import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Play,
  Square,
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Mic,
  Camera,
  Volume1,
  Music,
} from "lucide-react";
import { useVoice } from "@/lib/voice-store";
import { useAuth } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/connect/AvatarPicker";
import { getSoundPrefs, setSoundPrefs, SoundPrefs } from "@/lib/sounds";

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

  // ─── Account: change name ───
  const updateProfile = useAuth((state) => state.updateProfile);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.full_name || "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameInput(user?.full_name || "");
  }, [user?.full_name]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    const ok = await updateProfile({ full_name: trimmed });
    setSavingName(false);
    if (ok) setEditingName(false);
  };

  // ─── Avatar picker ───
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // ─── Voice settings ───
  useEffect(() => {
    loadVoice();
    loadVoices();
  }, [loadVoice, loadVoices]);

  // ─── Sounds ───
  const [soundPrefs, setSoundPrefsState] = useState<SoundPrefs | null>(null);

  useEffect(() => {
    setSoundPrefsState(getSoundPrefs());
  }, []);

  const updateSoundPref = (patch: Partial<SoundPrefs>) => {
    const next = setSoundPrefs(patch);
    setSoundPrefsState(next);
  };

  // Preview sound
  const previewSound = (type: "pop" | "chime") => {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;

      if (type === "pop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else {
        const notes = [880, 1174];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.11);
          gain.gain.linearRampToValueAtTime(0.14, now + i * 0.11 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.32);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.11);
          osc.stop(now + i * 0.11 + 0.36);
        });
      }
    } catch {}
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-8">
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
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  src={user?.avatar_url}
                  name={user?.full_name}
                  email={user?.email}
                  size={72}
                />
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                  title="Change avatar"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      autoFocus
                      maxLength={60}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setEditingName(false);
                          setNameInput(user?.full_name || "");
                        }
                      }}
                      className="flex-1 min-w-[120px] rounded-lg border border-violet-500/40 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !nameInput.trim()}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition disabled:opacity-40"
                    >
                      {savingName ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setNameInput(user?.full_name || "");
                      }}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold text-slate-200 truncate">
                      {user?.full_name || "No name set"}
                    </div>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium shrink-0"
                      title="Edit name"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <div className="text-xs text-slate-500 truncate mt-1">
                  {user?.email}
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-medium"
                >
                  Change avatar
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* ✅ Sounds */}
        <Section
          title="Sounds"
          icon={<Music className="w-4 h-4" />}
          subtitle="Audio feedback for chat actions"
        >
          {soundPrefs ? (
            <div className="space-y-3">
              <SettingRow
                label="Enable sounds"
                hint="Master toggle for all UI sounds"
              >
                <button
                  onClick={() =>
                    updateSoundPref({ enabled: !soundPrefs.enabled })
                  }
                  className={`relative w-11 h-6 rounded-full transition ${
                    soundPrefs.enabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      soundPrefs.enabled ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </SettingRow>

              <SettingRow
                label="Send pop"
                hint="Play a soft pop when you send a message"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewSound("pop")}
                    disabled={!soundPrefs.enabled}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-800 transition disabled:opacity-40"
                    title="Preview"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() =>
                      updateSoundPref({ sendPop: !soundPrefs.sendPop })
                    }
                    disabled={!soundPrefs.enabled}
                    className={`relative w-11 h-6 rounded-full transition disabled:opacity-40 ${
                      soundPrefs.sendPop ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        soundPrefs.sendPop ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </SettingRow>

              <SettingRow
                label="Receive chime"
                hint="Play a chime when you receive a message"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewSound("chime")}
                    disabled={!soundPrefs.enabled}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-800 transition disabled:opacity-40"
                    title="Preview"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() =>
                      updateSoundPref({
                        receiveChime: !soundPrefs.receiveChime,
                      })
                    }
                    disabled={!soundPrefs.enabled}
                    className={`relative w-11 h-6 rounded-full transition disabled:opacity-40 ${
                      soundPrefs.receiveChime ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        soundPrefs.receiveChime ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </SettingRow>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] text-slate-500 leading-relaxed">
                💡 Sounds play only after your first click or keystroke — browsers
                require user interaction before playing audio.
              </div>
            </div>
          ) : null}
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
              <SettingRow label="Voice" hint="Which voice Xentra uses">
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

              <SettingRow label="Language" hint="Speech recognition language">
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
                  onChange={(e) =>
                    save({ volume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
              </SettingRow>

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

              <SettingRow
                label="Wake word: Hey Xentra"
                hint="Say 'Hey Xentra or Hey Zen' to activate the mic (Chrome/Edge only)"
              >
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      save({
                        wake_word_enabled: !settings.wake_word_enabled,
                        wake_word: settings.wake_word || "hey xentra",
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition ${
                      settings.wake_word_enabled
                        ? "bg-emerald-500"
                        : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.wake_word_enabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>

                  {settings.wake_word_enabled && (
                    <div className="rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                      ⚠️ Wake word keeps your microphone active. Only enable if
                      you're okay with this.
                    </div>
                  )}

                  <TestWakeWordHelper />
                </div>
              </SettingRow>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="text-sm text-slate-200">Test your voice</div>
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

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <AvatarPicker onClose={() => setShowAvatarPicker(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEST WAKE WORD HELPER
// ═══════════════════════════════════════════════════════════════
function TestWakeWordHelper() {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const recRef = useRef<any>(null);

  const start = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      alert("Web Speech API not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const trimmed = transcript.trim();
      if (trimmed) {
        setHeard((prev) => [...prev, trimmed].slice(-8));
      }
    };

    rec.onerror = (e: any) => {
      console.warn("[test-mic] error:", e.error);
    };

    rec.onend = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
    setHeard([]);
  };

  const stop = () => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {}
      recRef.current = null;
    }
    setListening(false);
  };

  const copyText = async () => {
    if (heard.length === 0) return;
    await navigator.clipboard.writeText(heard.join("\n"));
  };

  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-3 space-y-2">
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Mic className="w-3.5 h-3.5" />
        Test the mic — say "Hey Xentra or Hey Zen" and see what the browser hears.
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={listening ? stop : start}
          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
            listening
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-slate-700 text-slate-200 hover:bg-slate-600"
          }`}
        >
          {listening ? "Stop test" : "Test mic"}
        </button>

        {heard.length > 0 && (
          <>
            <button
              type="button"
              onClick={copyText}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setHeard([])}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {heard.length > 0 && (
        <div className="rounded bg-slate-950 border border-slate-800 p-2 space-y-0.5 max-h-32 overflow-y-auto">
          {heard.map((h, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-400">
              "{h}"
            </div>
          ))}
        </div>
      )}

      {heard.length === 0 && listening && (
        <div className="text-[11px] text-slate-500 italic">
          Listening… speak now.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE LAYOUT COMPONENTS
// ═══════════════════════════════════════════════════════════════
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
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
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