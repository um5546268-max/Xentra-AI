"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import {
  hasWebSpeechRecognition,
  hasMediaRecorder,
  transcribeAudio,
} from "@/lib/voice";

type Props = {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  language?: string;
};

export default function MicButton({ onTranscript, disabled, language }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUseWebSpeech(hasWebSpeechRecognition());
    setUseMediaRecorder(hasMediaRecorder());
  }, []);

  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const [useMediaRecorder, setUseMediaRecorder] = useState(false);

  // Detect browser capabilities after mount (client-side only)
  useEffect(() => {
    setUseWebSpeech(hasWebSpeechRecognition());
    setUseMediaRecorder(hasMediaRecorder());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ============================================================
  // Web Speech API path (Chrome/Edge)
  // ============================================================
  const startWebSpeech = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language || "en-US";

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

        recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      // Only look at results from resultIndex onward
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      // Send only ONE event per invocation
      if (final) {
        onTranscript(final.trim(), true);
      } else if (interim) {
        onTranscript(interim.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error || "unknown";
      if (err === "no-speech") {
        // Ignore — user was silent
        return;
      }
      if (err === "not-allowed") {
        setError("Microphone permission denied");
      } else {
        setError(`Speech error: ${err}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopWebSpeech = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  };

  // ============================================================
  // MediaRecorder path (Firefox/Safari) — uploads to Groq
  // ============================================================
  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop the stream tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        setProcessing(true);
        try {
          const res = await transcribeAudio(blob, language?.split("-")[0]);
          if (res.text) onTranscript(res.text, true);
        } catch (e: any) {
          setError(e?.message || "Transcription failed");
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setError(null);
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setError("Microphone permission denied");
      } else {
        setError(e?.message || "Could not access microphone");
      }
    }
  };

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // ============================================================
  // Unified handlers
  // ============================================================
    const handleToggle = async () => {
    if (disabled || processing) return;

    if (listening || recording) {
      // Stop
      if (useWebSpeech) stopWebSpeech();
      else stopMediaRecorder();
    } else {
      // Stop any ongoing TTS first
      const { stop: stopVoice } = (await import("@/lib/voice-store")).useVoice.getState();
      stopVoice();

      // Start
      setError(null);
      if (useWebSpeech) {
        startWebSpeech();
      } else if (useMediaRecorder) {
        await startMediaRecorder();
      } else {
        setError("Voice not supported in this browser");
      }
    }
  };

  const isActive = listening || recording;
  const isBusy = processing;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isBusy || !mounted}
        className={`relative p-3 rounded-xl transition flex items-center justify-center ${
          isActive
            ? "bg-red-600 text-white hover:bg-red-500"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        } ${disabled || isBusy ? "opacity-40 cursor-not-allowed" : ""}`}
        title={
          isActive
            ? "Stop listening"
            : useWebSpeech
            ? "Click to speak"
            : "Click to record"
        }
      >
        {isBusy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isActive ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        {/* Pulsing ring while listening */}
        {isActive && (
          <>
            <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
            <span className="absolute inset-0 rounded-xl bg-red-500/20" />
          </>
        )}
      </button>

      {error && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-300 flex items-start gap-2 shadow-lg z-20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}
    </div>
  );
}