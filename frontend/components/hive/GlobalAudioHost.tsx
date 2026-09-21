"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/player-store";

export function GlobalAudioHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const initial = usePlayerStore.getState();
    audio.volume = initial.muted ? 0 : initial.volume;
    audio.muted = initial.muted;

    const unsub = usePlayerStore.subscribe((state) => {
      const { current, playing, positionMs, volume, muted } = state;

      // Only the <audio> element handles local files.
      // YouTube/Spotify have their own players (iframe / Web API).
      const isLocal = current?.source === "local";
      const newUrl = isLocal && current?.url ? current.url : null;

      // Load new source
      if (newUrl !== currentUrlRef.current) {
        currentUrlRef.current = newUrl;
        if (newUrl) {
          audio.src = newUrl;
          audio.load();
        } else {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        }
      }

      // Play / pause
      if (isLocal && playing && audio.src) {
        audio.play().catch((err) =>
          console.warn("[audio] play failed:", err?.message)
        );
      } else {
        audio.pause();
      }

      // Seek
      if (isLocal && audio.src && audio.readyState >= 1) {
        const audioMs = audio.currentTime * 1000;
        if (Math.abs(audioMs - positionMs) > 1500) {
          try {
            audio.currentTime = positionMs / 1000;
          } catch {}
        }
      }

      // Volume + mute (always apply)
      audio.volume = muted ? 0 : volume;
      audio.muted = muted;
    });

    const onTime = () => {
      const ms = Math.floor(audio.currentTime * 1000);
      const store = usePlayerStore.getState();
      if (Math.abs(store.positionMs - ms) > 250) store.setPosition(ms);
    };
    const onDur = () => {
      if (Number.isFinite(audio.duration)) {
        usePlayerStore
          .getState()
          .setDuration(Math.floor(audio.duration * 1000));
      }
    };
    const onEnd = () => {
      // Only auto-advance for local files
      const current = usePlayerStore.getState().current;
      if (current?.source === "local") {
        usePlayerStore.getState().next();
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("ended", onEnd);

    return () => {
      unsub();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      crossOrigin="anonymous"
      preload="metadata"
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}