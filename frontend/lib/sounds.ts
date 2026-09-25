"use client";

/**
 * Synthesized sound effects using Web Audio API.
 * No external assets needed — everything is generated in-browser.
 */

let audioCtx: AudioContext | null = null;

const STORAGE_KEY = "xentra_sound_prefs";

export type SoundPrefs = {
  enabled: boolean;      // master on/off for UI sounds
  sendPop: boolean;      // sound on message send
  receiveChime: boolean; // sound on message receive
};

const DEFAULT_PREFS: SoundPrefs = {
  enabled: true,
  sendPop: true,
  receiveChime: true,
};

// ─────────────────────────────────────────────
// Prefs
// ─────────────────────────────────────────────
export function getSoundPrefs(): SoundPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setSoundPrefs(patch: Partial<SoundPrefs>): SoundPrefs {
  const next = { ...getSoundPrefs(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

// ─────────────────────────────────────────────
// Audio context helper
// ─────────────────────────────────────────────
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    // Browsers suspend the context until user gesture — resume if suspended
    if (audioCtx!.state === "suspended") {
      audioCtx!.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Sound generators
// ─────────────────────────────────────────────
export function playSendPop() {
  if (!getSoundPrefs().enabled) return;
  if (!getSoundPrefs().sendPop) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
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
}

export function playReceiveChime() {
  if (!getSoundPrefs().enabled) return;
  if (!getSoundPrefs().receiveChime) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two-tone ascending chime (A5 → D6)
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

export function playErrorBuzz() {
  if (!getSoundPrefs().enabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.24);
}