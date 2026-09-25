"use client";

import { useState } from "react";
import {
  X, Languages, Loader2, Copy, Check, ArrowRight,
} from "lucide-react";
import { askXentraPrivate } from "@/lib/chat-api";

const LANGUAGES = [
  { value: "Urdu", label: "🇵🇰 Urdu" },
  { value: "Hindi", label: "🇮🇳 Hindi" },
  { value: "English", label: "🇬🇧 English" },
  { value: "Arabic", label: "🇸🇦 Arabic" },
  { value: "Spanish", label: "🇪🇸 Spanish" },
  { value: "French", label: "🇫🇷 French" },
  { value: "German", label: "🇩🇪 German" },
  { value: "Chinese", label: "🇨🇳 Chinese" },
  { value: "Japanese", label: "🇯🇵 Japanese" },
  { value: "Russian", label: "🇷🇺 Russian" },
];

export default function TranslateModal({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("English");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await askXentraPrivate(chatId, {
        action: "custom",
        prompt:
          `Translate the following text into ${targetLang}. ` +
          `Only output the translation — no explanation, no quotes, no preface.\n\n` +
          `Text to translate:\n"""\n${text.trim()}\n"""`,
      });
      setResult(res.text);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Translate</h2>
            <p className="text-xs text-slate-500">
              Type or paste text → get instant translation
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2">Translate into:</div>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setTargetLang(l.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  targetLang === l.value
                    ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text here…"
          rows={4}
          autoFocus
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none resize-none"
        />

        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className="w-full mt-3 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating…
            </>
          ) : (
            <>
              Translate <ArrowRight className="w-4 h-4" /> {targetLang}
            </>
          )}
        </button>

        {result && (
          <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium">
                {targetLang} translation
              </div>
              <button
                onClick={handleCopy}
                className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-white whitespace-pre-wrap">
              {result}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}