"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopSplash = dynamic(
  () => import("@/components/auth/DesktopSplash"),
  { ssr: false }
);
const MobileSplash = dynamic(
  () => import("@/components/mobile/auth/MobileSplash"),
  { ssr: false }
);

export default function SplashPage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return <div className="min-h-screen bg-black" />;
  }
  return isMobile ? <MobileSplash /> : <DesktopSplash />;
}