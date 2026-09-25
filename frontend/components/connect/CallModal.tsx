"use client";

import { X, Phone, Video, Mic, Sparkles, Rocket } from "lucide-react";

export default function CallModal({
  callType,
  peerName,
  onClose,
}: {
  callType: "voice" | "video";
  peerName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/40">
          {callType === "video" ? (
            <Video className="w-9 h-9 text-white" />
          ) : (
            <Phone className="w-9 h-9 text-white" />
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {callType === "video" ? "Video call" : "Voice call"}
        </h2>
        <p className="text-sm text-slate-400 mb-5">
          Call with <span className="text-slate-200 font-medium">{peerName}</span>
        </p>

        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 mb-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Voice and video calling is being built right now. It uses WebRTC
            for peer-to-peer audio and video — a big feature that's coming in
            a future update.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <Feature icon={<Mic className="w-3.5 h-3.5" />} label="Voice" />
          <Feature icon={<Video className="w-3.5 h-3.5" />} label="Video" />
          <Feature icon={<Sparkles className="w-3.5 h-3.5" />} label="HD" />
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 py-2 flex flex-col items-center gap-1">
      <span className="text-violet-400">{icon}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}