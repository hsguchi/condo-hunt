import { sampleAgents } from "@/lib/sample-data";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_UI_STATE_CHANGE_EVENT,
  MOCK_UI_STATE_STORAGE_KEY,
  SHORTLIST_FILTER_ALL,
  clearPersistedMockUiState,
  createMockUiState,
  mergeMockUiState,
  readPersistedMockUiState,
  resetPersistedMockUiState,
  seedPersistedMockUiState,
  writePersistedMockUiState
} from "@/lib/mock-ui-state";

function readStoredState() {
  const storedValue = window.localStorage.getItem(MOCK_UI_STATE_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  return JSON.parse(storedValue);
}

describe("mock-ui-state helpers", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("creates the default mock state from the sample data", () => {
    const state = createMockUiState();

    expect(state.shortlistedIds).toEqual(["1"]);
    expect(state.dismissedIds).toEqual([]);
    expect(state.activeListingFilters).toEqual({});
    expect(state.activeShortlistFilter).toBe(SHORTLIST_FILTER_ALL);
    expect(state.uiFlags).toEqual({
      filterSheetOpen: false,
      contactAllSheetOpen: false
    });
    expect(state.contactStatusByAgentId).toEqual({
      [sampleAgents[0].id]: "contacted",
      [sampleAgents[1].id]: "pending"
    });
  });

  it("sanitizes overlapping shortlist and dismissed ids plus all-like filters", () => {
    const state = createMockUiState({
      shortlistedIds: ["1", "2", "2", "", "3"],
      dismissedIds: ["2", "2", "3", ""],
      activeListingFilters: {
        budget: " All budgets ",
        district: " D15 ",
        bedrooms: " 2 bedrooms "
      },
      activeShortlistFilter: " All saved "
    });

    expect(state.shortlistedIds).toEqual(["1"]);
    expect(state.dismissedIds).toEqual(["2", "3"]);
    expect(state.activeListingFilters).toEqual({
      district: "D15",
      bedrooms: "2 bedrooms"
    });
    expect(state.activeShortlistFilter).toBe(SHORTLIST_FILTER_ALL);
  });

  it("merges nested state patches without dropping the current shape", () => {
    const state = mergeMockUiState(createMockUiState(), {
      contactStatusByAgentId: {
        "1": "scheduled"
      },
      uiFlags: {
        filterSheetOpen: true
      },
      copiedValue: "+6591234567"
    });

    expect(state.contactStatusByAgentId).toMatchObject({
      "1": "scheduled",
      "2": "pending"
    });
    expect(state.uiFlags).toEqual({
      filterSheetOpen: true,
      contactAllSheetOpen: false
    });
    expect(state.copiedValue).toBe("+6591234567");
  });

  it("writes and rehydrates persisted mock state through localStorage", () => {
    const state = createMockUiState({
      shortlistedIds: ["2"],
      dismissedIds: ["3"],
      activeListingFilters: {
        district: "D15"
      }
    });

    writePersistedMockUiState(state);

    expect(readStoredState()).toMatchObject({
      shortlistedIds: ["2"],
      dismissedIds: ["3"],
      activeListingFilters: {
        district: "D15"
      }
    });
    expect(readPersistedMockUiState()).toEqual(state);
  });

  it("seeds and resets persisted state while dispatching the shared change event", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    const seededState = seedPersistedMockUiState({
      shortlistedIds: ["2"],
      contactStatusByAgentId: {
        "2": "scheduled"
      }
    });

    expect(readStoredState()).toMatchObject({
      shortlistedIds: ["2"],
      contactStatusByAgentId: {
        "1": "contacted",
        "2": "scheduled"
      }
    });
    expect(seededState.shortlistedIds).toEqual(["2"]);
    expect(dispatchEventSpy.mock.calls[0]?.[0].type).toBe(MOCK_UI_STATE_CHANGE_EVENT);

    const resetState = resetPersistedMockUiState();

    expect(resetState).toEqual(createMockUiState());
    expect(readStoredState()).toEqual(createMockUiState());
    expect(dispatchEventSpy.mock.calls[1]?.[0].type).toBe(MOCK_UI_STATE_CHANGE_EVENT);

    clearPersistedMockUiState();
    expect(window.localStorage.getItem(MOCK_UI_STATE_STORAGE_KEY)).toBeNull();
  });
});
