"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import ThemeToggle from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/hostel", label: "Hostel" },
  { href: "/electricity/readings", label: "Electricity" },
  { href: "/revenue", label: "Revenue" },
  { href: "/tenants", label: "Tenants" }
];

import { useSession } from "next-auth/react";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const currentNavItems = [...navItems];
  if (userRole === "SUPER_ADMIN") {
    currentNavItems.push({ href: "/back-office", label: "Back Office" });
  }

  useEffect(() => {
    const targets = ["/", ...currentNavItems.map((item) => item.href)].filter(
      (href) => href !== pathname
    );

    const prefetchAll = () => {
      for (const href of targets) {
        router.prefetch(href);
      }
    };
    // ... rest of the useEffect logic

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
          className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:text-slate-800"
        >
          <Image
            src="/hostel-management-logo.png"
            alt="Hostel Management logo"
            width={22}
            height={22}
            className="rounded-md"
            priority
          />
          Hostel Management
        </Link>
        <div className="flex flex-wrap gap-2">
          {currentNavItems.map((item) => {
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
                className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "glass-btn-primary" : "glass-card"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
