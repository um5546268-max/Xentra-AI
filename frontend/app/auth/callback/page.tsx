"use client";

import { useEffect, Suspense } from "react"; // 1. Added Suspense
import { useRouter, useSearchParams } from "next/navigation";
// 2. IMPORT YOUR AUTH FUNCTION HERE (Adjust the path as needed based on where your file is)
// For example, if it's in a lib folder: import { githubSignIn } from "@/lib/auth";
import { githubSignIn } from "../../../lib/auth"; // Change this path to your actual file location!

function CallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    useEffect(() => {
        if (error) {
            router.replace("/welcome");
            return;
        }
        if (!code) {
            router.replace("/welcome");
            return;
        }

        // 3. Added types (: boolean and : any)
        githubSignIn(code).then((ok: boolean) => {
            if (ok) {
                // If login is successful, go to dashboard
                router.replace("/app"); 
            } else {
                router.replace("/welcome");
            }
        }).catch((err: any) => {
            console.error("Auth error:", err);
            router.replace("/welcome");
        });

    }, [code, error, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">Signing you in...</span>
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