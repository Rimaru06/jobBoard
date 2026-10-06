import type { ReactNode } from "react";

/**
 * Responsive grid shell for job cards. Pure layout — takes children
 * so it works for both the server-rendered first page and the
 * client-appended pages from infinite scroll.
 */
export function JobGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
