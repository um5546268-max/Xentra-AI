"use client";

import { LucideIcon, Construction } from "lucide-react";
import Link from "next/link";

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
  backHref = "/app/learn",
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  backHref?: string;
}) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-violet-300" />
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        <div className="inline-flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Coming in a future update
        </div>
        <div>
          <Link
            href={backHref}
            className="text-sm text-violet-400 hover:text-violet-300 mt-4 inline-block"
          >
            ← Back to Learn
          </Link>
        </div>
      </div>
    </div>
  );
}