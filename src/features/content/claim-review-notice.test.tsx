import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClaimReviewNotice } from "./claim-review-notice";

describe("ClaimReviewNotice", () => {
  it("lists the claims left after the automatic revision", () => {
    render(
      <ClaimReviewNotice
        provenance={{
          knowledgeChunkIds: ["chunk_000001"],
          claimRevision: {
            flagged: ["impermeável", "garantia"],
            remaining: ["garantia"],
          },
        }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Check these claims before using the text",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("listitem").textContent).toBe("garantia");
  });

  it("summarises the knowledge used when nothing remains", () => {
    render(
      <ClaimReviewNotice
        provenance={{
          knowledgeChunkIds: ["chunk_000001", "chunk_000002"],
          claimRevision: { flagged: ["impermeável"], remaining: [] },
        }}
      />,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(
      screen.getByText(
        /Based on 2 passages from the client’s documents\. 1 unsupported claim was removed automatically\./,
      ),
    ).toBeTruthy();
  });

  it("shows nothing for content generated without client knowledge", () => {
    const { container } = render(<ClaimReviewNotice provenance={{}} />);
    expect(container.innerHTML).toBe("");
  });
});
