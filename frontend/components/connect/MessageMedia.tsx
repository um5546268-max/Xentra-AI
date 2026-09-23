"use client";

import { useState } from "react";
import {
  FileText, Download, Play, Pause,
} from "lucide-react";

type MediaMeta = {
  name?: string;
  size?: number;
  mime?: string;
  key?: string;
  url?: string;
};

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageMedia({ meta }: { meta: MediaMeta }) {
  const [expanded, setExpanded] = useState(false);
  if (!meta.url) return null;

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="block max-w-xs rounded-lg overflow-hidden hover:opacity-90 transition"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.url}
          alt={meta.name || "image"}
          className="max-w-full max-h-64 object-cover rounded-lg"
        />
      </button>

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.url}
            alt={meta.name || "image"}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

export function FileMedia({
  meta,
  isMine,
}: {
  meta: MediaMeta;
  isMine: boolean;
}) {
  if (!meta.url) return null;
  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-lg p-2 transition ${
        isMine
          ? "bg-white/10 hover:bg-white/20"
          : "bg-slate-900/60 hover:bg-slate-900"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-violet-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {meta.name || "File"}
        </div>
        <div className="text-[10px] opacity-70 mt-0.5">
          {formatBytes(meta.size)}
        </div>
      </div>
      <Download className="w-4 h-4 shrink-0 opacity-70" />
    </a>
  );
}

export function VoiceMedia({ meta }: { meta: MediaMeta }) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  if (!meta.url) return null;

  const toggle = () => {
    if (!audio) {
      const a = new Audio(meta.url);
      a.onended = () => setPlaying(false);
      setAudio(a);
      a.play();
      setPlaying(true);
    } else {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        audio.play();
        setPlaying(true);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 rounded-lg p-2 transition hover:opacity-90"
    >
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </div>
      <div className="flex items-center gap-0.5">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 bg-white/60 rounded-full"
            style={{
              height: `${6 + Math.abs(Math.sin(i * 0.7)) * 14}px`,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] opacity-70 shrink-0">
        {playing ? "playing…" : "voice"}
      </span>
    </button>
  );
}

export function VideoMedia({ meta }: { meta: MediaMeta }) {
  if (!meta.url) return null;
  return (
    <video
      src={meta.url}
      controls
      className="max-w-xs max-h-64 rounded-lg"
    />
  );
}