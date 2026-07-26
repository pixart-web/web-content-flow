import type { Result } from "./result";

export type AuthenticatedUser = Readonly<{ userId: string }>;
export type AuthorizedProject = Readonly<{ userId: string; projectId: string }>;
export type AuthorizedContentItem = Readonly<{ userId: string; projectId: string; contentItemId: string }>;
export type AuthorizedGenerationJob = Readonly<{ userId: string; projectId: string; generationJobId: string }>;

export interface AuthorizationService {
  requireUser(): Promise<Result<AuthenticatedUser>>;
  requireProjectOwner(projectId: string): Promise<Result<AuthorizedProject>>;
  requireContentItemOwner(contentItemId: string): Promise<Result<AuthorizedContentItem>>;
  requireGenerationJobOwner(generationJobId: string): Promise<Result<AuthorizedGenerationJob>>;
}
