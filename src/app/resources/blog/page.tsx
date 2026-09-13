import type { Metadata } from "next";
import { EditorialIndex } from "@/components/marketing/content-pages";

export const metadata: Metadata = {
  title: "Product journal",
  description: "Web Content Flow product and content-operations notes.",
  alternates: { canonical: "/resources/blog" },
};
export default function BlogPage() {
  return (
    <EditorialIndex
      eyebrow="PRODUCT JOURNAL"
      title="Useful updates, when there is something worth sharing."
      copy="The journal will document meaningful product decisions and lessons from the private beta. There are no published posts yet."
    />
  );
}
