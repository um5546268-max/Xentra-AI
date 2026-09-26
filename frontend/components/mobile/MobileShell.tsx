"use client";

import { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function MobileShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Content — pages handle their own bottom spacing */}
      <div className="h-full">
        {children}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}