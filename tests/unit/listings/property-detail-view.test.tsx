import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertyDetailView } from "@/components/property/property-detail-view";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import { MockUiStateProvider } from "@/components/providers/mock-ui-state-provider";
import { MOCK_UI_STATE_STORAGE_KEY, createMockUiState, type MockUiStateSeed } from "@/lib/mock-ui-state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockWriteText = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  })
}));

function PropertyStateProbe() {
  const { isHydrated, state } = useMockUiState();

  return (
    <section>
      <output aria-label="hydrated">{String(isHydrated)}</output>
      <output aria-label="shortlisted-ids">{state.shortlistedIds.join(",") || "none"}</output>
      <output aria-label="copied-value">{state.copiedValue ?? "none"}</output>
    </section>
  );
}

function renderPropertyDetail(seed?: MockUiStateSeed, listingId = "2") {
  if (seed) {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(createMockUiState(seed))
    );
  }

  render(
    <MockUiStateProvider>
      <PropertyDetailView listingId={listingId} />
      <PropertyStateProbe />
    </MockUiStateProvider>
  );
}

describe("PropertyDetailView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockWriteText
      }
    });

    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: ""
    });

    window.history.replaceState({}, "", "/property/2");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("reflects shared shortlist state and wires save, call, WhatsApp, and copy actions", async () => {
    const user = userEvent.setup();

    renderPropertyDetail({
      shortlistedIds: ["2"]
    });

    await waitFor(() => expect(screen.getByLabelText("hydrated")).toHaveTextContent("true"));
    expect(screen.getByRole("heading", { name: "The Continuum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call Sarah Lim" })).toHaveAttribute(
      "href",
      "tel:+6587654321"
    );
    expect(
      screen.getByRole("link", { name: "Open WhatsApp chat with Sarah Lim" })
    ).toHaveAttribute("href", "https://wa.me/6587654321");
    expect(
      screen.getByRole("button", { name: "Remove property from shortlist" })
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Remove property from shortlist" }));

    await waitFor(() => {
      expect(screen.getByLabelText("shortlisted-ids")).toHaveTextContent("none");
      expect(
        screen.getByRole("button", { name: "Save property to shortlist" })
      ).toHaveAttribute("aria-pressed", "false");
    });

    await user.click(screen.getByRole("button", { name: "Save property to shortlist" }));

    await waitFor(() => {
      expect(screen.getByLabelText("shortlisted-ids")).toHaveTextContent("2");
      expect(
        screen.getByRole("button", { name: "Remove property from shortlist" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Copy agent phone number" }));


    await waitFor(() => {
      expect(screen.getByLabelText("copied-value")).toHaveTextContent("+6587654321");
      expect(screen.getByText("Phone number copied.")).toBeInTheDocument();
    });
  });

  it("uses the shared last visited route when back is pressed without in-app history", async () => {
    const user = userEvent.setup();

    renderPropertyDetail({
      lastVisitedRoute: "/contacts"
    }, "1");

    await waitFor(() => expect(screen.getByLabelText("hydrated")).toHaveTextContent("true"));

    await user.click(screen.getByRole("button", { name: "Back to previous screen" }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/contacts");
  });
});


