import type { Metadata } from "next";
import { EditorialIndex } from "@/components/marketing/content-pages";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Web Content Flow guides are being prepared for the private beta.",
  alternates: { canonical: "/resources/guides" },
};
export default function GuidesPage() {
  return (
    <EditorialIndex
      eyebrow="GUIDES"
      title="Practical guides are in preparation."
      copy="We are building a focused library around strategic briefs, Brand Profiles, content operations and responsible use of generated drafts. No articles are published yet."
    />
  );
}
