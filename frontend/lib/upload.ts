import api from "./api";

export type UploadResult = {
  url: string;
  key: string;
  name: string;
  size: number;
  mime: string;
  type: "image" | "file" | "voice" | "video";
  message_id: string | null;
};

export const uploadToChat = async (
  chatId: string,
  file: File | Blob,
  filename?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const form = new FormData();
  // If it's a Blob (from MediaRecorder) we need to give it a filename
  if (file instanceof File) {
    form.append("file", file);
  } else {
    form.append("file", file, filename || "voice.webm");
  }

  const res = await api.post(`/api/chats/${chatId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
};