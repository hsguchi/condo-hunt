import type { AnchorHTMLAttributes } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortlistScreen } from "@/components/shortlist/shortlist-screen";
import { renderWithMockUiState } from "./test-utils";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("ShortlistScreen", () => {
  it("renders shared shortlist state, filters saved homes, and links cards to property detail", async () => {
    const user = userEvent.setup();

    renderWithMockUiState(<ShortlistScreen />, {
      route: "/shortlist",
      seed: {
        shortlistedIds: ["1", "2", "3"]
      }
    });

    expect(await screen.findByText("3 properties saved")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Meyer Crest" })).toHaveAttribute(
      "href",
      "/property/1"
    );
    expect(screen.getByText("$2.48M").closest("a")).toHaveAttribute("href", "/property/1");

    await user.click(screen.getByRole("button", { name: "Under $2.5M" }));

    expect(screen.getByText("1 matches under $2.5m")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Meyer Crest" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open The Continuum" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Grand Dunman" })).not.toBeInTheDocument();
  });

  it("removes a property from the shortlist and shows the empty state when nothing remains", async () => {
    const user = userEvent.setup();

    renderWithMockUiState(<ShortlistScreen />, {
      route: "/shortlist",
      seed: {
        shortlistedIds: ["1"]
      }
    });

    expect(await screen.findByText("1 property saved")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove Meyer Crest from shortlist" })
    );

    expect(await screen.findByText("0 properties saved")).toBeInTheDocument();
    expect(screen.getByText("Your shortlist is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse listings" })).toHaveAttribute(
      "href",
      "/listings"
    );
  });
});
