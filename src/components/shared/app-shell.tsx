"use client";

import { LayoutDashboard, Menu, Settings, X, FolderKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/features/auth/auth-actions";

const items = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    href: "/app/projects",
    label: "Projects",
    icon: FolderKanban,
    exact: false,
  },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Application navigation" className="space-y-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`hover:bg-surface-subtle rounded-control flex min-h-11 items-center gap-3 px-3 text-sm font-semibold ${
              active ? "bg-surface-selected text-link" : "text-secondary"
            }`}
            href={item.href}
            key={item.href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
          >
            <Icon aria-hidden="true" className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string | null; email: string };
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return (
    <div className="bg-canvas text-primary min-h-screen">
      <aside className="border-default bg-surface fixed inset-y-0 left-0 hidden w-60 border-r p-4 lg:flex lg:flex-col">
        <Link
          className="font-display flex min-h-12 items-center px-3 text-lg font-semibold"
          href="/app"
        >
          Web Content Flow
        </Link>
        <div className="mt-6">
          <Navigation />
        </div>
        <div className="border-default mt-auto border-t pt-4">
          <p className="truncate px-3 text-sm font-semibold">
            {user.name ?? "Account"}
          </p>
          <p className="text-secondary truncate px-3 text-xs">{user.email}</p>
          <form action={signOutAction}>
            <button className="text-secondary hover:bg-surface-subtle rounded-control mt-3 min-h-11 w-full px-3 text-left text-sm font-semibold">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="border-default bg-surface fixed inset-x-0 top-0 z-20 flex h-14 items-center border-b px-4 lg:left-60 lg:h-16">
        <button
          aria-expanded={open}
          aria-label="Open navigation"
          className="hover:bg-surface-subtle rounded-control flex size-11 items-center justify-center lg:hidden"
          onClick={() => setOpen(true)}
          ref={menuButtonRef}
        >
          <Menu aria-hidden="true" />
        </button>
        <p className="font-display ml-2 font-semibold lg:ml-0">
          Web Content Flow
        </p>
        <p className="text-secondary ml-auto hidden text-sm sm:block">
          {user.email}
        </p>
      </header>

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-40 lg:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeDrawer();
            if (event.key === "Tab") {
              const focusable = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ) ?? [],
              ).filter((element) => element.getClientRects().length > 0);
              const first = focusable[0];
              const last = focusable.at(-1);
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }
          }}
          ref={dialogRef}
          role="dialog"
        >
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={closeDrawer}
          />
          <div className="bg-surface shadow-overlay relative h-full w-[min(20rem,88vw)] p-4">
            <div className="flex h-12 items-center justify-between">
              <span className="font-display font-semibold">Navigation</span>
              <button
                aria-label="Close navigation"
                className="hover:bg-surface-subtle rounded-control flex size-11 items-center justify-center"
                onClick={closeDrawer}
                ref={closeButtonRef}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5">
              <Navigation onNavigate={closeDrawer} />
            </div>
            <div className="border-default mt-6 border-t pt-4">
              <p className="truncate px-3 text-sm font-semibold">
                {user.name ?? "Account"}
              </p>
              <p className="text-secondary truncate px-3 text-xs">
                {user.email}
              </p>
              <form action={signOutAction}>
                <button className="text-secondary hover:bg-surface-subtle rounded-control mt-3 min-h-11 w-full px-3 text-left text-sm font-semibold">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pt-14 lg:pt-16 lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
