"use client";

import { useRef, useState } from "react";
import { X, Upload, Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const PRESET_AVATARS = [
  { id: "fox", emoji: "🦊", bg: "from-orange-500 to-red-500" },
  { id: "panda", emoji: "🐼", bg: "from-slate-500 to-slate-700" },
  { id: "lion", emoji: "🦁", bg: "from-amber-500 to-orange-600" },
  { id: "tiger", emoji: "🐯", bg: "from-yellow-500 to-orange-500" },
  { id: "koala", emoji: "🐨", bg: "from-slate-400 to-slate-600" },
  { id: "frog", emoji: "🐸", bg: "from-emerald-500 to-cyan-500" },
  { id: "owl", emoji: "🦉", bg: "from-violet-500 to-indigo-500" },
  { id: "octopus", emoji: "🐙", bg: "from-pink-500 to-violet-500" },
  { id: "unicorn", emoji: "🦄", bg: "from-fuchsia-500 to-pink-500" },
  { id: "dragon", emoji: "🐲", bg: "from-green-500 to-emerald-500" },
  { id: "wolf", emoji: "🐺", bg: "from-cyan-500 to-blue-500" },
  { id: "eagle", emoji: "🦅", bg: "from-red-500 to-orange-500" },
];

export default function AvatarPicker({ onClose }: { onClose: () => void }) {
  const user = useAuth((state) => state.user);
  const updateProfile = useAuth((state) => state.updateProfile);

  const [selected, setSelected] = useState<string | null>(user?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset picker — stores "preset:xxx"
  const handlePickPreset = (id: string) => {
    setSelected(`preset:${id}`);
  };

  // Upload custom image
  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const token = localStorage.getItem("xentra_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_URL}/api/auth/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Upload failed");
        return;
      }
      // Backend returns a short public URL — that's fine to save
      setSelected(data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await updateProfile({ avatar_url: selected });
    setSaving(false);
    if (ok) onClose();
    else setError("Failed to save");
  };

  // Figure out preview
  const previewPreset =
    selected?.startsWith("preset:")
      ? PRESET_AVATARS.find((p) => p.id === selected.slice(7))
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Choose your avatar</h2>
        <p className="text-xs text-slate-500 mb-5">
          Pick a preset or upload your own picture
        </p>

        {/* Preview */}
        <div className="flex justify-center mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg shadow-violet-500/30">
            {previewPreset ? (
              <div className={`w-full h-full bg-gradient-to-br ${previewPreset.bg} flex items-center justify-center text-4xl`}>
                {previewPreset.emoji}
              </div>
            ) : selected && !selected.startsWith("preset:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                {(user?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Upload button */}
        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition disabled:opacity-40"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload your own picture
              </>
            )}
          </button>
        </div>

        {/* Presets */}
        <div className="mb-5">
          <div className="text-xs text-slate-400 mb-2">Or pick a preset</div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((p) => {
              const isActive = selected === `preset:${p.id}`;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePickPreset(p.id)}
                  className={`aspect-square rounded-xl bg-gradient-to-br ${p.bg} flex items-center justify-center text-2xl hover:scale-105 transition relative ${
                    isActive
                      ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950"
                      : ""
                  }`}
                >
                  {p.emoji}
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}