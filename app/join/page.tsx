import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { validateInviteToken } from "@/lib/actions/auth";
import { JoinForm } from "@/components/auth/JoinForm";

export const metadata: Metadata = {
  title: "Join",
  description: "Redeem your FriendBoard invite and set a PIN.",
  robots: { index: false, follow: false },
};

export default async function JoinPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  const result = token ? await validateInviteToken(token) : { data: null, error: null };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {result.data ? (
        <JoinForm token={token} assignedName={result.data.assignedName} />
      ) : (
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <KeyRound className="h-5 w-5 text-text-faint" aria-hidden />
          <h1 className="text-sm font-medium text-text-primary">This invite link isn&apos;t valid</h1>
          <p className="text-xs text-text-muted">
            It may have already been used, or the link is incomplete. Ask whoever invited you to send a new
            one.
          </p>
        </div>
      )}
    </main>
  );
}
