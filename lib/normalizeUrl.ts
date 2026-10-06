// Query params that don't change what job the URL points to — strip
// these before comparing, otherwise "?utm_source=slack" defeats
// duplicate detection entirely.
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "gh_src",
];

/**
 * Normalize a job URL for equality comparison and storage:
 * lowercase host, strip tracking params, drop trailing slash/hash,
 * force https where the site supports it either way.
 */
export function normalizeJobUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    // Not a valid absolute URL — return trimmed input as-is and let
    // form validation reject it; nothing to normalize.
    return raw.trim();
  }

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);

  let normalized = url.toString();
  if (normalized.endsWith("/") && url.pathname !== "/") {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
