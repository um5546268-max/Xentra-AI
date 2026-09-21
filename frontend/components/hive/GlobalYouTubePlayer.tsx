"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/player-store";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Hidden global YouTube iframe that survives all navigation.
 * The player store drives it — audio continues when you switch pages.
 *
 * When the store's `current` is null or not a YouTube track,
 * this player stops itself and does nothing.
 */
export function GlobalYouTubePlayer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const apiRequestedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ─── Ensure the YouTube IFrame API is loaded ───
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    if (!apiRequestedRef.current) {
      apiRequestedRef.current = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      initPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initPlayer() {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "1",
      width: "1",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          applyState();
        },
        onStateChange: (e: any) => {
          // 0 = ended → advance queue
          if (e.data === 0) {
            usePlayerStore.getState().next();
          }
        },
      },
    });

    // Poll position + duration every 500ms (only while a YT track is active)
    setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;

      const store = usePlayerStore.getState();
      if (store.current?.source !== "youtube") return;

      const ms = Math.floor((p.getCurrentTime?.() ?? 0) * 1000);
      const dur = Math.floor((p.getDuration?.() ?? 0) * 1000);
      if (dur > 0 && Math.abs(dur - store.durationMs) > 500) {
        store.setDuration(dur);
      }
      if (ms > 0) store.setPosition(ms);
    }, 500);

    // Subscribe to store changes
    usePlayerStore.subscribe((state) => applyState(state));
  }

  function applyState(state?: any) {
    const p = playerRef.current;
    if (!p || !p.loadVideoById) return;

    const s = state ?? usePlayerStore.getState();
    const { current, playing, positionMs, volume, muted } = s;

    // Only control the iframe when a YouTube track is active.
    // If it's null / a Spotify / a local track, stop the YT iframe.
    if (current?.source !== "youtube") {
      if (currentVideoIdRef.current) {
        currentVideoIdRef.current = null;
        try {
          p.stopVideo?.();
        } catch {}
      }
      return;
    }

    const videoId = current.id;

    // New video? Load it
    if (videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = videoId;
      try {
        if (playing) {
          p.loadVideoById(videoId);
        } else {
          p.cueVideoById(videoId);
        }
        // Restore volume + mute state on new load
        p.setVolume?.(Math.round((muted ? 0 : volume) * 100));
        if (muted) p.mute?.();
        else p.unMute?.();
      } catch {}
      return;
    }

    // Play / pause
    try {
      if (playing) {
        p.playVideo?.();
      } else {
        p.pauseVideo?.();
      }
    } catch {}

    // Volume + mute
    try {
      p.setVolume?.(Math.round((muted ? 0 : volume) * 100));
      if (muted) p.mute?.();
      else p.unMute?.();
    } catch {}

    // Seek if user scrubbed
    try {
      const nowMs = (p.getCurrentTime?.() ?? 0) * 1000;
      if (Math.abs(nowMs - positionMs) > 1500) {
        p.seekTo?.(positionMs / 1000, true);
      }
    } catch {}
  }

  return (
    <div
      ref={containerRef}
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