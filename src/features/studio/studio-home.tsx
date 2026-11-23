import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  FileText,
  Globe2,
  Megaphone,
  PenLine,
  Plus,
  Share2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type { ContentModule } from "@/generated/prisma/enums";

import { ModelStatus } from "./model-status";
import { monogram } from "./monogram";
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
  const firstName = user.name?.split(" ")[0] ?? null;

  return (
    <div className={styles.home}>
      <section aria-labelledby="studio-hero" className={styles.hero}>
        <div aria-hidden className={styles.heroGlow} />
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            {latest && firstName
              ? `Good to see you, ${firstName}`
              : "Creative AI workspace"}
          </p>
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
              <span className={styles.tileHint}>Start from a guided Brief</span>
            </span>
          </Link>
        </div>
      </section>

      <div className={styles.split}>
        <section aria-labelledby="studio-projects" className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="studio-projects">
              {data.projects.length ? "Recent projects" : "Your first project"}
            </h2>
            {data.projects.length ? (
              <Link className={styles.sectionLink} href="/app/projects">
                All projects →
              </Link>
            ) : null}
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
            <>
              <p className={styles.empty}>
                Start with a guided Brief. It becomes the Brand Profile every
                module builds on: website pages, social posts, ads, video
                scripts, copy and an editorial calendar.
              </p>
              <Link className={styles.aiAction} href="/app/projects/new">
                Create your first project →
              </Link>
            </>
          )}
        </section>
        <ModelStatus localMode={data.localMode} server={data.ai} />
      </div>

      {data.recentContent.length && latest ? (
        <section
          aria-labelledby="studio-recent"
          className={`${styles.panel} ${styles.section}`}
        >
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="studio-recent">
              Recent content
            </h2>
            <Link
              className={styles.sectionLink}
              href={`/app/projects/${latest.id}/library`}
            >
              Open library →
            </Link>
          </div>
          <ul className={styles.contentList}>
            {data.recentContent.map((item) => (
              <li key={item.id}>
                <Link className={styles.contentRow} href={item.href}>
                  <span className={styles.contentIcon}>
                    <FileText aria-hidden size={18} />
                  </span>
                  <span className={styles.projectText}>
                    <span className={styles.projectName}>{item.title}</span>
                    <span className={styles.projectMeta}>
                      {moduleLabel(item.module)} · {item.status.toLowerCase()} ·{" "}
                      {dateFormat.format(item.updatedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <p className={styles.classicNote}>
        Looking for the previous dashboard?{" "}
        <Link className={styles.sectionLink} href="/app/dashboard">
          Open the classic dashboard
        </Link>{" "}
        (available for this version).
      </p>
    </div>
  );
}
