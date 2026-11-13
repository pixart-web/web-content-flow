import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

// The worker owns one AbortSignal per leased job. Handlers do not thread it
// through their signatures; the executor reads it from this context so a lost
// lease cancels in-flight provider calls instead of spending tokens on output
// the fenced database will reject anyway.
const storage = new AsyncLocalStorage<AbortSignal>();

export function runWithGenerationSignal<T>(
  signal: AbortSignal,
  run: () => Promise<T>,
): Promise<T> {
  return storage.run(signal, run);
}

export function currentGenerationSignal(): AbortSignal | undefined {
  return storage.getStore();
}
