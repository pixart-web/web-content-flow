import type { ContentModule } from "@/generated/prisma/enums";

// The six content modules, in display order, with their workspace paths.
export const STUDIO_MODULES: readonly {
  module: ContentModule;
  label: string;
  hint: string;
  path: string;
}[] = [
  {
    module: "WEBSITE",
    label: "Website",
    hint: "Pages and SEO copy",
    path: "content/website",
  },
  {
    module: "SOCIAL",
    label: "Social",
    hint: "Posts and campaigns",
    path: "content/social",
  },
  {
    module: "ADS",
    label: "Ads & creative",
    hint: "Copy and creative direction",
    path: "content/ads",
  },
  {
    module: "VIDEO",
    label: "Video & reels",
    hint: "Scripts and shot lists",
    path: "content/video",
  },
  {
    module: "COPY",
    label: "Copy",
    hint: "Emails and general copy",
    path: "content/copy",
  },
  {
    module: "CALENDAR",
    label: "Calendar",
    hint: "Editorial planning",
    path: "content/calendar",
  },
];
