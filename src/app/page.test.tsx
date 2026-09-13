import { render, screen } from "@testing-library/react";
import FoundationPage from "./page";

describe("LandingPage", () => {
  it("renders the public product entry point", () => {
    render(<FoundationPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "From one brief to your entire content system.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Web Content Flow")[0]).toBeVisible();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Join the private beta" })[0],
    ).toHaveAttribute("href", "/contact");
    expect(screen.queryByText(/testimonial/i)).not.toBeInTheDocument();
  });
});
