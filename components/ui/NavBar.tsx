import Link from "next/link";
import { Briefcase, ClipboardList, LogOut, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { MobileNavMenu, type NavLink } from "@/components/ui/MobileNavMenu";

/**
 * Top navigation bar — server component reading the session directly.
 * Interactive bits (logout button, mobile menu) are pushed into small
 * client islands so this component itself needs no "use client".
 * Usable down to a 320px viewport: inline links collapse into
 * MobileNavMenu below the `sm` breakpoint.
 */
export async function NavBar() {
  const viewer = await getCurrentUser();

  const links: NavLink[] = viewer
    ? [
        { href: "/board", label: "Board", icon: "briefcase" },
        { href: `/tracker/${viewer.id}`, label: "My Tracker", icon: "clipboard" },
        ...(viewer.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "shield" }] : []),
      ]
    : [];

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-4">
        {/* Brand */}
        <Link
          href={viewer ? "/board" : "/"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary hover:text-accent"
        >
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          FriendBoard
        </Link>

        {/* Right side */}
        {viewer && (
          <>
            {/* Inline links — sm and up */}
            <div className="hidden items-center gap-1 sm:flex">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] text-text-muted hover:bg-bg-raised hover:text-text-primary"
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {label}
                </Link>
              ))}

              {/* Logout via server action — no JS event handler needed */}
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] text-text-faint hover:bg-bg-raised hover:text-text-muted"
                >
                  <LogOut className="h-3 w-3" aria-hidden />
                  <span>{viewer.name}</span>
                  <span className="sr-only">Sign out</span>
                </button>
              </form>
            </div>

            {/* Collapsed hamburger menu — below sm */}
            <MobileNavMenu links={links} userName={viewer.name} />
          </>
        )}
      </div>
    </nav>
  );
}
