"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopProfile = dynamic(
  () => import("@/components/profile/DesktopProfile"),
  { ssr: false }
);
const MobileProfile = dynamic(
  () => import("@/components/mobile/MobileProfile"),
  { ssr: false }
);

export default function ProfilePage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isMobile ? <MobileProfile /> : <DesktopProfile />;
}