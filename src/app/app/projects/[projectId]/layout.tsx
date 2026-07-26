import Link from "next/link";

import { requireProjectOwner } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await requireProjectOwner(projectId);
  const websiteAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "WEBSITE" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: { projectId, module: "WEBSITE" },
    })) > 0;
  const socialAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "SOCIAL" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: { projectId, module: "SOCIAL" },
    })) > 0;
  const adsAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "ADS" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: { projectId, module: "ADS" },
    })) > 0;
  const videoAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "VIDEO" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: { projectId, module: "VIDEO" },
    })) > 0;
  const copyAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "COPY" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: {
        projectId,
        module: "COPY",
        type: { not: "FOUNDATION_COPY" },
      },
    })) > 0;
  const calendarAvailable =
    (await getPrisma().projectModule.count({
      where: { projectId, module: "CALENDAR" },
    })) > 0 ||
    (await getPrisma().contentItem.count({
      where: { projectId, module: "CALENDAR" },
    })) > 0;
  const links: readonly (readonly [string, string])[] = [
    ["Overview", `/app/projects/${projectId}`],
    ["Brief", `/app/projects/${projectId}/brief`],
    ["Brand Profile", `/app/projects/${projectId}/brand-profile`],
    ...(websiteAvailable
      ? ([["Website", `/app/projects/${projectId}/content/website`]] as const)
      : []),
    ...(socialAvailable
      ? ([["Social", `/app/projects/${projectId}/content/social`]] as const)
      : []),
    ...(adsAvailable
      ? ([
          ["Ads & Creative", `/app/projects/${projectId}/content/ads`],
        ] as const)
      : []),
    ...(videoAvailable
      ? ([
          ["Video & Reels", `/app/projects/${projectId}/content/video`],
        ] as const)
      : []),
    ...(copyAvailable
      ? ([["General Copy", `/app/projects/${projectId}/content/copy`]] as const)
      : []),
    ...(calendarAvailable
      ? ([
          ["Content Calendar", `/app/projects/${projectId}/content/calendar`],
        ] as const)
      : []),
    ["Library", `/app/projects/${projectId}/library`],
    ["Export", `/app/projects/${projectId}/export`],
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-secondary text-sm">{project.brandName}</p>
        <h1 className="font-display mt-1 text-2xl font-semibold">
          {project.name}
        </h1>
      </header>
      <nav
        aria-label="Project navigation"
        className="border-default flex gap-1 overflow-x-auto border-b"
      >
        {links.map(([label, href]) => (
          <Link
            className="hover:bg-surface-subtle rounded-t-control inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
