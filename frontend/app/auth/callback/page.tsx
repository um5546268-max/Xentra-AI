"use client"; // Ensure this is at the top of the file

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// import your auth functions here (githubSignIn, googleSignIn, etc.)

function CallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    useEffect(() => {
        // 1. Handle Errors
        if (error) {
            console.error("Auth error:", error);
            router.replace("/welcome");
            return;
        }

        // 2. Handle Missing Code
        if (!code) {
            console.error("No code provided");
            router.replace("/welcome");
            return;
        }

        // 3. Handle the Sign In
        // NOTE: You need to know which provider called this.
        // If you have separate callback routes (e.g., /auth/callback/github and /auth/callback/google), 
        // this is easier. If it's the same route, you need to pass the provider in the URL state.
        
        // Example for GitHub (based on your code):
        githubSignIn(code).then((ok) => {
            if (ok) {
                router.replace("/app"); // Redirect to dashboard
            } else {
                router.replace("/welcome");
            }
        }).catch((err) => {
            console.error(err);
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