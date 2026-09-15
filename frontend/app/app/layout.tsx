"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import CommandCenter from "@/components/CommandCenter";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadFromStorage } = useAuth();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem("xentra_token");
      if (!stored) router.push("/login");
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Show Command Center only on chat pages (not on /app home)
  const showCommandCenter =
    pathname?.startsWith("/app/c/") && pathname !== "/app/c/";

    return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
      {showCommandCenter && <CommandCenter />}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#0f172a",
            border: "1px solid #1e293b",
            color: "#e2e8f0",
          },
        }}
      />
    </div>
  );
}