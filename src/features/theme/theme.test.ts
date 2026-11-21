import { describe, expect, it } from "vitest";

import { parseTheme } from "./theme";

describe("app theme", () => {
  it("defaults to Studio and accepts only known themes", () => {
    expect(parseTheme(undefined)).toBe("studio");
    expect(parseTheme("studio")).toBe("studio");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("studio");
    expect(parseTheme("<script>")).toBe("studio");
  });
});
