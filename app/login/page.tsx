import type { Metadata } from "next";
import { MailQuestion } from "lucide-react";
import { getRememberedUser } from "@/lib/actions/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to FriendBoard with your PIN.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const remembered = await getRememberedUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {remembered.data ? (
        <LoginForm
          userId={remembered.data.id}
          name={remembered.data.name}
          next={searchParams.next ?? "/board"}
        />
      ) : (
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <MailQuestion className="h-5 w-5 text-text-faint" aria-hidden />
          <h1 className="text-sm font-medium text-text-primary">Invite only</h1>
          <p className="text-xs text-text-muted">
            FriendBoard doesn&apos;t have open sign-up — ask someone in the group for an invite link.
          </p>
        </div>
      )}
    </main>
  );
}
