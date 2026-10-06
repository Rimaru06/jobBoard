"use client";

import { useState } from "react";
import type { JobWithContext } from "@/types/database";
import type { JobsCursor } from "@/lib/actions/jobs";
import { SubmitJobForm } from "@/components/jobs/SubmitJobForm";
import { JobFeed } from "@/components/jobs/JobFeed";

/**
 * Thin glue component: the only reason this needs to be a Client
 * Component is to share the "a job was just created" signal between
 * two otherwise-independent client components. No data fetching or
 * business logic lives here.
 */
export function BoardShell({
  initialJobs,
  initialCursor,
  viewerId,
  viewerRole,
}: {
  initialJobs: JobWithContext[];
  initialCursor: JobsCursor | null;
  viewerId: string | null;
  viewerRole: string | null;
}) {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <SubmitJobForm onJobCreated={() => setRefreshSignal((n) => n + 1)} />
      <JobFeed
        initialJobs={initialJobs}
        initialCursor={initialCursor}
        refreshSignal={refreshSignal}
        viewerId={viewerId}
        viewerRole={viewerRole}
      />
    </div>
  );
}
