import { cn } from "@/lib/cn";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Compact identity chip: initials avatar + name. Used for "added by"
 * and for listing who has a referral/connection on a job.
 */
export function UserChip({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "sm" | "xs";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-text-muted", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-bg-raised text-text-primary font-medium",
          size === "sm" ? "h-5 w-5 text-[10px]" : "h-4 w-4 text-[9px]"
        )}
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className={cn(size === "sm" ? "text-xs" : "text-[11px]")}>{name}</span>
    </span>
  );
}
