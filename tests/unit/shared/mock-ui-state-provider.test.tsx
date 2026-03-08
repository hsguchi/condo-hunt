import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useMockUiState,
  type MockUiStateContextValue
} from "@/components/providers/mock-ui-state-context";
import { MockUiStateProvider } from "@/components/providers/mock-ui-state-provider";
import {
  MOCK_UI_STATE_CHANGE_EVENT,
  MOCK_UI_STATE_STORAGE_KEY,
  createMockUiState
} from "@/lib/mock-ui-state";
import { afterEach, describe, expect, it } from "vitest";

function readStoredState() {
  const storedValue = window.localStorage.getItem(MOCK_UI_STATE_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  return JSON.parse(storedValue);
}

function ProviderHarness() {
  const { actions, isHydrated, state }: MockUiStateContextValue = useMockUiState();

  return (
    <section>
      <output aria-label="hydrated">{String(isHydrated)}</output>
      <output aria-label="shortlisted">{state.shortlistedIds.join(",") || "none"}</output>
      <output aria-label="dismissed">{state.dismissedIds.join(",") || "none"}</output>
      <output aria-label="contact-status">{state.contactStatusByAgentId["1"]}</output>
      <output aria-label="route">{state.lastVisitedRoute ?? "none"}</output>
      <button type="button" onClick={() => actions.setListingShortlisted("2", true)}>
        shortlist 2
      </button>
      <button type="button" onClick={() => actions.dismissListing("2")}>
        dismiss 2
      </button>
      <button type="button" onClick={() => actions.restoreListing("2")}>
        restore 2
      </button>
      <button type="button" onClick={() => actions.setContactStatus("1", "scheduled")}>
        schedule agent 1
      </button>
      <button type="button" onClick={() => actions.setLastVisitedRoute("/dashboard")}>
        set route
      </button>
    </section>
  );
}

describe("MockUiStateProvider", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hydrates from persisted storage and persists action updates back to localStorage", async () => {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(
        createMockUiState({
          shortlistedIds: ["2"],
          lastVisitedRoute: "/contacts"
        })
      )
    );

    const user = userEvent.setup();

    render(
      <MockUiStateProvider>
        <ProviderHarness />
      </MockUiStateProvider>
    );

    await waitFor(() => expect(screen.getByLabelText("hydrated")).toHaveTextContent("true"));
    expect(screen.getByLabelText("shortlisted")).toHaveTextContent("2");
    expect(screen.getByLabelText("route")).toHaveTextContent("/contacts");

    await user.click(screen.getByRole("button", { name: "schedule agent 1" }));
    await user.click(screen.getByRole("button", { name: "shortlist 2" }));
    await user.click(screen.getByRole("button", { name: "dismiss 2" }));
    await user.click(screen.getByRole("button", { name: "restore 2" }));
    await user.click(screen.getByRole("button", { name: "shortlist 2" }));
    await user.click(screen.getByRole("button", { name: "set route" }));

    await waitFor(() => {
      expect(screen.getByLabelText("dismissed")).toHaveTextContent("none");
      expect(screen.getByLabelText("route")).toHaveTextContent("/dashboard");
      expect(readStoredState()).toMatchObject({
        shortlistedIds: ["2"],
        dismissedIds: [],
        lastVisitedRoute: "/dashboard",
        contactStatusByAgentId: {
          "1": "scheduled"
        }
      });
    });
  });

  it("syncs same-tab storage changes when the shared custom event fires", async () => {
    render(
      <MockUiStateProvider>
        <ProviderHarness />
      </MockUiStateProvider>
    );

    await waitFor(() => expect(screen.getByLabelText("hydrated")).toHaveTextContent("true"));
    expect(screen.getByLabelText("shortlisted")).toHaveTextContent("1");

    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(
        createMockUiState({
          shortlistedIds: ["2"],
          dismissedIds: ["1"],
          lastVisitedRoute: "/shortlist"
        })
      )
    );
    window.dispatchEvent(new CustomEvent(MOCK_UI_STATE_CHANGE_EVENT));

    await waitFor(() => {
      expect(screen.getByLabelText("shortlisted")).toHaveTextContent("2");
      expect(screen.getByLabelText("dismissed")).toHaveTextContent("1");
      expect(screen.getByLabelText("route")).toHaveTextContent("/shortlist");
    });
  });
});
