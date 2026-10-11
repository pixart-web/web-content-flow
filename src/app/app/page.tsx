import {
  ArrowRight,
  CalendarDays,
  FileText,
  Globe2,
  Layers3,
  Megaphone,
  Plus,
  Share2,
} from "lucide-react";
import Link from "next/link";

import { ProjectCard } from "@/components/shared/project-card";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { createProjectRepository } from "@/server/repositories/project-repository";

const moduleCards = [
  {
    label: "Brand Profile",
    description: "Keep your brand foundation consistent",
    path: "brand-profile",
    icon: Layers3,
    tone: "indigo",
    action: "View profile",
  },
  {
    label: "Website Content",
    description: "Create structured pages and SEO copy",
    path: "content/website",
    icon: Globe2,
    tone: "blue",
    action: "Create pages",
  },
  {
    label: "Social Media",
    description: "Build posts and connected campaigns",
    path: "content/social",
    icon: Share2,
    tone: "purple",
    action: "Create posts",
  },
  {
    label: "Ads & Creative",
    description: "Develop copy and creative direction",
    path: "content/ads",
    icon: Megaphone,
    tone: "orange",
    action: "Create ads",
  },
] as const;

function formatModule(module: string) {
  return module === "COPY"
    ? "General Copy"
    : module.charAt(0) + module.slice(1).toLocaleLowerCase();
}

export default async function DashboardPage() {
  const user = await requireUser();
  const prisma = getPrisma();
  const projects = await createProjectRepository(prisma).listOwned(user.id);
  const activeProject =
    projects.find((project) => project.status !== "DRAFT") ?? projects[0];
  const [recentItems, calendarItems] = activeProject
    ? await Promise.all([
        prisma.contentItem.findMany({
          where: { projectId: activeProject.id, project: { userId: user.id } },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            module: true,
            title: true,
            status: true,
            updatedAt: true,
          },
        }),
        prisma.contentItem.findMany({
          where: {
            projectId: activeProject.id,
            module: "CALENDAR",
            project: { userId: user.id },
          },
          orderBy: { updatedAt: "desc" },
          take: 4,
          select: { id: true, title: true, status: true, updatedAt: true },
        }),
      ])
    : [[], []];
  const displayName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-kicker">Workspace overview</p>
          <h1>Good to see you, {displayName}</h1>
          <p>Continue your connected content workflow.</p>
        </div>
        <Link
          className="dashboard-primary-action"
          href={
            activeProject && activeProject.status !== "DRAFT"
              ? `/app/projects/${activeProject.id}`
              : "/app/projects/new"
          }
        >
          <Plus aria-hidden size={17} /> Create content
        </Link>
      </header>

      {projects.length === 0 ? (
        <section className="dashboard-empty">
          <span className="dashboard-empty-icon">
            <Layers3 aria-hidden size={24} />
          </span>
          <h2>Create your first connected content project</h2>
          <p>
            Start with one guided brief, then build a reusable Brand Profile and
            content system.
          </p>
          <ol>
            {[
              { label: "Brief", icon: FileText },
              { label: "Brand Profile", icon: Layers3 },
              { label: "Content modules", icon: Globe2 },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.label}>
                  <span>{index + 1}</span>
                  <Icon aria-hidden size={19} />
                  <strong>{step.label}</strong>
                </li>
              );
            })}
          </ol>
          <Link className="dashboard-primary-action" href="/app/projects/new">
            Create project
          </Link>
        </section>
      ) : (
        <>
          <section aria-labelledby="quick-actions-heading">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="quick-actions-heading">
                  Create from your brand foundation
                </h2>
                <p>{activeProject?.brandName}</p>
              </div>
              <Link href={`/app/projects/${activeProject!.id}`}>
                Open project <ArrowRight aria-hidden size={15} />
              </Link>
            </div>
            <div className="dashboard-module-grid">
              {moduleCards.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    className={`dashboard-module-card tone-${module.tone}`}
                    href={`/app/projects/${activeProject!.id}/${module.path}`}
                    key={module.label}
                  >
                    <span className="module-icon">
                      <Icon aria-hidden size={21} strokeWidth={1.8} />
                    </span>
                    <span>
                      <strong>{module.label}</strong>
                      <small>{module.description}</small>
                    </span>
                    <span className="module-action">
                      {module.action} <ArrowRight aria-hidden size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="dashboard-data-grid">
            <section
              className="dashboard-panel"
              aria-labelledby="recent-content-heading"
            >
              <div className="dashboard-panel-heading">
                <h2 id="recent-content-heading">Recent content</h2>
                <Link href={`/app/projects/${activeProject!.id}/library`}>
                  View library
                </Link>
              </div>
              {recentItems.length ? (
                <ul className="recent-content-list">
                  {recentItems.map((item) => (
                    <li key={item.id}>
                      <span className="recent-type-icon">
                        <FileText aria-hidden size={16} />
                      </span>
                      <Link
                        href={`/app/projects/${activeProject!.id}/content/${item.module.toLocaleLowerCase()}/${item.id}`}
                      >
                        {item.title}
                      </Link>
                      <span className="recent-module">
                        {formatModule(item.module)}
                      </span>
                      <span
                        className={`content-status status-${item.status.toLocaleLowerCase()}`}
                      >
                        {item.status.toLocaleLowerCase()}
                      </span>
                      <time dateTime={item.updatedAt.toISOString()}>
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(item.updatedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel-empty">
                  <FileText aria-hidden size={22} />
                  <p>
                    No content yet. Choose a module above to create the first
                    item.
                  </p>
                </div>
              )}
            </section>

            <section
              className="dashboard-panel calendar-summary"
              aria-labelledby="calendar-summary-heading"
            >
              <div className="dashboard-panel-heading">
                <h2 id="calendar-summary-heading">Content calendar</h2>
                <Link
                  href={`/app/projects/${activeProject!.id}/content/calendar`}
                >
                  Open
                </Link>
              </div>
              <div className="calendar-summary-date">
                <CalendarDays aria-hidden size={20} />
                <span>
                  <strong>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      year: "numeric",
                    }).format(new Date())}
                  </strong>
                  <small>Planning workspace</small>
                </span>
              </div>
              {calendarItems.length ? (
                <ul>
                  {calendarItems.map((item) => (
                    <li key={item.id}>
                      <span />
                      <Link
                        href={`/app/projects/${activeProject!.id}/content/calendar/${item.id}`}
                      >
                        {item.title}
                      </Link>
                      <small>{item.status.toLocaleLowerCase()}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel-empty compact">
                  <p>No calendar plans yet.</p>
                  <Link
                    href={`/app/projects/${activeProject!.id}/content/calendar`}
                  >
                    Create a plan
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section aria-labelledby="projects-heading">
            <div className="dashboard-section-heading">
              <h2 id="projects-heading">Your projects</h2>
              <Link href="/app/projects">
                View all <ArrowRight aria-hidden size={15} />
              </Link>
            </div>
            <div className="dashboard-project-grid">
              {projects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
