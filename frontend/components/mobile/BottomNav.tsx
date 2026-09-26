"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, MessageSquare, GraduationCap, Users, Menu } from "lucide-react";
import { useState } from "react";
import MoreSheet from "./MoreSheet";
import api from "@/lib/api";

type Tab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const TABS: Tab[] = [
  { id: "home",     label: "Home",    icon: Home,            href: "/app" },
  { id: "chat",     label: "Chat",    icon: MessageSquare,   href: "#chat" },
  { id: "learn",    label: "Learn",   icon: GraduationCap,   href: "/app/learn" },
  { id: "connect",  label: "Connect", icon: Users,           href: "/app/connect" },
  { id: "more",     label: "More",    icon: Menu,            href: "#more" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isActive = (tab: Tab) => {
    if (tab.id === "more") return false;
    if (tab.id === "home") return pathname === "/app";
    if (tab.id === "chat") return pathname?.startsWith("/app/c");
    return pathname?.startsWith(tab.href);
  };

  const handleTab = async (tab: Tab) => {
    if (tab.id === "more") {
      setShowMore(true);
      return;
    }

    // Chat: go to latest conversation, or create a new one
    if (tab.id === "chat") {
      try {
        const res = await api.get("/api/conversations");
        const conversations: { id: string }[] = res.data || [];
        if (conversations.length > 0) {
          router.push(`/app/c/${conversations[0].id}`);
        } else {
          const createRes = await api.post("/api/conversations", {
            title: null,
          });
          router.push(`/app/c/${createRes.data.id}`);
        }
      } catch (e) {
        console.error("[bottom-nav] failed to open chat:", e);
        router.push("/app");
      }
      return;
    }

    router.push(tab.href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab);
            return (
              <button
                key={tab.id}
                onClick={() => handleTab(tab)}
                className={`relative flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${
                  active ? "text-violet-300" : "text-slate-500"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-violet-400" />
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                    active
                      ? "bg-violet-500/20 ring-1 ring-violet-500/40"
                      : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-violet-300" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {showMore && <MoreSheet onClose={() => setShowMore(false)} />}
    </>
  );
}