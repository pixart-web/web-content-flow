import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { productMedia } from "@/content/product-media";
import { ProductMedia } from "./product-media";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe("ProductMedia", () => {
  it("uses the intentional poster when video files do not exist", () => {
    const media = productMedia["brief-to-brand"];
    render(<ProductMedia media={media} />);
    expect(screen.getByAltText(media.description)).toBeVisible();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(screen.getByText(media.title)).toBeVisible();
  });
});
