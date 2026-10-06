"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Fixed banner shown while the browser reports no network connection.
 *  Purely informational — server actions will fail naturally offline;
 *  this just explains why instead of leaving a silent spinner. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-1.5 bg-status-rejected/15 px-4 py-1.5 text-[11px] font-medium text-status-rejected"
    >
      <WifiOff className="h-3 w-3" aria-hidden />
      You&apos;re offline — changes won&apos;t save until you&apos;re back online.
    </div>
  );
}
