import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type GeneratedVideo = {
  id: string;
  prompt: string;
  provider: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  error: string | null;
  created_at: string;
};

export type VideoProvider = {
  key: string;
  label: string;
  available: boolean;
};

export type ResolutionOption = {
  value: string;
  label: string;
  w: number;
  h: number;
};

export type SimpleOption = {
  value: string;
  label: string;
};

export type VideoOptions = {
  resolutions: ResolutionOption[];
  aspect_ratios: SimpleOption[];
  durations: number[];
  fps_values: number[];
  styles: SimpleOption[];
  camera_movements: SimpleOption[];
};

export type GenerateVideoPayload = {
  prompt: string;
  negative_prompt?: string;
  provider?: string;
  model?: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  fps?: number;
  seed?: number;
  motion_strength?: number;
  guidance_scale?: number;
  style?: string;
  camera_movement?: string;
  image_url?: string;
};

// ═══════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════
export const listVideoProviders = async (): Promise<VideoProvider[]> => {
  const res = await api.get("/api/videos/providers");
  return res.data.providers ?? [];
};

// ═══════════════════════════════════════════════════════════════
// OPTIONS — all configurable values for the UI
// ═══════════════════════════════════════════════════════════════
export const getVideoOptions = async (): Promise<VideoOptions> => {
  const res = await api.get("/api/videos/options");
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════
export const generateVideo = async (
  data: GenerateVideoPayload
): Promise<GeneratedVideo> => {
  const res = await api.post("/api/videos", data);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════
export const listVideos = async (
  limit = 50,
  offset = 0
): Promise<{ total: number; videos: GeneratedVideo[] }> => {
  const res = await api.get("/api/videos", { params: { limit, offset } });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// STATUS — poll this for in-progress videos
// ═══════════════════════════════════════════════════════════════
export const getVideoStatus = async (
  videoId: string
): Promise<GeneratedVideo> => {
  const res = await api.get(`/api/videos/${videoId}/status`);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.delete(`/api/videos/${videoId}`);
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

export const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};