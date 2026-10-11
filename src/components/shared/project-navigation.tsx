"use client";

import {
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
  Export: FileOutput,
} as const;

export function ProjectNavigation({
  links,
}: {
  links: readonly (readonly [keyof typeof iconByLabel, string])[];
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Project navigation" className="project-navigation">
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
