import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";

interface InviteRow {
  id: string;
  assigned_name: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

export function InviteList({ invites }: { invites: InviteRow[] }) {
  if (invites.length === 0) {
    return (
      <p className="rounded border border-dashed border-border py-8 text-center text-xs text-text-faint">
        No invites sent yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded border border-border bg-bg-panel">
      {invites.map((invite) => (
        <li key={invite.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text-primary">{invite.assigned_name}</p>
            <p className="text-[11px] text-text-faint">
              Invited {formatRelativeTime(invite.created_at)}
              {invite.is_used && invite.used_at ? ` · Joined ${formatRelativeTime(invite.used_at)}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-medium",
              invite.is_used
                ? "border-status-offered/40 text-status-offered"
                : "border-status-interviewing/40 text-status-interviewing"
            )}
          >
            {invite.is_used ? "Joined" : "Pending"}
          </span>
        </li>
      ))}
    </ul>
  );
}
