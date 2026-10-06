const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/**
 * "3h ago", "2d ago", "just now" — compact, not the verbose
 * Intl.RelativeTimeFormat default ("3 hours ago"), to match the
 * dense card layout.
 */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  const diffSeconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (diffSeconds < 45) return "just now";

  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(diffSeconds / secondsInUnit);
    if (value >= 1) {
      const abbr = unit === "month" ? "mo" : unit[0]; // 1h, 2d, 3w, 4mo, 5y
      return `${value}${abbr} ago`;
    }
  }

  return "just now";
}
