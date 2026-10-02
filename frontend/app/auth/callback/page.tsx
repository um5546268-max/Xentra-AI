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

        if (code) {
            // It's a GitHub login
            console.log("Attempting GitHub sign-in...");
            githubSignIn(code).then((ok) => {
                if (ok) {
                    router.replace("/app"); 
                } else {
                    router.replace("/welcome");
                }
            }).catch((err) => {
                console.error("GitHub Auth error:", err);
                router.replace("/welcome");
            });
        } else {
            // It might be a Google login
            // Google can send the credential as a query param OR in the URL hash
            const credential = 
                searchParams.get("credential") || 
                new URLSearchParams(window.location.hash.substring(1)).get("credential");

            if (credential) {
                console.log("Attempting Google sign-in...");
                googleSignIn(credential).then((ok) => {
                    if (ok) {
                        router.replace("/app"); 
                    } else {
                        router.replace("/welcome");
                    }
                }).catch((err) => {
                    console.error("Google Auth error:", err);
                    router.replace("/welcome");
                });
            } else {
                // No code and no credential found
                console.warn("No code or credential found in the URL.");
                router.replace("/welcome");
            }
        }

    }, [code, error, router, githubSignIn, googleSignIn, searchParams]);

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