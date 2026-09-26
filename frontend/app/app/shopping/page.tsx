"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopShopping = dynamic(
  () => import("@/components/shopping/DesktopShopping"),
  { ssr: false }
);
const MobileShopping = dynamic(
  () => import("@/components/mobile/MobileShopping"),
  { ssr: false }
);

export default function ShoppingPage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isMobile ? <MobileShopping /> : <DesktopShopping />;
}