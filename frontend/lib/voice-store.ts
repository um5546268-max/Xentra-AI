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

  // Actions
  load: () => Promise<void>;
  loadVoices: () => void;
  save: (updates: Partial<VoiceSettings>) => Promise<void>;
  setListening: (v: boolean) => void;
  setLiveTranscript: (v: string) => void;
  speakText: (text: string, messageId?: string) => void;
  stop: () => void;
  toggleAutoSpeak: () => void;
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

  load: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getVoiceSettings();
      set({ settings, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Failed to load voice settings" });
    }
  },

  loadVoices: () => {
    const load = () => {
      const v = listVoices();
      if (v.length > 0) set({ voices: v });
    };
    load();
    // Voices often load async
    if (typeof window !== "undefined") {
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

    // Stop anything already playing
    stopSpeaking();

    speak(text, {
      voiceName: settings.voice_name,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      onStart: () =>
        set({ speaking: true, speakingMessageId: messageId || null }),
      onEnd: () =>
        set({ speaking: false, speakingMessageId: null }),
      onError: () =>
        set({ speaking: false, speakingMessageId: null }),
    });
  },

  stop: () => {
    stopSpeaking();
    set({ speaking: false, speakingMessageId: null, listening: false });
  },

  toggleAutoSpeak: () => {
    const { settings } = get();
    if (!settings) return;
    get().save({ auto_speak: !settings.auto_speak });
  },
}));