import { loadPromptCatalog } from "@/ai/prompts/registry";

import {
  SKILL_MODULES,
  SkillManifestSchema,
  type SkillManifest,
  type SkillModule,
} from "./skill-manifest";

// L6: the seven existing modules described as built-in skills. Derived from
// the prompt registry, so this adds a description layer and changes no
// generation behaviour.

const DESCRIPTIONS: Record<
  SkillModule,
  { title: string; description: string; evaluationCases: string[] }
> = {
  BRAND_PROFILE: {
    title: "Brand Profile",
    description:
      "Turns the project Brief into a structured brand profile: positioning, voice, audiences and words to use or avoid.",
    evaluationCases: ["brand_profile"],
  },
  WEBSITE: {
    title: "Website pages",
    description: "Writes structured website pages from the Brand Profile.",
    evaluationCases: ["website.home"],
  },
  SOCIAL: {
    title: "Social content",
    description:
      "Writes social posts, carousels, stories and captions for each platform.",
    evaluationCases: ["social.instagram_post"],
  },
  ADS: {
    title: "Ads",
    description:
      "Writes search and social ads, creative briefs and image prompt packs.",
    evaluationCases: ["ads.meta_ad"],
  },
  VIDEO: {
    title: "Video",
    description:
      "Writes video scripts, shot lists, voice-over scripts and production briefs.",
    evaluationCases: ["video.reel_script"],
  },
  COPY: {
    title: "Copy",
    description:
      "Writes general marketing copy: emails, product descriptions, FAQs and more.",
    evaluationCases: [
      "copy.marketing_email",
      "copy.product_description",
      "copy.faq_document",
    ],
  },
  CALENDAR: {
    title: "Editorial calendar",
    description:
      "Plans publication weeks from the content other skills produced.",
    evaluationCases: ["calendar.editorial_week"],
  },
};

export async function builtinSkills(): Promise<readonly SkillManifest[]> {
  const prompts = await loadPromptCatalog();
  return SKILL_MODULES.map((module) => {
    const own = prompts.filter((prompt) => prompt.module === module);
    return SkillManifestSchema.parse({
      format: 1,
      id: `wcf.${module.toLocaleLowerCase().replaceAll("_", "-")}`,
      version: own[0]!.version,
      kind: "skill",
      title: DESCRIPTIONS[module].title,
      description: DESCRIPTIONS[module].description,
      origin: "builtin",
      license: {
        spdx: "LicenseRef-WebContentFlow",
        holder: "Web Content Flow",
      },
      module,
      contentTypes: own.map((prompt) => prompt.contentType),
      prompts: own.map((prompt) => ({
        key: prompt.key,
        version: prompt.version,
      })),
      evaluationCases: DESCRIPTIONS[module].evaluationCases,
      // Local generation needs an approved model; only the standard profile
      // has one today (docs/technical/48).
      minProfile: "standard",
      compatibility: { app: "*" },
    });
  });
}
