import { Clock, Pencil } from "lucide-react";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";

/**
 * "Added 3h ago" / "Updated 12m ago" — same shape, different icon and
 * label, so JobCard can render one or both without duplicating markup.
 */
export function TimeChip({
  label,
  isoDate,
  variant = "added",
  className,
}: {
  label: string;
  isoDate: string;
  variant?: "added" | "updated";
  className?: string;
}) {
  const Icon = variant === "updated" ? Pencil : Clock;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] text-text-faint", className)}
      title={new Date(isoDate).toLocaleString()}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label} {formatRelativeTime(isoDate)}
    </span>
  );
}
