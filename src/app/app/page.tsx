import { StudioHome } from "@/features/studio/studio-home";
import { loadStudioData } from "@/features/studio/studio-data";
import { requireUser } from "@/server/auth/require-user";
import { getPrisma } from "@/server/db/prisma";

// The app home: the Creative AI Workspace Studio home (doc 55, S3). The
// previous dashboard stays at /app/dashboard for this version.
export default async function HomePage() {
  const user = await requireUser();
  const data = await loadStudioData(getPrisma(), user.id);
  return <StudioHome data={data} user={user} />;
}
