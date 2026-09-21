"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player-store";

export function MiniPlayer() {
  const {
    current,
    playing,
    positionMs,
    durationMs,
    pause,
    resume,
    next,
    previous,
    seek,
    volume,
    muted,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
  if (!durationMs) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const newMs = Math.max(0, Math.min(durationMs, pct * durationMs));
  seek(newMs);
  // The GlobalAudioHost / GlobalYouTubePlayer both watch `seek` and respond
  const audio = document.querySelector("audio");
  if (audio) audio.currentTime = newMs / 1000;
};

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;

  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <Music className="w-3.5 h-3.5" />
          Now Playing
        </div>
        {current?.source && (
          <span className="text-[10px] uppercase text-slate-600">
            {current.source}
          </span>
        )}
      </div>

      {!current ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center text-xs text-slate-600">
          Nothing playing.
          <br />
          <span className="text-slate-700">Play something from Media.</span>
        </div>
      ) : (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-3">
          <div className="flex gap-3 items-center">
            {current.image ? (
              <img
                src={current.image}
                alt={current.title}
                className="w-12 h-12 rounded shrink-0 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded shrink-0 bg-slate-800 flex items-center justify-center">
                <Music className="w-5 h-5 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate text-slate-100">
                {current.title}
              </div>
              {current.artist && (
                <div className="text-[11px] text-slate-400 truncate">
                  {current.artist}
                </div>
              )}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={previous}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            {playing ? (
              <button
                onClick={pause}
                className="p-2 rounded-full bg-violet-600 hover:bg-violet-500"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={resume}
                className="p-2 rounded-full bg-violet-600 hover:bg-violet-500"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={next}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            <div
              onClick={handleSeek}
              className="h-1.5 rounded-full bg-slate-800 cursor-pointer overflow-hidden"
            >
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{fmt(positionMs)}</span>
              <span>{durationMs ? fmt(durationMs) : "--:--"}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="flex-1 accent-violet-500 h-1 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono w-8 text-right">
              {Math.round((muted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}