"use client";

import { useState } from "react";
import { listInvites } from "@/lib/actions/admin";
import { GenerateInviteForm } from "@/components/admin/GenerateInviteForm";
import { InviteList } from "@/components/admin/InviteList";

type Invite = Awaited<ReturnType<typeof listInvites>>["data"] extends (infer T)[] | null ? T : never;

export function CreatorDashboard({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState(initialInvites);

  async function refresh() {
    const result = await listInvites();
    if (result.data) setInvites(result.data);
  }

  return (
    <div className="flex flex-col gap-4">
      <GenerateInviteForm onGenerated={refresh} />
      <InviteList invites={invites} />
    </div>
  );
}
