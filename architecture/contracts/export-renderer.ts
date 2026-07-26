export type ExportFormat = "MARKDOWN" | "JSON" | "TEXT";
export type ExportSection = Readonly<{ id: string; heading: string; contentType: string; fields: Readonly<Record<string, string | readonly string[]>>; mock: boolean }>;
export type ExportDocument = Readonly<{ schemaVersion: "1.0"; projectId: string; projectName: string; generatedAt: string; sections: readonly ExportSection[] }>;
export type RenderedExport = Readonly<{ format: ExportFormat; filename: string; mimeType: string; body: string; byteLength: number; mockContentIncluded: boolean }>;

export interface ExportRenderer {
  readonly format: ExportFormat;
  render(document: ExportDocument): Promise<RenderedExport>;
}
