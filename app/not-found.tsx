import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Compass className="h-6 w-6 text-text-faint" aria-hidden />
      <h1 className="text-sm font-medium text-text-primary">Page not found</h1>
      <p className="max-w-xs text-xs text-text-muted">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="mt-1 inline-flex items-center justify-center rounded-sm border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20"
      >
        Back to FriendBoard
      </Link>
    </main>
  );
}
