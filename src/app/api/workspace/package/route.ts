import { handleWorkspaceExport } from "@/server/workspace/workspace-routes";

export async function POST() {
  return handleWorkspaceExport();
}
