// App theme (doc 55, S2). Studio is the default; light stays available. The
// choice lives in a cookie so the server renders the right theme on the first
// paint, with no flash and no hydration mismatch.
export const THEME_COOKIE = "wcf-theme";
export const APP_THEMES = ["studio", "light"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export function parseTheme(value: string | undefined | null): AppTheme {
  return value === "light" ? "light" : "studio";
}
