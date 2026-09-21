"use client";

import { useCallback } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Music,
  Video,
  FolderOpen,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  spotifySearch,
  spotifyPlay,
  spotifyPause,
  spotifyNext,
  spotifyPrevious,
  spotifyNowPlaying,
  SpotifyTrack,
  NowPlaying,
  youtubeSearch,
  YouTubeVideo,
  listMediaRoots,
  scanMedia,
  MediaFile,
  MediaRoot,
} from "@/lib/media";
import { useMediaStore } from "@/lib/media-store";
import { usePlayerStore } from "@/lib/player-store";

type Tab = "spotify" | "youtube" | "local";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MediaPage() {
  const { tab, setTab, clear } = useMediaStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
              <Music className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Media</h1>
              <p className="text-sm text-slate-500">
                Music, videos, and local files — all in one place.
              </p>
            </div>
          </div>

          <button
            onClick={clear}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Clear results
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          <TabButton
            active={tab === "spotify"}
            onClick={() => setTab("spotify")}
            icon={<Music className="w-3.5 h-3.5" />}
            label="Spotify"
          />
          <TabButton
            active={tab === "youtube"}
            onClick={() => setTab("youtube")}
            icon={<Video className="w-3.5 h-3.5" />}
            label="YouTube"
          />
          <TabButton
            active={tab === "local"}
            onClick={() => setTab("local")}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            label="Local files"
          />
        </div>

        {tab === "spotify" && <SpotifyTab />}
        {tab === "youtube" && <YouTubeTab />}
        {tab === "local" && <LocalTab />}
      </div>
    </div>
  );
}

// ============================================================
// Tab Button
// ============================================================
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// Spotify Tab
// ============================================================
function SpotifyTab() {
  const {
    spotifyQuery: query,
    setSpotifyQuery: setQuery,
    spotifyTracks: tracks,
    setSpotifyTracks: setTracks,
  } = useMediaStore();

  const { play } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<NowPlaying | null>(null);

  const refreshNow = async () => {
    try {
      setNow(await spotifyNowPlaying());
    } catch {
      setNow(null);
    }
  };

  useInterval(refreshNow, 5000);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await spotifySearch(query.trim(), 50);
      setTracks(results);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (track: SpotifyTrack) => {
    try {
      setError(null);
      await spotifyPlay(track.uri);
      play(
        {
          id: track.id,
          title: track.name,
          artist: track.artist,
          image: track.image,
          uri: track.uri,
          source: "spotify",
          duration_ms: (track as any).duration_ms,
        },
        tracks.map((t) => ({
          id: t.id,
          title: t.name,
          artist: t.artist,
          image: t.image,
          uri: t.uri,
          source: "spotify" as const,
          duration_ms: (t as any).duration_ms,
        }))
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Play failed");
    }
  };

  const handlePause = async () => {
    try {
      setError(null);
      await spotifyPause();
      usePlayerStore.getState().pause();
      setTimeout(refreshNow, 500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      await spotifyPlay();
      usePlayerStore.getState().resume();
      setTimeout(refreshNow, 800);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleNext = async () => {
    try {
      await spotifyNext();
      usePlayerStore.getState().next();
      setTimeout(refreshNow, 800);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handlePrevious = async () => {
    try {
      await spotifyPrevious();
      usePlayerStore.getState().previous();
      setTimeout(refreshNow, 800);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6">
      {now?.track && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 flex gap-4 items-center">
          {now.track.image && (
            <img
              src={now.track.image}
              alt={now.track.name}
              className="w-16 h-16 rounded-lg shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-violet-400 mb-1">
              {now.playing ? "Now Playing" : "Paused"}
            </div>
            <div className="font-semibold truncate">{now.track.name}</div>
            <div className="text-sm text-slate-400 truncate">
              {now.track.artist}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handlePrevious}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            {now.playing ? (
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Spotify…"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {tracks.length > 0 && (
        <div className="space-y-1">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900/60 transition"
            >
              {t.image && (
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {t.artist} · {t.album}
                </div>
              </div>
              <button
                onClick={() => handlePlay(t)}
                className="opacity-0 group-hover:opacity-100 transition p-2 rounded-lg bg-violet-600 hover:bg-violet-500"
                title="Play"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// YouTube Tab
// ============================================================
function YouTubeTab() {
  const {
    youtubeQuery: query,
    setYoutubeQuery: setQuery,
    youtubeVideos: videos,
    setYoutubeVideos: setVideos,
    youtubePlayingId: playingId,
    setYoutubePlayingId: setPlayingId,
    youtubePlayMode: playMode,
    setYoutubePlayMode: setPlayMode,
  } = useMediaStore();

  const { play, pause, stop } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPlayingId(null);
    try {
      const results = await youtubeSearch(query.trim(), 50);
      setVideos(results);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = (v: YouTubeVideo) => {
    setPlayingId(v.video_id);

    if (playMode === "inline") {
      // Playing locally in the Media page — stop the global mini player
      stop();
      return;
    }

    // Mini player mode — push to the global YouTube player
    play(
      {
        id: v.video_id,
        title: v.title,
        artist: v.channel,
        image: v.thumbnail,
        url: `https://www.youtube.com/embed/${v.video_id}?autoplay=1`,
        source: "youtube",
      },
      videos.map((x) => ({
        id: x.video_id,
        title: x.title,
        artist: x.channel,
        image: x.thumbnail,
        url: `https://www.youtube.com/embed/${x.video_id}?autoplay=1`,
        source: "youtube" as const,
      }))
    );
  };

  const handleModeSwitch = (mode: "mini" | "inline") => {
    setPlayMode(mode);
    // Stop whichever player is active so we don't double-play
    stop();
    setPlayingId(null);
  };

  const formatViews = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="space-y-6">
      {/* Play-mode toggle */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Play in:</span>
        <button
          onClick={() => handleModeSwitch("mini")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
            playMode === "mini"
              ? "border-violet-500 bg-violet-500/20 text-violet-300"
              : "border-slate-700 text-slate-500 hover:text-slate-300"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          Mini Player
        </button>
        <button
          onClick={() => handleModeSwitch("inline")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
            playMode === "inline"
              ? "border-red-500 bg-red-500/20 text-red-300"
              : "border-slate-700 text-slate-500 hover:text-slate-300"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Inline (this page)
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube…"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-500 disabled:opacity-40 transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Player area — depends on mode */}
      {playingId && playMode === "inline" && (
        <div className="rounded-2xl overflow-hidden border border-red-500/40 aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${playingId}?autoplay=1`}
            title="YouTube video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {playingId && playMode === "mini" && (
        <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-black aspect-video relative">
          {(() => {
            const current = videos.find((v) => v.video_id === playingId);
            return current?.thumbnail ? (
              <img
                src={current.thumbnail}
                alt={current.title}
                className="w-full h-full object-cover opacity-40"
              />
            ) : null;
          })()}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
            <Play className="w-12 h-12" />
            <div className="text-xs uppercase tracking-wider text-slate-300">
              Playing in mini player →
            </div>
          </div>
        </div>
      )}

      {/* Video grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {videos.map((v) => (
            <button
              key={v.video_id}
              onClick={() => handlePlayVideo(v)}
              className={`text-left rounded-2xl overflow-hidden border transition group ${
                playingId === v.video_id
                  ? "border-red-500"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="relative">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="text-sm font-medium text-slate-200 line-clamp-2">
                  {v.title}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {v.channel}
                </div>
                <div className="text-xs text-slate-600">
                  {formatViews(v.views)} views · {v.likes} likes
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Local Media Tab
// ============================================================
function LocalTab() {
  const {
    localRootIndex: selectedRoot,
    setLocalRootIndex: setSelectedRoot,
    localKind: kindFilter,
    setLocalKind: setKindFilter,
    localFiles: files,
    setLocalFiles: setFiles,
  } = useMediaStore();

  const { play } = usePlayerStore();
  const [roots, setRoots] = useState<MediaRoot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoots = useCallback(async () => {
    try {
      const r = await listMediaRoots();
      setRoots(r ?? []);
      if (selectedRoot === null) {
        const firstValid = r.findIndex((x: MediaRoot) => x.exists);
        if (firstValid >= 0) setSelectedRoot(firstValid);
      }
    } catch (err: any) {
      console.error("[LocalTab] loadRoots failed:", err);
      setError(err?.message || "Failed to load roots");
    }
  }, [selectedRoot, setSelectedRoot]);

  useEffect(() => {
    loadRoots();
  }, [loadRoots]);


  const handleScan = async () => {
    if (selectedRoot === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scanMedia(selectedRoot, kindFilter);
      setFiles(res.files);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayLocal = (f: MediaFile) => {
    // Stream through the backend so the audio element can play it.
    // Falls back to any stream_url the backend already provides.
    const url =
      (f as any).stream_url ||
      `${API_URL}/api/media/file?path=${encodeURIComponent(f.relative_path)}`

    play(
      {
        id: f.relative_path,
        title: f.title,
        artist: f.relative_path.split(/[\\/]/).slice(-2, -1)[0] ?? "",
        url,
        source: "local",
        duration_ms: (f as any).duration_ms,
      },
       files.map((x: MediaFile) => ({
        id: x.relative_path,
        title: x.title,
        artist: x.relative_path.split(/[\\/]/).slice(-2, -1)[0] ?? "",
        url:
          (x as any).stream_url ||
          `${API_URL}/api/media/file?path=${encodeURIComponent(
            x.relative_path
          )}`,
        source: "local" as const,
        duration_ms: (x as any).duration_ms,
      }))
    );
  };

  const formatBytes = (n: number): string => {
    if (n >= 1_000_000_000) return `${(n / 1e9).toFixed(1)} GB`;
    if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)} MB`;
    if (n >= 1_000) return `${(n / 1e3).toFixed(1)} KB`;
    return `${n} B`;
  };

  return (
    <div className="space-y-6">
      {!roots || roots.length === 0 ? (
        <div className="text-center py-16 text-slate-600 text-sm">
          No media roots configured. Add paths to <code>MEDIA_ROOTS</code> in
          your backend <code>.env</code>.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                Root folder
              </label>
              <select
                value={selectedRoot ?? ""}
                onChange={(e) => setSelectedRoot(parseInt(e.target.value))}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              >
                {roots.map((r, i) => (
                  <option key={i} value={i} disabled={!r.exists}>
                    {r.label} {!r.exists ? "(missing)" : ""}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 ml-auto">
                <FilterBtn
                  active={!kindFilter}
                  onClick={() => setKindFilter(undefined)}
                  label="All"
                />
                <FilterBtn
                  active={kindFilter === "audio"}
                  onClick={() => setKindFilter("audio")}
                  label="Audio"
                />
                <FilterBtn
                  active={kindFilter === "video"}
                  onClick={() => setKindFilter("video")}
                  label="Video"
                />
              </div>

              <button
                onClick={handleScan}
                disabled={loading || selectedRoot === null}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Scan"
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500 px-1">
                {files.length} files
              </div>
              {files.map((f, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900/60 transition"
                >
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                      f.kind === "audio"
                        ? "bg-pink-500/20 text-pink-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {f.kind === "audio" ? (
                      <Music className="w-4 h-4" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">
                      {f.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.relative_path}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0">
                    {formatBytes(f.size_bytes)}
                  </div>
                  <button
                    onClick={() => handlePlayLocal(f)}
                    className="opacity-0 group-hover:opacity-100 transition p-2 rounded-lg bg-violet-600 hover:bg-violet-500"
                    title="Play"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="text-center py-16 text-slate-600 text-sm">
              Click <strong className="text-slate-400">Scan</strong> to browse
              this folder.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs transition ${
        active
          ? "bg-violet-500/20 text-violet-300"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// useInterval
// ============================================================
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      savedCallback.current();
      return;
    }
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}