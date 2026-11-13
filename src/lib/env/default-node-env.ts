// Standalone processes (worker, maintenance) run through tsx, which does not
// set NODE_ENV the way `next dev` / `next start` do, so env validation failed
// locally. Default only for local runs; deployed environments must set
// NODE_ENV explicitly so production guards can never be skipped by omission.
export function defaultNodeEnvForLocalProcess(
  env: Record<string, string | undefined>,
): string | undefined {
  if (env.NODE_ENV) return env.NODE_ENV;
  if ((env.APP_ENV ?? "local") === "local") return "development";
  return undefined;
}
