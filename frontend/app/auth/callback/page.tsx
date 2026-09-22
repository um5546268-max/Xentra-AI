"use client";

import { useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/auth"; 

function CallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get the params from the URL
    const code = searchParams.get("code");       // Used by GitHub
    const error = searchParams.get("error");     // Used by both
    const state = searchParams.get("state");     // We will use this to pass the provider
    
    // Get BOTH functions from your Zustand store
    const githubSignIn = useAuth((state) => state.githubSignIn);
    const googleSignIn = useAuth((state) => state.googleSignIn);
    
    const hasAttempted = useRef(false); 

    useEffect(() => {
        if (hasAttempted.current) return;
        hasAttempted.current = true;

        if (error) {
            console.error("Auth error from provider:", error);
            router.replace("/welcome");
            return;
        }

        // Detect the provider. 
        // If there is a 'code', it's GitHub.
        // If there is no 'code' but there is a 'credential' (or we set state=google), it's Google.
        // For Google, the credential usually comes in the hash fragment, but your app seems to be using a 'code' flow for both.
        
        if (code) {
            // It's a GitHub login
            console.log("Attempting GitHub sign-in...");
            githubSignIn(code).then((ok: boolean) => {
                if (ok) {
                    router.replace("/app"); 
                } else {
                    router.replace("/welcome");
                }
            }).catch((err: any) => {
                console.error("GitHub Auth error:", err);
                router.replace("/welcome");
            });
        } else {
            // It might be a Google login, or the code is missing
            console.warn("No code found. This might be a Google login that needs a different flow.");
            // If your Google flow uses a credential in the URL, handle it here.
            // For now, send back to welcome.
            router.replace("/welcome");
        }

    }, [code, error, router, githubSignIn, googleSignIn]);

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