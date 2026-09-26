"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopLogin = dynamic(
  () => import("@/components/auth/DesktopLogin"),
  { ssr: false }
);
const MobileLogin = dynamic(
  () => import("@/components/mobile/auth/MobileLogin"),
  { ssr: false }
);

export default function LoginPage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isMobile ? <MobileLogin /> : <DesktopLogin />;
}