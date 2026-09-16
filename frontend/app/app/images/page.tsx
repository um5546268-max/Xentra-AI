"use client";

import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  Copy,
  RefreshCw,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import {
  generateImage,
  listImages,
  deleteImage,
  resolveImageUrl,
  GeneratedImage,
} from "@/lib/images";

const MODELS = [
  { id: "flux", label: "Flux (best quality)" },
  { id: "turbo", label: "Turbo (fastest)" },
  { id: "flux-realism", label: "Flux Realism (photographic)" },
  { id: "flux-anime", label: "Flux Anime (manga style)" },
  { id: "flux-3d", label: "Flux 3D (stylized 3D)" },
];

const SIZES = [
  { label: "Square 1:1", width: 1024, height: 1024 },
  { label: "Landscape 16:9", width: 1344, height: 768 },
  { label: "Portrait 9:16", width: 768, height: 1344 },
  { label: "Wide 21:9", width: 1536, height: 640 },
];

export default function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("flux");
  const [sizeIdx, setSizeIdx] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<GeneratedImage | null>(null);

  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await listImages(50);
      setGallery(res.images);
    } catch {
      // silent
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setCurrent(null);

    try {
      const size = SIZES[sizeIdx];
      const img = await generateImage({
        prompt: prompt.trim(),
        width: size.width,
        height: size.height,
        model,
      });
      setCurrent(img);
      setGallery((g) => [img, ...g]);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err.message || "Generation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (img: GeneratedImage) => {
    setPrompt(img.prompt);
    setModel(img.model);
    const foundIdx = SIZES.findIndex(
      (s) => s.width === img.width && s.height === img.height
    );
    setSizeIdx(foundIdx >= 0 ? foundIdx : 0);

    setLoading(true);
    setError(null);
    try {
      const fresh = await generateImage({
        prompt: img.prompt,
        width: img.width,
        height: img.height,
        model: img.model,
      });
      setCurrent(fresh);
      setGallery((g) => [fresh, ...g]);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err.message || "Regenerate failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (img: GeneratedImage) => {
    if (!confirm("Delete this image?")) return;
    try {
      await deleteImage(img.id);
      setGallery((g) => g.filter((x) => x.id !== img.id));
      if (current?.id === img.id) setCurrent(null);
      if (preview?.id === img.id) setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleCopyUrl = async (img: GeneratedImage) => {
    try {
      await navigator.clipboard.writeText(resolveImageUrl(img.image_url));
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const handleDownload = async (img: GeneratedImage) => {
    try {
      const res = await fetch(resolveImageUrl(img.image_url));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xentra-${img.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Download failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Image Generator</h1>
            <p className="text-sm text-slate-500">
              Describe what you want. Xentra creates it.
            </p>
          </div>
        </div>

        {/* Generate form */}
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleGenerate();
              }
            }}
            placeholder="e.g. a cyberpunk Karachi at night, neon lights, rain, cinematic"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            disabled={loading}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                disabled={loading}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Size</label>
              <select
                value={sizeIdx}
                onChange={(e) => setSizeIdx(parseInt(e.target.value))}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                disabled={loading}
              >
                {SIZES.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto">
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-600">
            Try:{" "}
            {[
              "a cyberpunk Karachi at night, neon lights",
              "minimalist logo of a fox, flat design",
              "a cat wearing an astronaut suit, digital art",
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                className="text-violet-400 hover:underline mr-2 text-left"
              >
                {s.length > 35 ? s.slice(0, 35) + "…" : s}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your image…
            </div>
            <div className="w-full aspect-square max-w-md mx-auto rounded-lg bg-slate-900/60 flex items-center justify-center text-slate-600 text-xs">
              This usually takes 3–8 seconds
            </div>
          </div>
        )}

        {/* Current image */}
        {current && !loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <img
              src={resolveImageUrl(current.image_url)}
              alt={current.prompt}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4 space-y-3">
              <div className="text-sm text-slate-300">{current.prompt}</div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>
                  {current.width}×{current.height}
                </span>
                <span>· {current.model}</span>
                {current.seed && <span>· seed {current.seed}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionBtn
                  onClick={() => handleDownload(current)}
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Download"
                />
                <ActionBtn
                  onClick={() => handleRegenerate(current)}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  label="Regenerate"
                />
                <ActionBtn
                  onClick={() => handleCopyUrl(current)}
                  icon={
                    copiedId === current.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                  label={copiedId === current.id ? "Copied" : "Copy URL"}
                />
                <ActionBtn
                  onClick={() => handleDelete(current)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  label="Delete"
                  danger
                />
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Gallery · {gallery.length}
            </h2>
          </div>

          {galleryLoading ? (
            <div className="text-center text-slate-600 text-sm py-8">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : gallery.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              No images yet. Generate your first one above.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setPreview(img)}
                  className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-violet-500/50 transition aspect-square bg-slate-950"
                >
                  <img
                    src={resolveImageUrl(img.image_url)}
                    alt={img.prompt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                    <div className="text-[10px] text-slate-300 line-clamp-2 text-left">
                      {img.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-w-3xl w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">{preview.prompt}</div>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={resolveImageUrl(preview.image_url)}
              alt={preview.prompt}
              className="w-full rounded-lg"
            />
            <div className="flex justify-center gap-2 flex-wrap">
              <ActionBtn
                onClick={() => handleDownload(preview)}
                icon={<Download className="w-3.5 h-3.5" />}
                label="Download"
              />
              <ActionBtn
                onClick={() => handleRegenerate(preview)}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label="Regenerate"
              />
              <ActionBtn
                onClick={() => handleDelete(preview)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                label="Delete"
                danger
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  danger = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg border px-3 py-1.5 text-xs flex items-center gap-1.5 transition ${
        danger
          ? "border-red-700/50 text-red-300 hover:bg-red-950/40"
          : "border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}