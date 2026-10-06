"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Small-viewport nav menu (usable down to 320px) — a hamburger button
 * that reveals the same links NavBar shows inline on wider screens.
 * Kept as its own client island so NavBar itself stays a server
 * component reading the session directly.
 */
export function MobileNavMenu({ links, userName }: { links: NavLink[]; userName: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-bg-raised hover:text-text-primary"
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded border border-border bg-bg-panel shadow-xl motion-safe:animate-[fadeIn_0.12s_ease-out]"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-xs text-text-muted hover:bg-bg-raised hover:text-text-primary"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-text-faint hover:bg-bg-raised hover:text-text-muted"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out ({userName})
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
