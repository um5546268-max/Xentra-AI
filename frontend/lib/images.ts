import api from "./api";

export type GeneratedImage = {
  id: string;
  prompt: string;
  enhanced_prompt: string | null;
  provider: string;
  model: string;
  width: number;
  height: number;
  seed: number | null;
  image_url: string;
  created_at: string;
};

export type ImageListResponse = {
  count: number;
  images: GeneratedImage[];
};

export const generateImage = async (options: {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
}): Promise<GeneratedImage> => {
  const res = await api.post("/api/images/generate", {
    prompt: options.prompt,
    width: options.width ?? 1024,
    height: options.height ?? 1024,
    model: options.model ?? "flux",
    seed: options.seed,
  });
  return res.data;
};

export const listImages = async (limit = 50): Promise<ImageListResponse> => {
  const res = await api.get("/api/images", { params: { limit } });
  return res.data;
};

export const deleteImage = async (id: string): Promise<void> => {
  await api.delete(`/api/images/${id}`, {
    transformResponse: [(data) => data],
  });
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const resolveImageUrl = (url: string): string => {
  if (!url) return "";
  // If it's already absolute (http/https), return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Relative path — prefix with API URL
  return `${API_URL}${url}`;
};