import { render, screen } from "@testing-library/react";

import FoundationPage from "./page";

describe("FoundationPage", () => {
  it("renders the repository foundation status", () => {
    render(<FoundationPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Web Content Flow" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Repository foundation ready")).toBeVisible();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
