"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { uploadToChat } from "@/lib/upload";

export default function VoiceRecorder({
  chatId,
  onUploaded,
  disabled,
}: {
  chatId: string;
  onUploaded: () => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer that runs while recording
  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording, paused]);

  const startRecording = async () => {
    setError(null);
    setElapsed(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop the mic tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        // Upload
        setUploading(true);
        try {
          const file = new File([blob], "voice.webm", { type: mimeType });
          await uploadToChat(chatId, file);
          onUploaded();
        } catch (err) {
          console.error("Voice upload failed:", err);
          setError("Upload failed");
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err: any) {
      console.error("Mic access failed:", err);
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Mic error"
      );
    }
  };

  const stopAndSend = () => {
    if (!mediaRecorderRef.current) return;
    setRecording(false);
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    // Stop the recorder without triggering upload
    mediaRecorderRef.current.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    mediaRecorderRef.current.stop();
    setRecording(false);
    setPaused(false);
    setElapsed(0);
  };

  // Format seconds as M:SS
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  if (uploading) {
    return (
      <button
        disabled
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 bg-slate-800 shrink-0"
        title="Uploading voice…"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  if (!recording) {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition shrink-0 disabled:opacity-40"
        title={error || "Record voice message"}
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  // Recording state — inline bar
  return (
    <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 pl-3 pr-1 py-1 shrink-0">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs font-mono text-red-200">
        {formatTime(elapsed)}
      </span>
      <button
        type="button"
        onClick={cancelRecording}
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={stopAndSend}
        className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition"
        title="Stop & send"
      >
        <Square className="w-3.5 h-3.5 fill-white" />
      </button>
    </div>
  );
}