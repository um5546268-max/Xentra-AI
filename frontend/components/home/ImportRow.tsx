"use client";

import { useRouter } from "next/navigation";
import { FileText, Music, Video, Link2, ArrowRight } from "lucide-react";

const IMPORTS = [
  {
    id: "file",
    label: "Import File",
    sub: "PDF, DOCX, PPT, TXT",
    icon: FileText,
    gradient: "from-violet-600 to-violet-700",
    href: "/app/import?mode=file",
  },
  {
    id: "audio",
    label: "Import Audio",
    sub: "MP3, WAV, M4A",
    icon: Music,
    gradient: "from-emerald-600 to-emerald-700",
    href: "/app/import?mode=audio",
  },
  {
    id: "video",
    label: "Import Video",
    sub: "MP4, MKV, MOV",
    icon: Video,
    gradient: "from-pink-600 to-pink-700",
    href: "/app/import?mode=video",
  },
  {
    id: "link",
    label: "Paste Link",
    sub: "YouTube, Website, Article",
    icon: Link2,
    gradient: "from-cyan-600 to-cyan-700",
    href: "/app/import?mode=url",
  },
];

export function ImportRow() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-4 gap-3">
      {IMPORTS.map((imp) => {
        const Icon = imp.icon;
        return (
          <button
            key={imp.id}
            onClick={() => router.push(imp.href)}
            className={`group flex items-center gap-3 rounded-2xl p-4 text-left text-white bg-gradient-to-br ${imp.gradient} hover:brightness-110 transition shadow-lg`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{imp.label}</div>
              <div className="text-[10px] opacity-80 truncate">{imp.sub}</div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
          </button>
        );
      })}
    </div>
  );
}