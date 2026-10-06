import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, KeyRound, ShieldCheck, Users, ClipboardList, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "FriendBoard — the invite-only job board for your circle",
  description:
    "A private, invite-only job board for a close friend group: discover postings together, track your own applications privately, and get in with a PIN — no email, no password, no public sign-up.",
  openGraph: {
    title: "FriendBoard — the invite-only job board for your circle",
    description:
      "Discover jobs together, track applications privately. PIN-only access via a personal invite link — no public sign-up.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FriendBoard — the invite-only job board for your circle",
    description: "Discover jobs together, track applications privately. Invite-only, PIN-based access.",
  },
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Users,
    title: "Shared job discovery",
    description:
      'Anyone in the group can post a listing they find — everyone else sees it instantly on one shared board, with referral and "I know someone" tags so leads don\'t go cold.',
  },
  {
    icon: ClipboardList,
    title: "Your own private tracker",
    description:
      "Mark any shared job as Draft, Applied, Interviewing, Offered, or Rejected, and add private notes. Your statuses and notes are yours alone — no one else in the group can see them.",
  },
  {
    icon: KeyRound,
    title: "PIN-only access",
    description:
      "No email, no password, no public sign-up form. You get in with a 6-digit PIN you set once, from a one-time invite link — there's nothing to phish and nothing to leak in a breach elsewhere.",
  },
  {
    icon: ShieldCheck,
    title: "Invite-only, always",
    description:
      "A group admin controls every invite from a private Creator Dashboard — who's been invited, who's joined, and when. There's no way in except a link someone in the group sent you directly.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-panel px-3 py-1 text-[11px] font-medium text-text-muted motion-safe:animate-[fadeIn_0.4s_ease-out]">
          <Briefcase className="h-3 w-3 text-accent" aria-hidden />
          Invite-only, for one group at a time
        </span>

        <h1 className="text-balance text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          The job board only <span className="text-accent">your people</span> can see.
        </h1>

        <p className="max-w-xl text-balance text-sm text-text-muted sm:text-base">
          FriendBoard is a shared job board for a closed friend group: find postings together, flag who can
          refer you, and track your own applications privately — all behind a PIN, with no public sign-up.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition-colors motion-safe:duration-150 hover:bg-accent/20"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-border px-5 py-2.5 text-sm font-medium text-text-muted transition-colors motion-safe:duration-150 hover:border-border-hover hover:text-text-primary"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />I have an invite
          </Link>
        </div>

        <p className="text-[11px] text-text-faint">
          Don&apos;t have an invite? Ask whoever runs your group&apos;s board — there&apos;s no public way to
          join.
        </p>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section aria-labelledby="features-heading" className="mx-auto max-w-5xl px-4 pb-20">
        <h2 id="features-heading" className="sr-only">
          What FriendBoard does
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="flex flex-col gap-2.5 rounded border border-border bg-bg-panel p-5 transition-colors motion-safe:duration-150 hover:border-border-hover"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-accent/30 bg-accent/10 text-accent">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
              <p className="text-xs leading-relaxed text-text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section className="border-t border-border bg-bg-panel/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-lg font-semibold text-text-primary">Already have a PIN?</h2>
          <p className="max-w-md text-xs text-text-muted">
            Sign back in to see what the group has posted since you last checked.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition-colors motion-safe:duration-150 hover:bg-accent/20"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
