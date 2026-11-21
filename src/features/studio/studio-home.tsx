import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Cpu,
  FolderKanban,
  Globe2,
  LayoutGrid,
  Megaphone,
  PenLine,
  Plus,
  Settings,
  Share2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type { ContentModule } from "@/generated/prisma/enums";

import { CommandBar } from "./command-bar";
import { studioCommands } from "./commands";
import { ModelStatus } from "./model-status";
import {
  STUDIO_MODULES,
  type StudioData,
  type StudioProject,
} from "./studio-data";
import styles from "./studio.module.css";

const MODULE_ICONS: Record<ContentModule, LucideIcon> = {
  WEBSITE: Globe2,
  SOCIAL: Share2,
  ADS: Megaphone,
  VIDEO: Clapperboard,
  COPY: PenLine,
  CALENDAR: CalendarDays,
};

// Decorative monogram colours, picked from the Studio palette by name so a
// project keeps its colour. Never a stand-in for a real image.
const MONOGRAMS = [
  ["#6d4aff", "#c4b5fd"],
  ["#7c3aed", "#ff9474"],
  ["#4f46e5", "#a78bfa"],
  ["#b4469b", "#ff9474"],
  ["#5b21b6", "#6d4aff"],
  ["#8b5cf6", "#f0abfc"],
] as const;

function monogram(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [from, to] = MONOGRAMS[hash % MONOGRAMS.length]!;
  return `linear-gradient(140deg, ${from}, ${to})`;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase();

function moduleLabel(module: ContentModule) {
  return (
    STUDIO_MODULES.find((entry) => entry.module === module)?.label ?? module
  );
}

function ProjectRow({ project }: { project: StudioProject }) {
  const modules = project.modules.map(moduleLabel).join(" · ");
  return (
    <Link className={styles.projectRow} href={`/app/projects/${project.id}`}>
      <span
        aria-hidden
        className={styles.monogram}
        style={{ background: monogram(project.brandName) }}
      >
        {project.brandName.trim().charAt(0).toUpperCase() || "·"}
      </span>
      <span className={styles.projectText}>
        <span className={styles.projectName}>{project.name}</span>
        <span className={styles.projectMeta}>
          {project.brandName}
          {modules ? ` · ${modules}` : ""} · {project.contentCount}{" "}
          {project.contentCount === 1 ? "item" : "items"} · updated{" "}
          {dateFormat.format(project.updatedAt)}
        </span>
      </span>
      <span
        className={`${styles.pill} ${project.status === "ACTIVE" ? styles.pillActive : ""}`}
      >
        {titleCase(project.status)}
      </span>
    </Link>
  );
}

export function StudioHome({
  data,
  user,
}: {
  data: StudioData;
  user: { name: string | null; email: string };
}) {
  const latest = data.projects[0];
  const initials = (user.name ?? user.email)
    .split(/[\s@._-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const nav = [
    { href: "/app/studio", label: "Studio", icon: LayoutGrid, active: true },
    { href: "/app/projects", label: "Projects", icon: FolderKanban },
    ...(latest
      ? [
          {
            href: `/app/projects/${latest.id}/library`,
            label: "Library",
            icon: BookOpen,
          },
        ]
      : []),
    ...(data.localMode
      ? [{ href: "/app/settings/local-ai", label: "Local AI", icon: Cpu }]
      : []),
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={styles.studio} data-theme="studio">
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/app/studio">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark */}
          <img
            alt=""
            height={32}
            src="/brand/symbol/flow-mark.svg"
            width={32}
          />
          <span>
            <span className={styles.brandName}>Web Content Flow</span>
            <span className={styles.brandSub}>Studio · preview</span>
          </span>
        </Link>
        <nav aria-label="Studio navigation" className={styles.nav}>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                aria-current={item.active ? "page" : undefined}
                className={`${styles.navLink} ${item.active ? styles.navLinkActive : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFoot}>
          <p className={styles.previewNote}>
            This is a design preview. The rest of the app keeps its current look
            until the new direction is approved.
          </p>
          <Link className={styles.classicLink} href="/app">
            ← Classic dashboard
          </Link>
        </div>
      </aside>

      <main className={styles.main} id="main-content">
        <div className={styles.topbar}>
          <CommandBar commands={studioCommands(data)} />
          <span
            aria-label={user.name ?? user.email}
            className={styles.avatar}
            role="img"
          >
            {initials}
          </span>
        </div>

        <section aria-labelledby="studio-hero" className={styles.hero}>
          <div aria-hidden className={styles.heroGlow} />
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Creative AI workspace</p>
            <h1 className={styles.heroTitle} id="studio-hero">
              From one brief to your whole content system,{" "}
              <span className={styles.heroAccent}>in one flow.</span>
            </h1>
            <p className={styles.heroLead}>
              Plan, write and organise websites, social campaigns, ads and video
              scripts from a single Brand Profile
              {data.localMode ? ", with AI that runs on this computer." : "."}
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href="/app/projects/new">
                <Plus aria-hidden size={18} />
                New project
              </Link>
              {latest ? (
                <Link
                  className={styles.secondary}
                  href={`/app/projects/${latest.id}`}
                >
                  Continue {latest.name}
                  <ArrowRight aria-hidden size={18} />
                </Link>
              ) : null}
            </div>
          </div>
          <div aria-hidden className={styles.heroCards}>
            {STUDIO_MODULES.slice(0, 4).map((entry) => {
              const Icon = MODULE_ICONS[entry.module];
              return (
                <div className={styles.heroCard} key={entry.module}>
                  <Icon size={18} />
                  {entry.label}
                  <span className={styles.heroCardLine} />
                  <span className={styles.heroCardLine} />
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="studio-create" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="studio-create">
              What do you want to create today?
            </h2>
            {latest ? (
              <span className={styles.sectionMeta}>in {latest.name}</span>
            ) : null}
          </div>
          <div className={styles.tiles}>
            {STUDIO_MODULES.map((entry) => {
              const Icon = MODULE_ICONS[entry.module];
              const enabled = latest?.modules.includes(entry.module);
              return (
                <Link
                  className={styles.tile}
                  href={
                    latest && enabled
                      ? `/app/projects/${latest.id}/${entry.path}`
                      : "/app/projects/new"
                  }
                  key={entry.module}
                >
                  <span className={styles.tileIcon}>
                    <Icon aria-hidden size={20} />
                  </span>
                  <span>
                    <span className={styles.tileLabel}>{entry.label}</span>
                    <span className={styles.tileHint}>
                      {latest && !enabled
                        ? "Not in this project · start a new one"
                        : entry.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
            <Link
              className={`${styles.tile} ${styles.tileNew}`}
              href="/app/projects/new"
            >
              <span className={styles.tileIcon}>
                <Plus aria-hidden size={20} />
              </span>
              <span>
                <span className={styles.tileLabel}>New project</span>
                <span className={styles.tileHint}>
                  Start from a guided Brief
                </span>
              </span>
            </Link>
          </div>
        </section>

        <div className={styles.split}>
          <section aria-labelledby="studio-projects" className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle} id="studio-projects">
                Recent projects
              </h2>
              <Link className={styles.sectionLink} href="/app/projects">
                All projects →
              </Link>
            </div>
            {data.projects.length ? (
              <ul className={styles.projectList}>
                {data.projects.slice(0, 5).map((project) => (
                  <li key={project.id}>
                    <ProjectRow project={project} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                No projects yet. Your first one starts with a guided Brief and
                becomes the Brand Profile every module builds on.
              </p>
            )}
          </section>
          <ModelStatus localMode={data.localMode} server={data.ai} />
        </div>

        <section aria-labelledby="studio-library" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="studio-library">
              Skills library
            </h2>
            <span className={styles.sectionMeta}>
              {data.skills.length} built-in skills
            </span>
          </div>
          <ul className={styles.library}>
            {data.skills.map((skill) => (
              <li key={skill.id}>
                <article className={styles.skill}>
                  <span className={styles.skillTag}>Built in</span>
                  <h3 className={styles.skillTitle}>{skill.title}</h3>
                  <p className={styles.skillText}>{skill.description}</p>
                </article>
              </li>
            ))}
          </ul>
          <p className={styles.notice}>
            Templates, components and installable skill packages arrive with a
            later stage. None are installed yet, so none are listed here.
          </p>
        </section>
      </main>
    </div>
  );
}
