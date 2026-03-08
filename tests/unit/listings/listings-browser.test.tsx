import type { AnchorHTMLAttributes } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingsBrowser } from "@/components/listings/listings-browser";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import { MockUiStateProvider } from "@/components/providers/mock-ui-state-provider";
import { MOCK_UI_STATE_STORAGE_KEY, createMockUiState, type MockUiStateSeed } from "@/lib/mock-ui-state";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

function ListingsStateProbe() {
  const { isHydrated, state } = useMockUiState();

  return (
    <section>
      <output aria-label="hydrated">{String(isHydrated)}</output>
      <output aria-label="shortlisted-ids">{state.shortlistedIds.join(",") || "none"}</output>
      <output aria-label="dismissed-ids">{state.dismissedIds.join(",") || "none"}</output>
    </section>
  );
}

function renderListingsBrowser(seed?: MockUiStateSeed) {
  if (seed) {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(createMockUiState(seed))
    );
  }

  render(
    <MockUiStateProvider>
      <ListingsBrowser />
      <ListingsStateProbe />
    </MockUiStateProvider>
  );
}

describe("ListingsBrowser", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("filters listings, saves the active match, and dismisses it from the queue", async () => {
    const user = userEvent.setup();

    renderListingsBrowser();

    await waitFor(() => expect(screen.getByLabelText("hydrated")).toHaveTextContent("true"));
    expect(screen.getByRole("heading", { name: "Meyer Crest" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/property/1");

    await user.click(screen.getByRole("button", { name: "All areas" }));
    expect(screen.getByRole("heading", { name: "Refine your queue" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dunman" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Area: Dunman" })).toBeInTheDocument();
      expect(screen.getByText(/1 live matches/)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Grand Dunman" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/property/3");
    });

    await user.click(screen.getByRole("button", { name: "Save Grand Dunman to shortlist" }));

    await waitFor(() => {
      expect(screen.getByLabelText("shortlisted-ids")).toHaveTextContent("1,3");
      expect(
        screen.getByRole("button", { name: "Remove Grand Dunman from shortlist" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Grand Dunman is saved to your shortlist.")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Reject Grand Dunman" }));

    await waitFor(() => {
      expect(screen.getByLabelText("dismissed-ids")).toHaveTextContent("3");
      expect(screen.getByText("No listings match your current view")).toBeInTheDocument();
    });
  });
});
