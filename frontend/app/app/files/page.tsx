"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  MessageSquare,
  Loader2,
  AlertCircle,
  Check,
  X,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import {
  listFiles,
  uploadFile,
  deleteFile,
  previewFile,
  getFile,
  attachFile,
  detachFile,
  downloadFileUrl,
  formatBytes,
  fileIconColor,
  UserFile,
  FileDetail,
  FilePreview,
} from "@/lib/files";
import api from "@/lib/api";
import { useFilesStore } from "@/lib/files-store";

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [attachFileId, setAttachFileId] = useState<string | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await listFiles();
      setFiles(res.files);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setInfo(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadFile(file, setUploadProgress);
        setFiles((prev) => [uploaded, ...prev]);
      }
      setInfo(`${fileList.length} file(s) uploaded`);
      setTimeout(() => setInfo(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (previewFileId === id) {
        setPreviewFileId(null);
        setPreviewData(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const openPreview = async (id: string) => {
    setPreviewFileId(id);
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const data = await previewFile(id, 5000);
      setPreviewData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFileId(null);
    setPreviewData(null);
  };

  const handleChatWithFile = async (file: UserFile) => {
    try {
      // Create a new conversation
      const convo = await api.post("/api/conversations", {
        title: `Chat about ${file.original_name}`.slice(0, 60),
      });

      // Attach file to the conversation
      await attachFile(file.id, convo.data.id);
      await loadFiles();

      // Navigate
      router.push(`/app/c/${convo.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to start chat");
    }
  };

  const handleAttachExisting = async (
    fileId: string,
    conversationId: string
  ) => {
    try {
      await attachFile(fileId, conversationId);
      setAttachFileId(null);
      await loadFiles();
      setInfo("File attached");
      setTimeout(() => setInfo(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleDetach = async (fileId: string) => {
    try {
      await detachFile(fileId);
      await loadFiles();
      setInfo("File detached");
      setTimeout(() => setInfo(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Files</h1>
            <p className="text-sm text-slate-500">
              Upload documents and chat with them.
            </p>
          </div>
        </div>

        <button onClick={() => useFilesStore.getState().clear()}>
  Clear results
</button>

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
            dragging
              ? "border-violet-500 bg-violet-500/10"
              : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-violet-400 animate-spin" />
              <div className="text-sm text-slate-300">Uploading…</div>
              <div className="w-64 mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-violet-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">{uploadProgress}%</div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-500" />
              <div className="text-sm text-slate-300">
                Drop files here or click to upload
              </div>
              <div className="text-xs text-slate-500">
                PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG · Max 50 MB
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {info}
          </div>
        )}

        {/* Files grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Your files · {files.length}
            </h2>
          </div>

          {loading ? (
            <div className="text-center text-slate-600 py-12">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-700" />
              <div className="text-sm text-slate-500">
                No files yet. Upload one to get started.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  onPreview={() => openPreview(f.id)}
                  onDelete={() => handleDelete(f.id)}
                  onChat={() => handleChatWithFile(f)}
                  onDetach={() => handleDetach(f.id)}
                  onAttach={() => setAttachFileId(f.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewFileId && (
        <PreviewModal
          loading={previewLoading}
          data={previewData}
          file={files.find((f) => f.id === previewFileId) || null}
          onClose={closePreview}
          onDownload={() => {
            window.open(downloadFileUrl(previewFileId), "_blank");
          }}
        />
      )}

      {/* Attach modal */}
      {attachFileId && (
        <AttachModal
          fileId={attachFileId}
          onClose={() => setAttachFileId(null)}
          onAttach={handleAttachExisting}
        />
      )}
    </div>
  );
}

// ============================================================
// File Card
// ============================================================

function FileCard({
  file,
  onPreview,
  onDelete,
  onChat,
  onDetach,
  onAttach,
}: {
  file: UserFile;
  onPreview: () => void;
  onDelete: () => void;
  onChat: () => void;
  onDetach: () => void;
  onAttach: () => void;
}) {
  const isReady = file.status === "ready";
  const isFailed = file.status === "failed";
  const isExtracting = file.status === "extracting";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 hover:border-slate-700 transition">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fileIconColor(
            file.extension
          )}`}
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-200 truncate">
            {file.original_name}
          </div>
          <div className="text-xs text-slate-500">
            {formatBytes(file.size_bytes)} ·{" "}
            {(file.extension || "").toUpperCase().replace(".", "")}
          </div>
        </div>

        {/* Status */}
        {isExtracting && (
          <div className="shrink-0">
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          </div>
        )}
        {isReady && (
          <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}
        {isFailed && (
          <div className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
        )}
      </div>

      {/* Attached indicator */}
      {file.conversation_id && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-2 py-1.5 text-[11px] text-blue-300">
          <MessageSquare className="w-3 h-3" />
          <span className="truncate flex-1">Attached to a conversation</span>
          <button
            onClick={onDetach}
            className="text-blue-400 hover:text-blue-200"
            title="Detach"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>

        {isReady && !file.conversation_id && (
          <button
            onClick={onChat}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs text-white hover:bg-violet-500 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
        )}

        {isReady && !file.conversation_id && (
          <button
            onClick={onAttach}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Attach
          </button>
        )}

        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-lg border border-red-700/50 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/40 transition ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Preview Modal
// ============================================================

function PreviewModal({
  loading,
  data,
  file,
  onClose,
  onDownload,
}: {
  loading: boolean;
  data: FilePreview | null;
  file: UserFile | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">
              {file?.original_name}
            </div>
            {file && (
              <div className="text-xs text-slate-500">
                {formatBytes(file.size_bytes)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading preview…
            </div>
          ) : !data?.has_text ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No extracted text available.
              <br />
              Status: {data?.status}
            </div>
          ) : (
            <div className="space-y-3">
              {data.meta && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {data.meta.pages && <span>📄 {data.meta.pages} pages</span>}
                  {data.meta.method && <span>🔍 {data.meta.method}</span>}
                  {data.meta.chunks && <span>📦 {data.meta.chunks} chunks</span>}
                  <span>📝 {data.length.toLocaleString()} chars</span>
                </div>
              )}
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                {data.text}
                {data.length > 5000 && (
                  <span className="text-slate-600">
                    {"\n\n"}… [{data.length - 5000} more chars]
                  </span>
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Attach Modal
// ============================================================

function AttachModal({
  fileId,
  onClose,
  onAttach,
}: {
  fileId: string;
  onClose: () => void;
  onAttach: (fileId: string, conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/conversations")
      .then((res) => setConversations(res.data))
      .catch(() => setError("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-medium">Attach to conversation</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400 text-sm">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => onAttach(fileId, c.id)}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-900 transition"
              >
                <div className="text-sm text-slate-200 truncate">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}