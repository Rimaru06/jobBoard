import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/ui/NavBar";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ToastProvider } from "@/components/ui/Toast";

// Two families, clearly distinct roles: Sans for all UI text, Mono
// reserved for structured job data (salary, experience, urls) so its
// use always signals "this is a data field," never decoration.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FriendBoard — the invite-only job board for your circle",
    template: "%s · FriendBoard",
  },
  description: "A shared, invite-only job board and personal application tracker for a closed friend group.",
  openGraph: {
    siteName: "FriendBoard",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    // The board/tracker/admin routes are session-gated already (and
    // excluded via robots.ts); this default just keeps the handful of
    // genuinely public pages (landing, login, join) indexable.
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} dark`}>
      <body className="min-h-screen bg-bg text-text-primary font-sans text-sm antialiased">
        <ToastProvider>
          <OfflineBanner />
          <NavBar />
          <div className="min-h-[calc(100vh-2.75rem)]">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
