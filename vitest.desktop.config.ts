import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Desktop runtime tests: real embedded PostgreSQL in temporary directories.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/desktop/**/*.desktop.test.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
