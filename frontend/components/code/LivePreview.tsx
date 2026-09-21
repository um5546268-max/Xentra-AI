"use client";

import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  ExternalLink,
  X,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
} from "lucide-react";
import { useCodeStore } from "@/lib/code-store";
import api from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 375,
};

export function LivePreview({ onClose }: { onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { openFiles, activePath } = useCodeStore();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [previewPath, setPreviewPath] = useState<string>("index.html");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch a fresh preview token on mount / reload ───
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/api/code/preview-token");
        if (alive) setToken(res.data.token);
      } catch (e: any) {
        if (alive) setError(e?.message || "Could not fetch preview token");
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // ─── Pick the preview target ───
  useEffect(() => {
    if (activePath && activePath.endsWith(".html")) {
      setPreviewPath(activePath);
      return;
    }
    const indexHtml = openFiles.find((f) => f.name === "index.html");
    if (indexHtml) {
      setPreviewPath(indexHtml.path);
      return;
    }
    const anyHtml = openFiles.find((f) => f.name.endsWith(".html"));
    if (anyHtml) setPreviewPath(anyHtml.path);
  }, [activePath, openFiles]);

  const reload = () => setReloadKey((k) => k + 1);

  const previewUrl = token
    ? `${API_URL}/api/code/preview/${previewPath}?token=${encodeURIComponent(
        token
      )}&v=${reloadKey}`
    : "";

  const width = VIEWPORT_WIDTHS[viewport];

  return (
    <div className="w-[40%] min-w-[320px] border-l border-slate-800 bg-slate-950 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-slate-800 px-3 py-2 flex items-center gap-2 shrink-0">
        <Monitor className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-300">
          Live Preview
        </span>
        <span className="text-[10px] text-slate-600 font-mono truncate flex-1">
          {previewPath}
        </span>

        {/* Viewport buttons */}
        <div className="flex items-center gap-0.5 border border-slate-800 rounded">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 rounded-l transition ${
              viewport === "desktop"
                ? "bg-slate-800 text-violet-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Desktop"
          >
            <Monitor className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1.5 transition ${
              viewport === "tablet"
                ? "bg-slate-800 text-violet-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 rounded-r transition ${
              viewport === "mobile"
                ? "bg-slate-800 text-violet-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={reload}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
          title="Reload"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        <a
          href={previewUrl || "#"}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
          title="Open in new tab"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
          title="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-slate-100 p-2 flex items-start justify-center">
        {error ? (
          <div className="text-xs text-red-500 p-4 text-center">{error}</div>
        ) : !token ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-8">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading preview…
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={reloadKey}
            src={previewUrl}
            className="bg-white border border-slate-300 shadow-lg"
            style={{
              width: width ? `${width}px` : "100%",
              height: "100%",
              maxWidth: "100%",
            }}
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
            title="Preview"
          />
        )}
      </div>
    </div>
  );
}