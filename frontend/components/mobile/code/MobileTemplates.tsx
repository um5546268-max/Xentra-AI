"use client";

import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createEntry } from "@/lib/code";

type Template = {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
  color: "violet" | "cyan" | "emerald" | "amber" | "pink" | "blue";
  files: { path: string; content: string }[];
};

const TEMPLATES: Template[] = [
  {
    id: "python-starter",
    label: "Python Starter",
    subtitle: "Basic Python project structure",
    emoji: "🐍",
    color: "blue",
    files: [
      {
        path: "main.py",
        content: `# Python Starter\n\ndef main():\n    print("Hello from Xentra!")\n\nif __name__ == "__main__":\n    main()\n`,
      },
      { path: "README.md", content: `# Python Starter\n\nA minimal Python project.\n` },
    ],
  },
  {
    id: "web-app",
    label: "Web App",
    subtitle: "Simple website template",
    emoji: "🌐",
    color: "pink",
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8" />\n  <title>My Web App</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, Xentra!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      },
      { path: "style.css", content: `body {\n  font-family: system-ui, sans-serif;\n  padding: 40px;\n  background: #0f172a;\n  color: #e2e8f0;\n}\n` },
      { path: "script.js", content: `console.log("Web app loaded.");\n` },
    ],
  },
  {
    id: "react-app",
    label: "React App",
    subtitle: "Modern React project",
    emoji: "⚛️",
    color: "cyan",
    files: [
      {
        path: "App.jsx",
        content: `export default function App() {\n  return <h1>Hello from React!</h1>;\n}\n`,
      },
      { path: "index.jsx", content: `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")).render(<App />);\n` },
    ],
  },
  {
    id: "node-api",
    label: "Node.js API",
    subtitle: "Backend API template",
    emoji: "🟢",
    color: "emerald",
    files: [
      {
        path: "server.js",
        content: `import express from "express";\n\nconst app = express();\napp.get("/", (req, res) => res.json({ ok: true }));\napp.listen(3000, () => console.log("Server ready on :3000"));\n`,
      },
      { path: "package.json", content: `{\n  "name": "xentra-api",\n  "type": "module",\n  "dependencies": { "express": "^4.19.2" }\n}\n` },
    ],
  },
  {
    id: "ml-starter",
    label: "Machine Learning",
    subtitle: "ML project template",
    emoji: "🧠",
    color: "violet",
    files: [
      {
        path: "train.py",
        content: `import numpy as np\n\n# TODO: load dataset\nX = np.random.rand(100, 4)\ny = np.random.rand(100, 1)\nprint("Ready to train. X shape:", X.shape)\n`,
      },
      { path: "requirements.txt", content: `numpy\nscikit-learn\n` },
    ],
  },
  {
    id: "game",
    label: "Game (Pygame)",
    subtitle: "Simple 2D game template",
    emoji: "🎮",
    color: "amber",
    files: [
      {
        path: "game.py",
        content: `import pygame\n\npygame.init()\nscreen = pygame.display.set_mode((640, 480))\npygame.display.set_caption("Xentra Game")\nrunning = True\n\nwhile running:\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT:\n            running = False\n    screen.fill((15, 23, 42))\n    pygame.display.flip()\n\npygame.quit()\n`,
      },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  violet:  "from-violet-600/30 to-violet-900/10 border-violet-500/30 text-violet-300",
  cyan:    "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30 text-cyan-300",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  amber:   "from-amber-600/30 to-amber-900/10 border-amber-500/30 text-amber-300",
  pink:    "from-pink-600/30 to-pink-900/10 border-pink-500/30 text-pink-300",
  blue:    "from-blue-600/30 to-blue-900/10 border-blue-500/30 text-blue-300",
};

export default function MobileTemplates({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "python" | "web" | "javascript">("all");

  const matchesFilter = (t: Template) => {
    if (filter === "all") return true;
    if (filter === "python") return t.id.includes("python") || t.id === "ml-starter" || t.id === "game";
    if (filter === "web") return t.id === "web-app" || t.id === "react-app";
    if (filter === "javascript") return t.id === "node-api" || t.id === "react-app";
    return true;
  };

  const handleUseTemplate = async (template: Template) => {
    setCreating(template.id);
    try {
      for (const f of template.files) {
        await createEntry(f.path, "file", f.content);
      }
      onCreated();
      onBack();
    } catch (e) {
      alert("Failed to create template files");
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">Templates</div>
          <div className="text-[10px] text-slate-500">
            Start with ready-to-use templates
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-thin">
        {(["all", "python", "web", "javascript"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "bg-violet-600 text-white"
                : "text-slate-400 bg-slate-900 border border-slate-800 hover:text-slate-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
        {TEMPLATES.filter(matchesFilter).map((t) => {
          const style = COLOR_MAP[t.color];
          const isCreating = creating === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleUseTemplate(t)}
              disabled={!!creating}
              className={`w-full flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${style} p-4 text-left transition active:scale-[0.99] disabled:opacity-60`}
            >
              <div className="w-11 h-11 rounded-xl bg-slate-950/60 flex items-center justify-center shrink-0">
                {isCreating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-xl">{t.emoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-100">
                  {t.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer button */}
      <div
        className="border-t border-slate-800 px-4 py-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <button
          onClick={onBack}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
          }}
        >
          Use Template
        </button>
      </div>
    </div>
  );
}