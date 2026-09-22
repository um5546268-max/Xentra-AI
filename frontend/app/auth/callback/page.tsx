"use client";

import { useEffect, Suspense, useRef } from "react"; // Added useRef
import { useRouter, useSearchParams } from "next/navigation";
// IMPORT THE HOOK, NOT THE FUNCTION
import { useAuth } from "../../../lib/auth"; 

function CallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    
    // Get the function from your Zustand store
    const githubSignIn = useAuth((state) => state.githubSignIn);
    
    // Use a ref to prevent React Strict Mode from running this twice
    const hasAttempted = useRef(false); 

    useEffect(() => {
        // Prevent double execution in development
        if (hasAttempted.current) return;
        hasAttempted.current = true;

        if (error) {
            router.replace("/welcome");
            return;
        }
        if (!code) {
            router.replace("/welcome");
            return;
        }

        // Call the Zustand function
        githubSignIn(code).then((ok: boolean) => {
            if (ok) {
                // Redirect to your actual dashboard route. 
                // Change "/app" to wherever your dashboard actually is (e.g., "/dashboard")
                router.replace("/app"); 
            } else {
                router.replace("/welcome");
            }
        }).catch((err: any) => {
            console.error("Auth error:", err);
            router.replace("/welcome");
        });

    }, [code, error, router, githubSignIn]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">Signing you in with GitHub...</span>
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