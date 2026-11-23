"use client";

import {
  BookOpen,
  CalendarDays,
  FileOutput,
  FileText,
  Globe2,
  Layers3,
  LayoutGrid,
  Library,
  Megaphone,
  Mic2,
  Share2,
  Type,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const iconByLabel = {
  Overview: LayoutGrid,
  Brief: FileText,
  "Brand Profile": Layers3,
  Website: Globe2,
  Social: Share2,
  "Ads & Creative": Megaphone,
  "Video & Reels": Mic2,
  "General Copy": Type,
  "Content Calendar": CalendarDays,
  Library,
  Knowledge: BookOpen,
  Export: FileOutput,
} as const;

export function ProjectNavigation({
  links,
}: {
  links: readonly (readonly [keyof typeof iconByLabel, string])[];
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Which ends have tabs scrolled out of view (doc 55, S6): drives the edge
  // fades. Starts false on the server and the client alike.
  const [more, setMore] = useState({ start: false, end: false });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () =>
      setMore({
        start: nav.scrollLeft > 4,
        end: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4,
      });
    // Bring the active tab into view by scrolling the tab bar only:
    // scrollIntoView would also scroll the page sideways.
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const box = nav.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const left = tab.left - box.left + nav.scrollLeft;
      const right = left + tab.width;
      if (left < nav.scrollLeft) nav.scrollLeft = left;
      else if (right > nav.scrollLeft + nav.clientWidth)
        nav.scrollLeft = right - nav.clientWidth;
    }
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <nav
      aria-label="Project navigation"
      className="project-navigation"
      data-more-end={more.end || undefined}
      data-more-start={more.start || undefined}
      ref={navRef}
    >
      {links.map(([label, href], index) => {
        const Icon = iconByLabel[label];
        const active =
          index === 0 ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : ""}
            href={href}
            key={href}
          >
            <Icon aria-hidden size={16} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
