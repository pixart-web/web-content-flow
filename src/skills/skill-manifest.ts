import { createHash } from "node:crypto";

import { z } from "zod";

// L6 (ADR L-7): one package format for what Web Content Flow's local agents
// run — skills now; templates, components and agents later (Experience
// Studio). A package is DATA ONLY: a manifest, instructions and examples.
// It can never ship code; outputs are always validated by schemas that live
// in the application (referenced by module + content type), so an installed
// package cannot weaken validation or run anything on the user's computer.
//
// These are product skills, not Claude Code development skills
// (.claude/skills/) — see docs/technical/50.

export const SKILL_MODULES = [
  "BRAND_PROFILE",
  "WEBSITE",
  "SOCIAL",
  "ADS",
  "VIDEO",
  "COPY",
  "CALENDAR",
] as const;
export type SkillModule = (typeof SKILL_MODULES)[number];

export const PACKAGE_KINDS = [
  "skill",
  "template",
  "component",
  "animation",
  "agent",
] as const;

const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

export const SkillManifestSchema = z
  .object({
    format: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,63}$/),
    version: semver,
    kind: z.literal("skill"),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
    origin: z.enum(["builtin", "installed"]),
    license: z
      .object({
        spdx: z.string().min(1).max(40),
        holder: z.string().min(1).max(120),
      })
      .strict(),
    module: z.enum(SKILL_MODULES),
    contentTypes: z.array(z.string().min(1)).min(1),
    // Prompt identities in the application's prompt registry.
    prompts: z
      .array(z.object({ key: z.string().min(1), version: semver }).strict())
      .min(1),
    // Case ids of the evaluation suite (pnpm eval:ai) that cover this skill.
    evaluationCases: z.array(z.string().min(1)),
    minProfile: z.enum(["essential", "standard", "advanced"]),
    compatibility: z.object({ app: z.string().min(1) }).strict(),
    // Installed packages only: extra, untrusted guidance appended to the
    // application's own instructions (never replacing them).
    guidance: z.string().max(4_000).optional(),
    files: z
      .record(
        z.string().regex(/^[a-z0-9][a-z0-9._/-]*$/),
        z.string().regex(/^[0-9a-f]{64}$/),
      )
      .default({}),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (manifest.origin === "builtin" && manifest.guidance)
      context.addIssue({
        code: "custom",
        path: ["guidance"],
        message: "Built-in skills use the application's instructions only.",
      });
    for (const prompt of manifest.prompts)
      if (!prompt.key.startsWith(`${manifest.module.toLocaleLowerCase()}.`))
        context.addIssue({
          code: "custom",
          path: ["prompts"],
          message: `Prompt ${prompt.key} belongs to another module.`,
        });
  });

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// Files listed in a package are checked against their sha256 before use, so
// a changed package is detected rather than trusted.
export function verifyPackageFiles(
  manifest: Pick<SkillManifest, "files">,
  read: (path: string) => Buffer | null,
) {
  const problems: string[] = [];
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (path.includes("..")) {
      problems.push(`${path}: path escapes the package`);
      continue;
    }
    const content = read(path);
    if (!content) problems.push(`${path}: missing`);
    else if (createHash("sha256").update(content).digest("hex") !== expected)
      problems.push(`${path}: content changed`);
  }
  return problems;
}
