import { readFileSync } from "node:fs";

const json = JSON.parse(readFileSync("design-tokens/tokens.json", "utf8"));
const css = readFileSync("design-tokens/tokens.css", "utf8").toLowerCase();
const globals = readFileSync("src/app/globals.css", "utf8");

const canonicalValues = [
  json.color.light.text.primary,
  json.color.light.text.secondary,
  json.color.light.surface.canvas,
  json.color.light.surface.default,
  json.color.light.border.default,
  json.color.light.action.primary,
];

for (const value of canonicalValues) {
  if (typeof value !== "string" || !css.includes(value.toLowerCase())) {
    throw new Error(
      `Canonical design token value is missing from tokens.css: ${String(value)}`,
    );
  }
}

for (const semanticVariable of [
  "--color-canvas",
  "--color-surface",
  "--color-primary",
  "--color-secondary",
  "--color-border-default",
  "--color-action-primary",
]) {
  if (!globals.includes(semanticVariable)) {
    throw new Error(
      `Tailwind semantic mapping is missing: ${semanticVariable}`,
    );
  }
}

process.stdout.write("Design token integration verified.\n");
