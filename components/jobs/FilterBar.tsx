"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { JobFiltersInput } from "@/lib/actions/jobs";
import { cn } from "@/lib/cn";

// Free-text `experience` column, so these are loose match buckets
// (see getJobsPage's ilike filter) rather than an exact enum — pick
// labels people will actually type into the "experience" field.
const EXPERIENCE_BUCKETS = ["Intern", "Junior", "Mid", "Senior", "Staff+"];

const FILLED_OPTIONS: { value: NonNullable<JobFiltersInput["filled"]>; label: string }[] = [
  { value: "open", label: "Open roles" },
  { value: "filled", label: "Filled roles" },
  { value: "all", label: "All roles" },
];

const SORT_OPTIONS: { value: NonNullable<JobFiltersInput["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const SEARCH_DEBOUNCE_MS = 300;

function parseSearchParams(params: URLSearchParams): JobFiltersInput {
  return {
    query: params.get("q") ?? "",
    experience: params.getAll("experience"),
    skills: params.getAll("skill"),
    company: params.get("company") ?? "",
    filled: (params.get("filled") as JobFiltersInput["filled"]) || "open",
    sort: (params.get("sort") as JobFiltersInput["sort"]) || "newest",
  };
}

function toSearchParams(filters: JobFiltersInput): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  for (const bucket of filters.experience ?? []) params.append("experience", bucket);
  for (const skill of filters.skills ?? []) params.append("skill", skill);
  if (filters.company?.trim()) params.set("company", filters.company.trim());
  if (filters.filled && filters.filled !== "open") params.set("filled", filters.filled);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  return params;
}

/**
 * The only interactive chrome above the job grid. Owns filter state,
 * mirrors it into the URL (so a filtered view is shareable/bookmarkable
 * and survives a refresh), and debounces text input before notifying
 * the parent so JobFeed only refetches ~300ms after the user stops
 * typing rather than on every keystroke.
 */
export function FilterBar({ onChange }: { onChange: (filters: JobFiltersInput) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = useMemo(() => parseSearchParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [queryInput, setQueryInput] = useState(initial.query ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query ?? "");
  const [companyInput, setCompanyInput] = useState(initial.company ?? "");
  const [debouncedCompany, setDebouncedCompany] = useState(initial.company ?? "");
  const [skillsInput, setSkillsInput] = useState((initial.skills ?? []).join(", "));
  const [debouncedSkills, setDebouncedSkills] = useState(initial.skills ?? []);
  const [experience, setExperience] = useState<string[]>(initial.experience ?? []);
  const [filled, setFilled] = useState<NonNullable<JobFiltersInput["filled"]>>(initial.filled ?? "open");
  const [sort, setSort] = useState<NonNullable<JobFiltersInput["sort"]>>(initial.sort ?? "newest");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCompany(companyInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [companyInput]);

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setDebouncedSkills(
          skillsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        ),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [skillsInput]);

  useEffect(() => {
    const filters: JobFiltersInput = {
      query: debouncedQuery,
      experience,
      skills: debouncedSkills,
      company: debouncedCompany,
      filled,
      sort,
    };
    onChange(filters);
    const qs = toSearchParams(filters).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, debouncedCompany, debouncedSkills, experience, filled, sort]);

  function toggleExperience(bucket: string) {
    setExperience((prev) => (prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]));
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-bg-panel p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search role, company, skill…"
            aria-label="Search jobs"
            className="w-full rounded-sm border border-border bg-bg py-1.5 pl-8 pr-8 text-xs text-text-primary placeholder:text-text-faint focus:border-accent"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <input
          value={companyInput}
          onChange={(e) => setCompanyInput(e.target.value)}
          placeholder="Company…"
          aria-label="Filter by company"
          className="w-full rounded-sm border border-border bg-bg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-accent sm:w-40"
        />

        <select
          value={filled}
          onChange={(e) => setFilled(e.target.value as NonNullable<JobFiltersInput["filled"]>)}
          aria-label="Filter by fill state"
          className="rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text-muted focus:border-accent"
        >
          {FILLED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as NonNullable<JobFiltersInput["sort"]>)}
          aria-label="Sort order"
          className="rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text-muted focus:border-accent"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {EXPERIENCE_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              type="button"
              onClick={() => toggleExperience(bucket)}
              aria-pressed={experience.includes(bucket)}
              className={cn(
                "shrink-0 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
                experience.includes(bucket)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:border-border-hover"
              )}
            >
              {bucket}
            </button>
          ))}
        </div>

        <input
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          placeholder="Skills (comma separated)…"
          aria-label="Filter by skills"
          className="w-full rounded-sm border border-border bg-bg px-2.5 py-1.5 text-[11px] text-text-primary placeholder:text-text-faint focus:border-accent sm:max-w-xs"
        />
      </div>
    </div>
  );
}
