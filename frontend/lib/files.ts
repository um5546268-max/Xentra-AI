import api from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserFile = {
  id: string;
  original_name: string;
  mime_type: string | null;
  extension: string | null;
  size_bytes: number;
  status: "uploaded" | "extracting" | "ready" | "failed";
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FileDetail = UserFile & {
  extracted_meta: Record<string, any> | null;
  has_text: boolean;
};

export type FileListResponse = {
  count: number;
  files: UserFile[];
};

export type FilePreview = {
  has_text: boolean;
  status: string;
  text: string;
  length: number;
  meta?: Record<string, any>;
};

// ----- List -----

export const listFiles = async (): Promise<FileListResponse> => {
  const res = await api.get("/api/files");
  return res.data;
};

// ----- Upload -----

export const uploadFile = async (
  file: globalThis.File,
  onProgress?: (percent: number) => void
): Promise<UserFile> => {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/api/files/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300_000,  // 5 min — big PDFs + OCR can take a while
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
};

// ----- Get / Preview / Download -----

export const getFile = async (id: string): Promise<FileDetail> => {
  const res = await api.get(`/api/files/${id}`);
  return res.data;
};

export const previewFile = async (
  id: string,
  maxChars = 5000
): Promise<FilePreview> => {
  const res = await api.get(`/api/files/${id}/preview`, {
    params: { max_chars: maxChars },
  });
  return res.data;
};

export const downloadFileUrl = (id: string): string => {
  const token = localStorage.getItem("xentra_token");
  return `${API_URL}/api/files/${id}/download?token=${token}`;
};

// ----- Attach / Detach -----

export const attachFile = async (
  fileId: string,
  conversationId: string
): Promise<UserFile> => {
  const res = await api.post(`/api/files/${fileId}/attach`, {
    conversation_id: conversationId,
  });
  return res.data;
};

export const detachFile = async (fileId: string): Promise<void> => {
  await api.delete(`/api/files/${fileId}/attach`, {
    transformResponse: [(data) => data],
  });
};

// ----- Delete -----

export const deleteFile = async (id: string): Promise<void> => {
  await api.delete(`/api/files/${id}`, {
    transformResponse: [(data) => data],
  });
};

// ----- Helpers -----

export const formatBytes = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
};

export const fileIconColor = (ext: string | null): string => {
  const e = (ext || "").toLowerCase();
  if (e === ".pdf") return "text-red-400 bg-red-500/10";
  if ([".doc", ".docx", ".odt", ".rtf"].includes(e)) return "text-blue-400 bg-blue-500/10";
  if ([".xls", ".xlsx", ".csv", ".tsv"].includes(e)) return "text-emerald-400 bg-emerald-500/10";
  if ([".ppt", ".pptx"].includes(e)) return "text-orange-400 bg-orange-500/10";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(e)) return "text-purple-400 bg-purple-500/10";
  if ([".txt", ".md", ".rst", ".log"].includes(e)) return "text-slate-400 bg-slate-500/10";
  if ([".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".c", ".cpp"].includes(e)) return "text-cyan-400 bg-cyan-500/10";
  if ([".json", ".yaml", ".yml", ".xml"].includes(e)) return "text-yellow-400 bg-yellow-500/10";
  return "text-slate-400 bg-slate-500/10";
};