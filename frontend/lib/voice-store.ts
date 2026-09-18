import { create } from "zustand";
import {
  VoiceSettings,
  getVoiceSettings,
  updateVoiceSettings,
  speak,
  stopSpeaking,
} from "./voice";

type VoiceState = {
  settings: VoiceSettings | null;
  loading: boolean;
  error: string | null;

  // Recording state
  listening: boolean;
  liveTranscript: string;

  // Speaking state
  speaking: boolean;

  // Actions
  load: () => Promise<void>;
  save: (updates: Partial<VoiceSettings>) => Promise<void>;
  setListening: (v: boolean) => void;
  setLiveTranscript: (v: string) => void;
  setSpeaking: (v: boolean) => void;
  speakText: (text: string) => void;
  stop: () => void;
};

export const useVoice = create<VoiceState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,
  listening: false,
  liveTranscript: "",
  speaking: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getVoiceSettings();
      set({ settings, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Failed to load voice settings" });
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
  setSpeaking: (v) => set({ speaking: v }),

  speakText: (text) => {
    const { settings } = get();
    if (!settings) return;

    speak(text, {
      voiceName: settings.voice_name,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      onStart: () => set({ speaking: true }),
      onEnd: () => set({ speaking: false }),
      onError: () => set({ speaking: false }),
    });
  },

  stop: () => {
    stopSpeaking();
    set({ speaking: false, listening: false });
  },
}));