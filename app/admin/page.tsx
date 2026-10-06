import type { Metadata } from "next";
import { isAdminSession, listInvites } from "@/lib/actions/admin";
import { AdminPinGate } from "@/components/admin/AdminPinGate";
import { CreatorDashboard } from "@/components/admin/CreatorDashboard";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await isAdminSession();

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <AdminPinGate />
      </main>
    );
  }

  const invites = await listInvites();

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <header className="mb-5">
        <h1 className="text-base font-semibold text-text-primary">Creator Dashboard</h1>
        <p className="text-xs text-text-muted">Invite friends and see who&apos;s joined.</p>
      </header>

      {invites.error ? (
        <p className="rounded border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-xs text-status-rejected">
          {invites.error.message}
        </p>
      ) : (
        <CreatorDashboard initialInvites={invites.data} />
      )}
    </main>
  );
}
