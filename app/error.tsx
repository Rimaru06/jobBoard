"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Root error boundary — catches render errors anywhere in the tree
 * that aren't handled by a more specific error.tsx. Deliberately does
 * NOT show `error.message` to the user: uncaught render errors can
 * leak internals, unlike the safe messages Server Actions already
 * return via ActionResult.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({ level: "error", context: "GlobalErrorBoundary", digest: error.digest ?? null })
    );
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertTriangle className="h-6 w-6 text-status-rejected" aria-hidden />
      <h1 className="text-sm font-medium text-text-primary">Something went wrong</h1>
      <p className="max-w-xs text-xs text-text-muted">
        This page hit an unexpected error. You can try again, or head back to the board.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex items-center justify-center rounded-sm border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20"
      >
        Try again
      </button>
    </main>
  );
}
