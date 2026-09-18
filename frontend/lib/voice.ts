import api from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ----- Settings -----

export type VoiceSettings = {
  enabled: boolean;
  language: string;
  voice_name: string | null;
  rate: number;
  pitch: number;
  volume: number;
  auto_speak: boolean;
  wake_word: string | null;
  wake_word_enabled: boolean;
};

export const getVoiceSettings = async (): Promise<VoiceSettings> => {
  const res = await api.get("/api/voice/settings");
  return res.data;
};

export const updateVoiceSettings = async (
  updates: Partial<VoiceSettings>
): Promise<VoiceSettings> => {
  const res = await api.patch("/api/voice/settings", updates);
  return res.data;
};

// ----- Transcription (fallback) -----

export type TranscriptResponse = {
  text: string;
  language: string | null;
  duration: number | null;
};

export const transcribeAudio = async (
  audioBlob: Blob,
  language?: string
): Promise<TranscriptResponse> => {
  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  if (language) form.append("language", language);

  const token = localStorage.getItem("xentra_token");
  const res = await fetch(`${API_URL}/api/voice/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcription failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
};

// ----- Browser capability checks -----

export const hasWebSpeechRecognition = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
};

export const hasSpeechSynthesis = (): boolean => {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
};

export const hasMediaRecorder = (): boolean => {
  if (typeof window === "undefined") return false;
  return typeof window.MediaRecorder !== "undefined";
};

// ----- Speech Synthesis (TTS) -----

export type VoiceOption = {
  name: string;
  lang: string;
  default: boolean;
};

export const listVoices = (): VoiceOption[] => {
  if (!hasSpeechSynthesis()) return [];
  return window.speechSynthesis.getVoices().map((v) => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
  }));
};

export type SpeakOptions = {
  voiceName?: string | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
};

export const speak = (text: string, options: SpeakOptions = {}): SpeechSynthesisUtterance | null => {
  if (!hasSpeechSynthesis() || !text.trim()) return null;

  // Cancel any in-progress speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

  if (options.voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.name === options.voiceName);
    if (voice) utterance.voice = voice;
  }

  if (options.onStart) utterance.onstart = () => options.onStart!();
  if (options.onEnd) utterance.onend = () => options.onEnd!();
  if (options.onError) utterance.onerror = (e) => options.onError!(String(e.error || "unknown"));

  window.speechSynthesis.speak(utterance);
  return utterance;
};

export const stopSpeaking = () => {
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
};

export const isSpeaking = (): boolean => {
  if (!hasSpeechSynthesis()) return false;
  return window.speechSynthesis.speaking;
};