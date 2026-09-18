import { create } from "zustand";
import {
  VoiceSettings,
  getVoiceSettings,
  updateVoiceSettings,
  speak,
  stopSpeaking,
  listVoices,
  VoiceOption,
} from "./voice";

type VoiceState = {
  settings: VoiceSettings | null;
  voices: VoiceOption[];
  loading: boolean;
  error: string | null;

  // Recording state
  listening: boolean;
  liveTranscript: string;

  // Speaking state
  speaking: boolean;
  speakingMessageId: string | null;

  // Wake word
  wakeWordActive: boolean;
  wakeWordArmed: boolean;

  // Actions
  load: () => Promise<void>;
  loadVoices: () => void;
  save: (updates: Partial<VoiceSettings>) => Promise<void>;
  setListening: (v: boolean) => void;
  setLiveTranscript: (v: string) => void;
  speakText: (text: string, messageId?: string) => void;
  stop: () => void;
  toggleAutoSpeak: () => void;
  startWakeWordListener: (onCommand: (text: string) => void) => void;
  stopWakeWordListener: () => void;
};

export const useVoice = create<VoiceState>((set, get) => ({
  settings: null,
  voices: [],
  loading: false,
  error: null,
  listening: false,
  liveTranscript: "",
  speaking: false,
  speakingMessageId: null,
  wakeWordActive: false,
  wakeWordArmed: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getVoiceSettings();
      set({ settings, loading: false });
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message || "Failed to load voice settings",
      });
    }
  },

  loadVoices: () => {
    const load = () => {
      const v = listVoices();
      if (v.length > 0) set({ voices: v });
    };
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  },

  save: async (updates) => {
    try {
      const settings = await updateVoiceSettings(updates);
      set({ settings });
    } catch (e: any) {
      set({ error: e?.message || "Failed to save voice settings" });
    }
  },

  setListening: (v) => set({ listening: v }),
  setLiveTranscript: (v) => set({ liveTranscript: v }),

  speakText: (text, messageId) => {
    const { settings } = get();
    if (!settings) return;

    stopSpeaking();

    speak(text, {
      voiceName: settings.voice_name,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      onStart: () =>
        set({ speaking: true, speakingMessageId: messageId || null }),
      onEnd: () => set({ speaking: false, speakingMessageId: null }),
      onError: () => set({ speaking: false, speakingMessageId: null }),
    });
  },

  stop: () => {
    stopSpeaking();
    set({
      speaking: false,
      speakingMessageId: null,
      listening: false,
    });
  },

  toggleAutoSpeak: () => {
    const { settings } = get();
    if (!settings) return;
    get().save({ auto_speak: !settings.auto_speak });
  },

  // ============================================================
  // Wake word listener
  // ============================================================
  startWakeWordListener: (onCommand: (text: string) => void) => {
    if (typeof window === "undefined") return;
    if (get().wakeWordActive) return;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("[wake-word] SpeechRecognition not supported");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = get().settings?.language || "en-US";

        // Because Web Speech API can't reliably transcribe "Xentra",
    // we match many plausible mishearings + varied spellings.
    const WAKE_PHRASES = [
      // Primary — the one we advertise
      "hey zen",
      "ok zen",
      "hi zen",
      "a zen",

      // Brand stays "Xentra" — accept phonetic variants too
      "hey zentra",
      "hey zendra",
      "hey xentra",
      "hey xendra",
      "hey zintra",

      // User sometimes says it alone
      "zen",
      // Correct spellings
      "hey xentra",
      "ok xentra",
      "hi xentra",
      "a xentra",
      "hey zentra",
      "ok zentra",
      "hi zentra",
      "hey zendra",
      "ok zendra",
      "hey zentara",
      "hey zantara",
      "hey zintra",
      "hey sentra",
      "hey centra",
      "hey xantra",
      "hey ksentra",
      "hey gendra",
      "hey jendra",
      "hey zendara",
      "hey zendera",
      "hey sendra",
      "hey sindra",
      "hey cendra",
      "hey zantra",
      "hey zatura",
      "hey zandra",
      "hey zandro",
      "hey zendar",
      "hey zen",
      "hey z",
      // Just "xentra" alone (with brand variants)
      "xentra",
      "zentra",
      "zendra",
      "zintra",
      "sentra",
      "zantra",
      "zendara",
      "Jaan",
    ];
        // Fuzzy match: does the transcript contain something close to "xentra"?
    const looksLikeWakeWord = (text: string): boolean => {
      const t = text.toLowerCase();

      // Exact match on any phrase
      if (WAKE_PHRASES.some((p) => t.includes(p))) return true;

      // Fuzzy: look for a word that has:
      // - Length 5-9
      // - Starts with z/s/c/x/j/g OR ends with "tra"/"dra"/"ara"
      // - Combined with a "hey"/"ok"/"hi" prefix
      const hasGreeting = /\b(hey|hi|ok|okay|hello|yo)\b/.test(t);

      const words = t.split(/\s+/);
      const looksBrand = words.some((w) => {
        if (w.length < 4 || w.length > 10) return false;
        const startsBrandy = /^[zscxjg]/.test(w);
        const endsBrandy = /(tra|dra|ara|antra|entra|intra)$/.test(w);
        const middleBrandy = /(en|an|in|on)/.test(w);
        return (startsBrandy && endsBrandy) || (startsBrandy && middleBrandy);
      });

      if (hasGreeting && looksBrand) return true;

      // No greeting, but the brand word alone (for repeated use)
      if (words.length <= 2 && looksBrand) return true;

      return false;
    };
    let armed = false;
    let armTimeout: ReturnType<typeof setTimeout> | null = null;

    recognition.onstart = () => {
      set({ wakeWordActive: true });
      console.log("[wake-word] listening for wake word");
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const lower = transcript.toLowerCase().trim();

      if (!armed) {
        const detected = looksLikeWakeWord(lower);
        if (detected) {
          armed = true;
          set({ wakeWordArmed: true });
          console.log("[wake-word] armed");

          let remainder = lower;
          for (const p of WAKE_PHRASES) {
            remainder = remainder.replace(p, "").trim();
          }

          if (remainder.length > 3) {
            onCommand(remainder);
            armed = false;
            set({ wakeWordArmed: false });
          } else {
            if (armTimeout) clearTimeout(armTimeout);
            armTimeout = setTimeout(() => {
              armed = false;
              set({ wakeWordArmed: false });
              console.log("[wake-word] disarmed (timeout)");
            }, 8000);
          }
        }
      } else {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal && lower.length > 2) {
          onCommand(lower);
          armed = false;
          set({ wakeWordArmed: false });
          if (armTimeout) clearTimeout(armTimeout);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        console.warn("[wake-word] permission denied");
        set({ wakeWordActive: false });
      }
    };

    recognition.onend = () => {
      if (get().wakeWordActive) {
        try {
          recognition.start();
        } catch {}
      }
    };

    (window as any).__xentraWakeRecognition = recognition;
    recognition.start();
  },

  stopWakeWordListener: () => {
    if (typeof window === "undefined") return;
    const rec = (window as any).__xentraWakeRecognition;
    if (rec) {
      try {
        rec.stop();
      } catch {}
      (window as any).__xentraWakeRecognition = null;
    }
    set({ wakeWordActive: false, wakeWordArmed: false });
    console.log("[wake-word] stopped");
  },
}));