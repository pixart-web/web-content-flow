import { redirect } from "next/navigation";

import { StudioHome } from "@/features/studio/studio-home";
import { loadStudioData } from "@/features/studio/studio-data";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";
import { getRolloutPolicy } from "@/server/launch/rollout";

export const metadata = {
  title: "Studio preview",
  robots: { index: false, follow: false },
};

// Prototype of the Creative AI Workspace home (proposal doc 55). It lives in
// its own route group so it brings its own shell without touching the app
// layout, is not linked from the current navigation, and replaces nothing:
// /app stays the dashboard until the direction is approved.
export default async function StudioPreviewPage() {
  const user = await requireUser("/app/studio");
  if (getRolloutPolicy().maintenance) redirect("/app");
  const data = await loadStudioData(getPrisma(), user.id);
  return <StudioHome data={data} user={user} />;
}
