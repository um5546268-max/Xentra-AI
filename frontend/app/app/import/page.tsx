"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Upload, FileText, Music, Link2, Video, Loader2, AlertCircle, Sparkles,
} from "lucide-react";
import { learnFromFile, learnFromText, learnFromTopic } from "@/lib/learn";

type Mode = "file" | "audio" | "text" | "url" | "youtube";

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") || "file") as Mode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // file / audio
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // text
  const [text, setText] = useState("");

  // url / youtube
  const [url, setUrl] = useState("");

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      let session: { id: string } | undefined;

      if (mode === "file" || mode === "audio") {
        if (!file) throw new Error("Choose a file first");
        session = await learnFromFile(file, title || undefined);
      } else if (mode === "text") {
        if (!text.trim() || text.trim().length < 20) {
          throw new Error("Paste at least 20 characters");
        }
        session = await learnFromText(title || "Imported text", text.trim());
      } else if (mode === "url") {
        if (!url.trim()) throw new Error("Paste a URL");
        session = await learnFromTopic(url.trim(), 10);
      } else if (mode === "youtube") {
        if (!url.trim()) throw new Error("Paste a YouTube URL");
        session = await learnFromTopic(url.trim(), 10);
      }

      if (!session) throw new Error("Import returned no session");
      router.push(`/app/learn/${session.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const acceptFor = () => {
    if (mode === "file") return ".pdf,.docx,.doc,.txt,.md";
    if (mode === "audio") return ".mp3,.wav,.m4a,.webm,.ogg,.flac";
    return "";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Upload className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Import & Convert</h1>
            <p className="text-sm text-slate-500">
              Bring in any content. Xentra turns it into flashcards and quizzes.
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <ModeTab
            active={mode === "file"}
            onClick={() => setMode("file")}
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Document"
          />
          <ModeTab
            active={mode === "audio"}
            onClick={() => setMode("audio")}
            icon={<Music className="w-3.5 h-3.5" />}
            label="Audio"
          />
          <ModeTab
            active={mode === "text"}
            onClick={() => setMode("text")}
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Paste text"
          />
          <ModeTab
            active={mode === "url"}
            onClick={() => setMode("url")}
            icon={<Link2 className="w-3.5 h-3.5" />}
            label="Web URL"
          />
          <ModeTab
            active={mode === "youtube"}
            onClick={() => setMode("youtube")}
            icon={<Video className="w-3.5 h-3.5" />}
            label="YouTube"
          />
        </div>

        {/* Input area */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          {(mode === "file" || mode === "audio") && (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
                }}
                className="rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500 transition p-8 text-center cursor-pointer space-y-3"
              >
                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mx-auto">
                      {mode === "audio" ? (
                        <Music className="w-5 h-5 text-cyan-300" />
                      ) : (
                        <FileText className="w-5 h-5 text-cyan-300" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-slate-500 mt-1">Click to change</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>
                      <div className="text-sm text-slate-400">
                        Drop a file or{" "}
                        <span className="text-cyan-400">click to browse</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {mode === "audio"
                          ? "MP3 · WAV · M4A · OGG · FLAC (max 25 MB)"
                          : "PDF · DOCX · TXT · MD (max 25 MB)"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptFor()}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </>
          )}

          {mode === "text" && (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your notes, article, or lecture transcript…"
                rows={10}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none resize-none"
              />
            </>
          )}

          {(mode === "url" || mode === "youtube") && (
            <>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  mode === "youtube"
                    ? "https://www.youtube.com/watch?v=..."
                    : "https://example.com/article"
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <div className="text-xs text-slate-500 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {mode === "youtube"
                    ? "Xentra will use the video's title and topic to generate study material."
                    : "Xentra will treat the URL as a topic and generate flashcards from it."}
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-3 text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing… (up to 60s)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Import & generate study material
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-2">
          <div className="text-xs font-medium text-slate-400">
            What happens after import?
          </div>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Xentra extracts the key concepts</li>
            <li>Generates 10-15 flashcards</li>
            <li>Creates a 10-question quiz</li>
            <li>Builds a mind map you can explore</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
          : "border-slate-700 text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}