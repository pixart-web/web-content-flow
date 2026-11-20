import { handleWorkspaceImport } from "@/server/workspace/workspace-routes";

export async function POST(request: Request) {
  return handleWorkspaceImport(request);
}
