import "server-only";

import { createHash } from "node:crypto";

import type { ContentModule, Prisma } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/server/db/prisma";
import { getRolloutPolicy } from "@/server/launch/rollout";
import { resolvePlanPolicy } from "@/server/plans/plan-policy";
import {
  renderCalendarCsv,
  renderJson,
  renderMarkdown,
  renderPlainText,
  sanitizeFilename,
  type ExportableVersion,
} from "@/server/export/formatters";
import {
  ExportRequestSchema,
  type ExportRequest,
} from "@/server/export/export-schemas";

type ExportFailure = {
  ok: false;
  code: "NOT_FOUND" | "DISABLED" | "INVALID" | "INCOMPATIBLE" | "TOO_LARGE";
  message: string;
};

export async function createContentExport(input: {
  userId: string;
  projectId: string;
  request: ExportRequest;
}): Promise<{ ok: true; exportId: string; filename: string } | ExportFailure> {
  const rollout = getRolloutPolicy();
  if (!rollout.exportsEnabled)
    return {
      ok: false,
      code: "DISABLED",
      message: "Exports are unavailable in the current launch mode.",
    };
  const parsed = ExportRequestSchema.safeParse(input.request);
  if (!parsed.success)
    return { ok: false, code: "INVALID", message: "Check the export options." };
  if (
    parsed.data.scope === "PROJECT_PACKAGE" &&
    !rollout.projectPackageExportEnabled
  )
    return {
      ok: false,
      code: "DISABLED",
      message: "Project package export is not enabled.",
    };
  if (parsed.data.scope === "LIBRARY_FILTER")
    return {
      ok: false,
      code: "INVALID",
      message: "Filtered Library export is not available yet.",
    };
  if (parsed.data.scope === "SINGLE_ITEM" && parsed.data.itemIds.length !== 1)
    return {
      ok: false,
      code: "INVALID",
      message: "Select one content item.",
    };
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: input.userId },
    include: {
      user: { select: { plan: true } },
      brief: true,
      currentBrandProfileVersion: true,
    },
  });
  if (!project)
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This export is not available.",
    };
  const policy = resolvePlanPolicy(project.user.plan);
  if (!policy || !policy.formats.includes(parsed.data.format))
    return {
      ok: false,
      code: "INVALID",
      message: "This format is not available for your plan.",
    };

  const where: Prisma.ContentItemWhereInput = {
    projectId: project.id,
    project: { userId: input.userId },
  };
  if (
    parsed.data.scope === "SINGLE_ITEM" ||
    parsed.data.scope === "SELECTED_ITEMS"
  ) {
    if (!parsed.data.itemIds.length)
      return {
        ok: false,
        code: "INVALID",
        message: "Select at least one content item.",
      };
    where.id = { in: parsed.data.itemIds };
  }
  if (parsed.data.scope === "MODULE") {
    if (!parsed.data.module)
      return { ok: false, code: "INVALID", message: "Select a module." };
    where.module = parsed.data.module as ContentModule;
  }
  if (parsed.data.scope === "CALENDAR") where.module = "CALENDAR";

  const items = await prisma.contentItem.findMany({
    where,
    take: 50,
    include: {
      currentVersion: true,
      versions: parsed.data.versionIds.length
        ? { where: { id: { in: parsed.data.versionIds } }, take: 50 }
        : false,
    },
    orderBy: { updatedAt: "desc" },
  });
  const versions: ExportableVersion[] = [];
  for (const item of items) {
    const selected = parsed.data.versionIds.length
      ? item.versions
      : item.currentVersion
        ? [item.currentVersion]
        : [];
    for (const version of selected)
      versions.push({
        itemId: item.id,
        title: item.title,
        module: item.module,
        type: item.type,
        versionId: version.id,
        versionNumber: version.versionNumber,
        schemaVersion: version.schemaVersion,
        snapshot: version.snapshot,
        provenance: version.provenance,
      });
  }
  if (!versions.length)
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "No exportable content was found.",
    };
  if (
    parsed.data.itemIds.length &&
    new Set(items.map(({ id }) => id)).size !==
      new Set(parsed.data.itemIds).size
  )
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "This export is not available.",
    };

  let body: string;
  try {
    if (parsed.data.format === "PLAIN_TEXT") body = renderPlainText(versions);
    else if (parsed.data.format === "MARKDOWN") body = renderMarkdown(versions);
    else if (parsed.data.format === "CSV") body = renderCalendarCsv(versions);
    else
      body =
        parsed.data.scope === "PROJECT_PACKAGE"
          ? JSON.stringify(
              {
                schemaVersion: "1.0",
                manifest: {
                  product: "Web Content Flow",
                  projectId: project.id,
                  projectName: project.name,
                  outputLanguage: project.outputLanguage,
                  exportedAt: new Date().toISOString(),
                },
                brief: project.brief?.data ?? null,
                brandProfile:
                  project.currentBrandProfileVersion?.snapshot ?? null,
                content: JSON.parse(renderJson(versions)) as unknown,
              },
              null,
              2,
            )
          : renderJson(versions);
  } catch {
    return {
      ok: false,
      code: "INCOMPATIBLE",
      message: "The selected content is not compatible with this format.",
    };
  }
  const payload = Buffer.from(body, "utf8");
  const maximum = Math.min(
    policy.exportMaxBytes,
    getServerEnv().EXPORT_MAX_BYTES,
  );
  if (payload.byteLength > maximum)
    return {
      ok: false,
      code: "TOO_LARGE",
      message: "This export exceeds the current size limit.",
    };
  const extension = {
    PLAIN_TEXT: "txt",
    MARKDOWN: "md",
    JSON: "json",
    CSV: "csv",
  }[parsed.data.format];
  const mimeType = {
    PLAIN_TEXT: "text/plain; charset=utf-8",
    MARKDOWN: "text/markdown; charset=utf-8",
    JSON: "application/json; charset=utf-8",
    CSV: "text/csv; charset=utf-8",
  }[parsed.data.format];
  const retentionHours = Math.min(
    policy.exportRetentionHours,
    getServerEnv().EXPORT_RETENTION_HOURS,
  );
  const filename = `${sanitizeFilename(project.name)}-${parsed.data.scope.toLowerCase()}.${extension}`;
  const record = await prisma.contentExport.create({
    data: {
      projectId: project.id,
      requestedByUserId: input.userId,
      status: "COMPLETE",
      format: parsed.data.format,
      scope: parsed.data.scope,
      selectedVersionIds: versions.map(({ versionId }) => versionId),
      filename,
      mimeType,
      payload,
      byteSize: payload.byteLength,
      checksum: createHash("sha256").update(payload).digest("hex"),
      expiresAt: new Date(Date.now() + retentionHours * 60 * 60_000),
      completedAt: new Date(),
    },
  });
  return { ok: true, exportId: record.id, filename };
}

export async function getOwnedExport(
  userId: string,
  projectId: string,
  exportId: string,
) {
  const record = await getPrisma().contentExport.findFirst({
    where: {
      id: exportId,
      projectId,
      requestedByUserId: userId,
      project: { userId },
      status: "COMPLETE",
      expiresAt: { gt: new Date() },
    },
  });
  return record?.payload ? record : null;
}
