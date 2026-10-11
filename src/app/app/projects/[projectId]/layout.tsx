import { ProjectNavigation } from "@/components/shared/project-navigation";
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
  const links = [
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
  ] as const;

  return (
    <div className="project-workspace">
      <header className="project-heading">
        <div>
          <p>{project.brandName}</p>
          <h1>{project.name}</h1>
        </div>
        <span>
          {project.status.charAt(0) +
            project.status.slice(1).toLocaleLowerCase()}
        </span>
      </header>
      <ProjectNavigation links={links} />
      {children}
    </div>
  );
}
