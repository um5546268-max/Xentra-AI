"use client";

import { useRouter } from "next/navigation";
import {
  Globe, Link2, Music, ShoppingBag, Code, Image as ImageIcon,
  FolderOpen, Brain, Clock, CreditCard, Video, Wrench,
} from "lucide-react";

const TOOLS = [
  { path: "/app/browser", label: "Browser agent", desc: "Automate web browsing", icon: Globe, color: "from-cyan-500 to-blue-500" },
  { path: "/app/integrations", label: "Integrations", desc: "Connect third-party apps", icon: Link2, color: "from-violet-500 to-fuchsia-500" },
  { path: "/app/media", label: "Media", desc: "Play music & videos", icon: Music, color: "from-pink-500 to-rose-500" },
  { path: "/app/shopping", label: "Shopping", desc: "Compare products & prices", icon: ShoppingBag, color: "from-emerald-500 to-teal-500" },
  { path: "/app/code", label: "Code workspace", desc: "Write & run code", icon: Code, color: "from-blue-500 to-violet-500" },
  { path: "/app/images", label: "Image generator", desc: "Create AI images", icon: ImageIcon, color: "from-fuchsia-500 to-pink-500" },
  { path: "/app/files", label: "Files", desc: "Upload & manage files", icon: FolderOpen, color: "from-amber-500 to-orange-500" },
  { path: "/app/memory", label: "Memory", desc: "Long-term AI memory", icon: Brain, color: "from-violet-500 to-cyan-500" },
  { path: "/app/automations", label: "Automations", desc: "Schedule recurring tasks", icon: Clock, color: "from-orange-500 to-red-500" },
  { path: "/app/videos", label: "Video generator", desc: "Generate AI videos", icon: Video, color: "from-rose-500 to-pink-500" },
  { path: "/app/billing", label: "Billing", desc: "Manage your plan", icon: CreditCard, color: "from-emerald-500 to-cyan-500" },
  { path: "/app/settings", label: "Settings", desc: "App preferences", icon: Wrench, color: "from-slate-500 to-slate-700" },
];

export default function ToolsPage() {
  const router = useRouter();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tools</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All Xentra tools in one place
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.path}
                onClick={() => router.push(tool.path)}
                className="group relative text-left rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-violet-500/50 hover:bg-slate-900 transition overflow-hidden"
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${tool.color} opacity-10 blur-2xl group-hover:opacity-20 transition`}
                />
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg mb-3`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {tool.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {tool.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}