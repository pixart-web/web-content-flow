import type { ContentModule } from "@/generated/prisma/enums";

import type { StudioCommand } from "./command-bar";
import { STUDIO_MODULES } from "./studio-modules";

// What the universal command bar can open: real projects, their modules and
// library, and settings. Shared by the app shell and the Studio home.
export type CommandSource = {
  localMode: boolean;
  projects: readonly {
    id: string;
    name: string;
    brandName: string;
    modules: readonly ContentModule[];
  }[];
};

export function studioCommands(data: CommandSource): StudioCommand[] {
  const commands: StudioCommand[] = [
    {
      id: "new",
      group: "Create",
      label: "New project",
      href: "/app/projects/new",
    },
  ];
  for (const project of data.projects.slice(0, 8)) {
    commands.push({
      id: `p-${project.id}`,
      group: "Projects",
      label: project.name,
      detail: project.brandName,
      href: `/app/projects/${project.id}`,
    });
    for (const projectModule of project.modules) {
      const entry = STUDIO_MODULES.find(
        (item) => item.module === projectModule,
      );
      if (entry)
        commands.push({
          id: `m-${project.id}-${projectModule}`,
          group: "Modules",
          label: `${entry.label} · ${project.name}`,
          detail: entry.hint,
          href: `/app/projects/${project.id}/${entry.path}`,
        });
    }
    commands.push({
      id: `l-${project.id}`,
      group: "Modules",
      label: `Library · ${project.name}`,
      detail: "Every content item",
      href: `/app/projects/${project.id}/library`,
    });
  }
  commands.push(
    ...(data.localMode
      ? [
          {
            id: "s-ai",
            group: "Settings",
            label: "Local AI",
            detail: "Models on this computer",
            href: "/app/settings/local-ai",
          },
        ]
      : []),
    {
      id: "s-workspace",
      group: "Settings",
      label: "Workspace package",
      detail: "Export or import",
      href: "/app/settings/workspace",
    },
    {
      id: "s-account",
      group: "Settings",
      label: "Account",
      href: "/app/settings/account",
    },
    {
      id: "nav-dashboard",
      group: "Go to",
      label: "Studio home",
      href: "/app",
    },
    {
      id: "nav-classic",
      group: "Go to",
      label: "Classic dashboard",
      href: "/app/dashboard",
    },
  );
  return commands;
}
