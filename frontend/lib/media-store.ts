"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MediaTab = "spotify" | "youtube" | "local";

type Store = {
  tab: MediaTab;
  setTab: (t: MediaTab) => void;

  // Spotify
  spotifyQuery: string;
  spotifyTracks: any[];
  setSpotifyQuery: (q: string) => void;
  setSpotifyTracks: (t: any[]) => void;

  // YouTube
  youtubeQuery: string;
  youtubeVideos: any[];
  youtubePlayingId: string | null;
  youtubePlayMode: "mini" | "inline";
  setYoutubeQuery: (q: string) => void;
  setYoutubeVideos: (v: any[]) => void;
  setYoutubePlayingId: (id: string | null) => void;
  setYoutubePlayMode: (m: "mini" | "inline") => void;

  // Local
  localRootIndex: number | null;
  localKind: "audio" | "video" | undefined;
  localFiles: any[];
  setLocalRootIndex: (i: number | null) => void;
  setLocalKind: (k: "audio" | "video" | undefined) => void;
  setLocalFiles: (f: any[]) => void;

  clear: () => void;
};

export const useMediaStore = create<Store>()(
  persist(
    (set) => ({
      tab: "youtube",
      setTab: (tab) => set({ tab }),

      spotifyQuery: "",
      spotifyTracks: [],
      setSpotifyQuery: (spotifyQuery) => set({ spotifyQuery }),
      setSpotifyTracks: (spotifyTracks) => set({ spotifyTracks }),

      youtubeQuery: "",
      youtubeVideos: [],
      youtubePlayingId: null,
      youtubePlayMode: "mini",
      setYoutubeQuery: (youtubeQuery) => set({ youtubeQuery }),
      setYoutubeVideos: (youtubeVideos) => set({ youtubeVideos }),
      setYoutubePlayingId: (youtubePlayingId) => set({ youtubePlayingId }),
      setYoutubePlayMode: (youtubePlayMode) => set({ youtubePlayMode }),

      localRootIndex: null,
      localKind: undefined,
      localFiles: [],
      setLocalRootIndex: (localRootIndex) => set({ localRootIndex }),
      setLocalKind: (localKind) => set({ localKind }),
      setLocalFiles: (localFiles) => set({ localFiles }),

      clear: () =>
        set({
          spotifyQuery: "",
          spotifyTracks: [],
          youtubeQuery: "",
          youtubeVideos: [],
          youtubePlayingId: null,
          localFiles: [],
        }),
    }),
    { name: "xentra-media-store" }
  )
);