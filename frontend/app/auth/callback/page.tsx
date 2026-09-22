"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { githubSignIn } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      router.replace("/welcome");
      return;
    }
    if (!code) {
      router.replace("/welcome");
      return;
    }

    githubSignIn(code).then((ok) => {
      router.replace(ok ? "/app" : "/welcome");
    });
  }, [params, githubSignIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        <span className="text-sm text-slate-400">Signing you in with GitHub…</span>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}