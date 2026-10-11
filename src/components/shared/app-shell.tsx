"use client";

import {
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Image from "next/image";
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
    <nav aria-label="Application navigation" className="app-navigation">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`app-navigation-item ${active ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
          >
            <Icon
              aria-hidden="true"
              className="size-[18px]"
              strokeWidth={1.8}
            />
            <span>{item.label}</span>
            {active ? (
              <ChevronRight aria-hidden className="ml-auto size-4" />
            ) : null}
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
  const pathname = usePathname();
  const initials = (user.name ?? user.email)
    .split(/[\s@._-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const pageLabel = pathname.includes("/projects/")
    ? "Project workspace"
    : pathname === "/app/projects"
      ? "Projects"
      : pathname.startsWith("/app/settings")
        ? "Settings"
        : "Dashboard";

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/app">
          <Image
            alt=""
            aria-hidden
            height={30}
            src="/brand/symbol/flow-mark.svg"
            width={30}
          />
          <span>Web Content Flow</span>
        </Link>
        <div className="app-sidebar-nav">
          <Navigation />
        </div>
        <div className="app-account">
          <span className="app-avatar" aria-hidden>
            {initials || "A"}
          </span>
          <span className="min-w-0 flex-1">
            <strong>{user.name ?? "Account"}</strong>
            <small>{user.email}</small>
          </span>
          <form action={signOutAction}>
            <button aria-label="Sign out" className="app-icon-button">
              <LogOut aria-hidden size={18} />
            </button>
          </form>
        </div>
      </aside>

      <header className="app-topbar">
        <button
          aria-expanded={open}
          aria-label="Open navigation"
          className="app-icon-button lg:hidden"
          onClick={() => setOpen(true)}
          ref={menuButtonRef}
        >
          <Menu aria-hidden="true" />
        </button>
        <div className="app-topbar-title">
          <span className="lg:hidden">Web Content Flow</span>
          <span className="hidden lg:inline">{pageLabel}</span>
        </div>
        <span
          className="app-avatar ml-auto"
          aria-label={`Signed in as ${user.name ?? user.email}`}
        >
          {initials || "A"}
        </span>
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
          <div className="app-mobile-drawer">
            <div className="flex h-12 items-center justify-between">
              <span className="app-brand">
                <Image
                  alt=""
                  aria-hidden
                  height={28}
                  src="/brand/symbol/flow-mark.svg"
                  width={28}
                />
                Web Content Flow
              </span>
              <button
                aria-label="Close navigation"
                className="app-icon-button"
                onClick={closeDrawer}
                ref={closeButtonRef}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="app-sidebar-nav mt-5">
              <Navigation onNavigate={closeDrawer} />
            </div>
            <div className="app-account mt-auto">
              <span className="app-avatar" aria-hidden>
                {initials || "A"}
              </span>
              <span className="min-w-0 flex-1">
                <strong>{user.name ?? "Account"}</strong>
                <small>{user.email}</small>
              </span>
              <form action={signOutAction}>
                <button aria-label="Sign out" className="app-icon-button">
                  <LogOut aria-hidden size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="app-content-shell">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
