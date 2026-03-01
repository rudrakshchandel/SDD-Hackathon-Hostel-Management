"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/hostel", label: "Hostel" },
  { href: "/revenue", label: "Revenue" },
  { href: "/tenants", label: "Tenants" }
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const targets = ["/", ...navItems.map((item) => item.href)].filter(
      (href) => href !== pathname
    );

    const prefetchAll = () => {
      for (const href of targets) {
        router.prefetch(href);
      }
    };

    const maybeIdle = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof maybeIdle.requestIdleCallback === "function") {
      const id = maybeIdle.requestIdleCallback(prefetchAll);
      return () => maybeIdle.cancelIdleCallback?.(id);
    }

    const timeout = globalThis.setTimeout(prefetchAll, 350);
    return () => globalThis.clearTimeout(timeout);
  }, [pathname, router]);

  const prefetchRoute = (href: string) => {
    if (href !== pathname) {
      router.prefetch(href);
    }
  };

  return (
    <nav className="sticky top-4 z-40 px-4">
      <div className="glass-panel mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 p-2">
        <Link
          href="/"
          prefetch
          onMouseEnter={() => prefetchRoute("/")}
          onFocus={() => prefetchRoute("/")}
          className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:text-slate-800"
        >
          Hostel Management
        </Link>
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                className={`inline-flex items-center rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "glass-btn-primary" : "glass-card"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
