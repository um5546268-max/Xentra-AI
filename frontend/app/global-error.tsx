"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
          <div className="text-center max-w-md p-6">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-6 text-sm">
              Our team has been notified. Error ID: {error.digest}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-md text-white text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}