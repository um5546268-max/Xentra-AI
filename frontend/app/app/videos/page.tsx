"use client";

import { useEffect, useRef, useState } from "react";
import {
  Video,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  AlertCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Settings2,
  RefreshCw,
} from "lucide-react";
import {
  generateVideo,
  listVideos,
  getVideoStatus,
  deleteVideo,
  listVideoProviders,
  getVideoOptions,
  timeAgo,
  GeneratedVideo,
  VideoProvider,
  VideoOptions,
} from "@/lib/videos";

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════
const DEFAULTS = {
  prompt: "",
  negative_prompt: "",
  provider: "wan",
  duration: 5,
  resolution: "1280x720",
  aspect_ratio: "16:9",
  fps: 24,
  seed: undefined as number | undefined,
  motion_strength: 5,
  guidance_scale: 7.5,
  style: "",
  camera_movement: "",
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER CAPABILITY LIMITS
// ═══════════════════════════════════════════════════════════════
const PROVIDER_LIMITS: Record<
  string,
  {
    durations: number[];    // allowed values
    fps: number[];           // allowed values
    showFps: boolean;
    showGuidance: boolean;
    showSeed: boolean;
    showMotion: boolean;
    note?: string;
  }
> = {
  wan: {
    durations: [5],              // Wan 2.1 only supports 5s
    fps: [24],                   // fixed at 24fps
    showFps: false,
    showGuidance: false,
    showSeed: true,
    showMotion: true,
    note: "Wan 2.1 generates 5-second clips at 24fps.",
  },
  sora: {
    durations: [5, 10, 15, 20],
    fps: [24, 30],
    showFps: true,
    showGuidance: false,
    showSeed: true,
    showMotion: true,
    note: "Sora 2 supports longer clips, up to 20s.",
  },
  replicate: {
    durations: [3, 5, 10, 15, 20],
    fps: [12, 16, 24, 30, 60],
    showFps: true,
    showGuidance: true,
    showSeed: true,
    showMotion: true,
  },
};

function getLimits(provider: string) {
  return PROVIDER_LIMITS[provider] ?? PROVIDER_LIMITS.wan;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function VideosPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [providers, setProviders] = useState<VideoProvider[]>([]);
  const [options, setOptions] = useState<VideoOptions | null>(null);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limits = getLimits(form.provider);

  // ── Load ──
  const load = async () => {
    setLoading(true);
    try {
      const [p, o, v] = await Promise.all([
        listVideoProviders(),
        getVideoOptions(),
        listVideos(),
      ]);
      setProviders(p);
      setOptions(o);
      setVideos(v.videos);
    } catch (e) {
      console.error("[videos] load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Auto-clamp duration/fps when provider changes ──
  useEffect(() => {
    setForm((f) => {
      const lim = getLimits(f.provider);
      const duration = lim.durations.includes(f.duration)
        ? f.duration
        : lim.durations[0];
      const fps = lim.fps.includes(f.fps) ? f.fps : lim.fps[0];
      return { ...f, duration, fps };
    });
  }, [form.provider]);

  // ── Poll in-progress videos ──
  useEffect(() => {
    const active = videos.filter(
      (v) => v.status === "running" || v.status === "queued"
    );

    if (active.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      const live = videos.filter(
        (v) => v.status === "running" || v.status === "queued"
      );
      for (const v of live) {
        try {
          const updated = await getVideoStatus(v.id);
          setVideos((prev) =>
            prev.map((x) => (x.id === updated.id ? updated : x))
          );
        } catch {}
      }
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [videos]);

  // ── Form helpers ──
  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prompt.trim() || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const video = await generateVideo({
        prompt: form.prompt.trim(),
        negative_prompt: form.negative_prompt.trim() || undefined,
        provider: form.provider,
        duration: form.duration,
        resolution: form.resolution,
        aspect_ratio: form.aspect_ratio,
        fps: form.fps,
        seed: form.seed,
        motion_strength: form.motion_strength,
        guidance_scale: form.guidance_scale,
        style: form.style || undefined,
        camera_movement: form.camera_movement || undefined,
      });
      setVideos((prev) => [video, ...prev]);
      setForm({ ...DEFAULTS, provider: form.provider });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err.message || "Generation failed"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    try {
      await deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      alert("Delete failed");
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
              <Video className="w-5 h-5 text-fuchsia-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Video Generator</h1>
              <p className="text-sm text-slate-500">
                Turn text into video. Full control over style, duration, motion.
              </p>
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4"
        >
          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) => update("prompt", e.target.value)}
              placeholder="A cat playing piano in a sunlit room, cinematic lighting, slow dolly-in"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
              disabled={generating}
            />
          </div>

          {/* Quick options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              label="Provider"
              value={form.provider}
              onChange={(v) => update("provider", v)}
              options={providers.map((p) => ({
                value: p.key,
                label: p.label + (p.available ? "" : " (no key)"),
                disabled: !p.available,
              }))}
            />

            <Select
              label="Duration"
              value={String(form.duration)}
              onChange={(v) => update("duration", Number(v))}
              options={(options?.durations ?? [5, 10, 15, 20]).map((d) => {
                const allowed = limits.durations.includes(d);
                return {
                  value: String(d),
                  label: allowed
                    ? `${d} seconds`
                    : `${d} seconds (not supported)`,
                  disabled: !allowed,
                };
              })}
            />

            <Select
              label="Resolution"
              value={form.resolution}
              onChange={(v) => update("resolution", v)}
              options={
                options?.resolutions?.map((r) => ({
                  value: r.value,
                  label: r.label,
                })) ?? [{ value: "1280x720", label: "720p HD" }]
              }
            />

            <Select
              label="Aspect ratio"
              value={form.aspect_ratio}
              onChange={(v) => update("aspect_ratio", v)}
              options={
                options?.aspect_ratios?.map((a) => ({
                  value: a.value,
                  label: a.label,
                })) ?? [{ value: "16:9", label: "Landscape (16:9)" }]
              }
            />
          </div>

          {/* Provider note */}
          {limits.note && (
            <div className="text-[11px] text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-md px-2.5 py-1.5">
              ℹ️ {limits.note}
            </div>
          )}

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Advanced options
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              {/* Style + Camera */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Style"
                  value={form.style}
                  onChange={(v) => update("style", v)}
                  options={options?.styles ?? [{ value: "", label: "None" }]}
                />
                <Select
                  label="Camera movement"
                  value={form.camera_movement}
                  onChange={(v) => update("camera_movement", v)}
                  options={
                    options?.camera_movements ?? [{ value: "", label: "Static" }]
                  }
                />
              </div>

              {/* FPS + Seed (fps hidden for Wan) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {limits.showFps ? (
                  <Select
                    label="Frame rate"
                    value={String(form.fps)}
                    onChange={(v) => update("fps", Number(v))}
                    options={(options?.fps_values ?? [12, 16, 24, 30, 60]).map(
                      (f) => {
                        const allowed = limits.fps.includes(f);
                        return {
                          value: String(f),
                          label: allowed
                            ? `${f} fps`
                            : `${f} fps (not supported)`,
                          disabled: !allowed,
                        };
                      }
                    )}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">
                      Frame rate
                    </label>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-500">
                      24 fps (fixed by {form.provider})
                    </div>
                  </div>
                )}

                {limits.showSeed && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">
                      Seed (optional)
                    </label>
                    <input
                      type="number"
                      value={form.seed ?? ""}
                      onChange={(e) =>
                        update(
                          "seed",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="Leave empty for random"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Motion + Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {limits.showMotion && (
                  <Slider
                    label={`Motion strength: ${form.motion_strength}`}
                    value={form.motion_strength}
                    min={1}
                    max={10}
                    onChange={(v) => update("motion_strength", v)}
                  />
                )}
                {limits.showGuidance && (
                  <Slider
                    label={`Guidance scale: ${form.guidance_scale.toFixed(1)}`}
                    value={form.guidance_scale}
                    min={1}
                    max={20}
                    step={0.5}
                    onChange={(v) => update("guidance_scale", v)}
                  />
                )}
              </div>

              {/* Negative prompt */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Negative prompt (what to avoid)
                </label>
                <input
                  value={form.negative_prompt}
                  onChange={(e) => update("negative_prompt", e.target.value)}
                  placeholder="blurry, low quality, distorted, extra limbs"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={generating || !form.prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Gallery */}
        {loading ? (
          <div className="text-center py-16 text-slate-600 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm space-y-2">
            <Video className="w-10 h-10 mx-auto text-slate-700" />
            <div>No videos yet</div>
            <div className="text-slate-700 text-xs">
              Type a prompt above and click Generate.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onDelete={() => handleDelete(v.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIDEO CARD
// ═══════════════════════════════════════════════════════════════
function VideoCard({
  video,
  onDelete,
}: {
  video: GeneratedVideo;
  onDelete: () => void;
}) {
  const isDone = video.status === "done" && video.video_url;
  const isRunning = video.status === "running" || video.status === "queued";
  const isFailed = video.status === "failed";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="aspect-video bg-black relative">
        {isDone && (
          <video
            src={video.video_url!}
            controls
            className="w-full h-full object-cover"
          />
        )}

        {isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <div className="text-xs uppercase tracking-wider">
              {video.status === "queued" ? "Queued…" : "Generating…"}
            </div>
            <div className="w-32 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${video.progress}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
              {video.progress}%
            </div>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 space-y-2 p-4 text-center">
            <AlertCircle className="w-8 h-8" />
            <div className="text-xs">
              {video.error || "Generation failed"}
            </div>
          </div>
        )}

        {!isDone && !isRunning && !isFailed && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <Play className="w-10 h-10" />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-300 line-clamp-2">
          {video.prompt}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
          <span className="uppercase text-violet-400">{video.provider}</span>
          <span>·</span>
          <span>{video.duration_seconds}s</span>
          <span>·</span>
          <span>
            {video.width}×{video.height}
          </span>
          <span>·</span>
          <span>{video.fps}fps</span>
        </div>

        <div className="text-[10px] text-slate-600">
          {timeAgo(video.created_at)}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          {isDone && (
            <a
              href={video.video_url!}
              download
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          )}
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}