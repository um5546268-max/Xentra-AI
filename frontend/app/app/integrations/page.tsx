"use client";

import { Plug } from "lucide-react";
import { AccountsSection } from "@/components/integrations/AccountsSection";
import { LanguagesSection } from "@/components/integrations/LanguagesSection";

export default function IntegrationsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Plug className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="text-sm text-slate-500">
              Connect accounts and install tools to extend Xentra.
            </p>
          </div>
        </div>

        <AccountsSection />
        <LanguagesSection />
      </div>
    </div>
  );
}