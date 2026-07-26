import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("design token integration", () => {
  it("keeps required semantic CSS variables and Tailwind mappings", () => {
    const tokens = readFileSync(
      resolve(process.cwd(), "design-tokens/tokens.css"),
      "utf8",
    );
    const globals = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    for (const variable of [
      "--color-surface-canvas",
      "--color-surface-default",
      "--color-text-primary",
      "--color-action-primary",
      "--color-border-default",
    ]) {
      expect(tokens).toContain(variable);
      expect(globals).toContain(variable);
    }

    expect(globals).toContain('@import "../../design-tokens/tokens.css";');
  });
});
