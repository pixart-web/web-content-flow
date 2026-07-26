import {
  getContentTypeDefinition,
  parseRegisteredContentSnapshot,
} from "@/domain/content/content-registry";

export type ExportableVersion = Readonly<{
  itemId: string;
  title: string;
  module: string;
  type: string;
  versionId: string;
  versionNumber: number;
  schemaVersion: string;
  snapshot: unknown;
  provenance: unknown;
}>;

export function sanitizeFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replaceAll(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "-")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^[.-]+|\.+$/g, "")
    .slice(0, 100);
  return normalized || "web-content-flow-export";
}

function validate(entry: ExportableVersion) {
  const parsed = parseRegisteredContentSnapshot(
    entry.module,
    entry.type,
    entry.snapshot,
  );
  const definition = getContentTypeDefinition(entry.module, entry.type);
  if (!parsed.success || !definition) throw new Error("INVALID_SNAPSHOT");
  return { parsed, definition };
}

function textFor(entry: ExportableVersion) {
  const { parsed, definition } = validate(entry);
  return definition.copyFormatter(parsed.data as never);
}

export function renderPlainText(entries: readonly ExportableVersion[]) {
  return entries
    .map(
      (entry) =>
        `${entry.title}\nModule: ${entry.module}\nVersion: ${entry.versionNumber}\n\n${textFor(entry)}`,
    )
    .join("\n\n---\n\n");
}

export function renderMarkdown(entries: readonly ExportableVersion[]) {
  return entries
    .map((entry) => {
      const body = textFor(entry).replaceAll("<", "\\<").replaceAll(">", "\\>");
      return `# ${entry.title}\n\n- Module: ${entry.module}\n- Content type: ${entry.type}\n- Version: ${entry.versionNumber}\n\n${body}`;
    })
    .join("\n\n---\n\n");
}

export function renderJson(entries: readonly ExportableVersion[]) {
  return JSON.stringify(
    {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      items: entries.map((entry) => ({
        itemId: entry.itemId,
        module: entry.module,
        contentType: entry.type,
        title: entry.title,
        selectedVersion: {
          id: entry.versionId,
          number: entry.versionNumber,
          schemaVersion: entry.schemaVersion,
        },
        snapshot: validate(entry).parsed.data,
        provenance: entry.provenance,
      })),
    },
    null,
    2,
  );
}

export function csvCell(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join(", ")
        : String(value);
  const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

export function renderCalendarCsv(entries: readonly ExportableVersion[]) {
  const rows: unknown[][] = [
    [
      "content_title",
      "version",
      "scheduled_date",
      "scheduled_time",
      "timezone",
      "module",
      "channel",
      "objective",
      "status",
      "entry_title",
      "summary",
    ],
  ];
  for (const exported of entries) {
    const { parsed } = validate(exported);
    const snapshot = parsed.data as unknown as {
      entries?: readonly Record<string, unknown>[];
    };
    if (!snapshot.entries) throw new Error("CSV_INCOMPATIBLE");
    for (const entry of snapshot.entries)
      rows.push([
        exported.title,
        String(exported.versionNumber),
        entry.scheduledDate,
        entry.scheduledTime,
        entry.timezone,
        entry.module,
        entry.channel,
        entry.objective,
        entry.status,
        entry.title,
        entry.summary,
      ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
