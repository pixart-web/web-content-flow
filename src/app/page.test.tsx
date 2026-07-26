import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import FoundationPage from "./page";

vi.mock("@/server/launch/rollout", () => ({
  getRolloutPolicy: () => ({
    appEnvironment: "test",
    state: "PUBLIC",
    registrationAvailable: true,
    requestAccess: false,
    maintenance: false,
  }),
}));

describe("LandingPage", () => {
  it("renders the public product entry point", () => {
    render(<FoundationPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Build your brand and content system from one Brief.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Web Content Flow")).toBeVisible();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
