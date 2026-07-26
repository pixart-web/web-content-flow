import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("./content-actions", () => ({
  saveContentAction: vi.fn(),
  regenerateContentAction: vi.fn(),
  restoreContentAction: vi.fn(),
}));

import { ContentItemEditor } from "./content-item-editor";

const snapshot = {
  schemaVersion: "1.0" as const,
  title: "UrbanStride foundation copy",
  objective: "Introduce the fictional launch",
  headline: "Move through the city in comfort",
  body: "UrbanStride combines comfort and considered design.",
  callToAction: "Explore the collection",
};

describe("ContentItemEditor", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders safe structured read fields and mock versions", () => {
    render(
      <ContentItemEditor
        currentVersionId="content-version-0001"
        itemId="content-item-0001"
        projectId="project-0001"
        snapshot={snapshot}
        versions={[
          {
            id: "content-version-0001",
            versionNumber: 1,
            source: "GENERATED",
            createdAt: "2026-01-01T00:00:00.000Z",
            brandProfileVersion: 1,
            mock: true,
            current: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(snapshot.headline)).toBeVisible();
    expect(screen.getByText(/Brand Profile v1 · Mock/)).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("supports edit, dirty input, cancel, and accessible copy feedback", async () => {
    const user = userEvent.setup();
    render(
      <ContentItemEditor
        currentVersionId="content-version-0001"
        itemId="content-item-0001"
        projectId="project-0001"
        snapshot={snapshot}
        versions={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const headline = screen.getByLabelText("Headline");
    fireEvent.change(headline, { target: { value: "Changed headline" } });
    expect(headline).toHaveValue("Changed headline");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy headline" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Headline copied.",
    );
  });
});
