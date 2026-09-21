import api from "./api";

// ----- Spotify -----

export type SpotifyProfile = {
  id: string;
  display_name: string;
  email: string;
  product: "premium" | "free";
  followers: number;
  image: string | null;
  country: string;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration_ms: number;
  image: string | null;
  url: string;
  uri: string;
};

export type NowPlaying = {
  playing: boolean;
  progress_ms: number;
  track: {
    id: string;
    name: string;
    artist: string;
    album: string;
    duration_ms: number;
    image: string | null;
    url: string;
  } | null;
};

export const spotifyMe = async (): Promise<SpotifyProfile> => {
  const res = await api.get("/api/spotify/me");
  return res.data;
};

export const spotifyNowPlaying = async (): Promise<NowPlaying> => {
  const res = await api.get("/api/spotify/now-playing");
  return res.data;
};

export const spotifySearch = async (
  query: string,
  maxResults: number = 25
): Promise<SpotifyTrack[]> => {
  const res = await api.get("/api/spotify/search", {
    params: { q: query, max_results: maxResults },
  });
  return res.data.results ?? res.data;
};

export const spotifyPlay = async (uri?: string): Promise<void> => {
  await api.post("/api/spotify/play", uri ? { uri } : {});
};

export const spotifyPause = async (): Promise<void> => {
  await api.post("/api/spotify/pause");
};

export const spotifyNext = async (): Promise<void> => {
  await api.post("/api/spotify/next");
};

export const spotifyPrevious = async (): Promise<void> => {
  await api.post("/api/spotify/previous");
};

// ----- YouTube -----

export type YouTubeVideo = {
  video_id: string;
  title: string;
  description: string;
  channel: string;
  published_at: string;
  thumbnail: string;
  url: string;
  embed_url: string;
  views: number;
  likes: number;
  duration: string;
};

export const youtubeSearch = async (
  query: string,
  maxResults: number = 25
): Promise<YouTubeVideo[]> => {
  const res = await api.get("/api/youtube/search", {
    params: { q: query, max_results: maxResults },
  });
  return res.data.results ?? res.data;
};

// ----- Local Media -----

export type MediaRoot = {
  path: string;
  name: string;
  exists: boolean;
  label: string;
};

export type MediaFile = {
  path: string;
  name: string;
  title: string;
  kind: "audio" | "video";
  extension: string;
  size_bytes: number;
  modified_at: string;
  relative_path: string;
};

export const listMediaRoots = async (): Promise<MediaRoot[]> => {
  const res = await api.get("/api/media/roots");
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.roots)) return data.roots;
  return [];
};

export const scanMedia = async (
  rootIndex: number,
  kind?: "audio" | "video",
): Promise<{ count: number; files: MediaFile[]; root_name: string }> => {
  const res = await api.get("/api/media/scan", {
    params: { root_index: rootIndex, ...(kind ? { kind } : {}) },
  });
  return res.data;
};