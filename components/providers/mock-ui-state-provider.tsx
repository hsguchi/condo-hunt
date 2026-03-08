"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  createMockUiState,
  isMockDataMode,
  mergeMockUiState,
  MOCK_UI_STATE_CHANGE_EVENT,
  MOCK_UI_STATE_STORAGE_KEY,
  SHORTLIST_FILTER_ALL,
  type MockUiState,
  type MockUiStateSeed,
  readPersistedMockUiState,
  writePersistedMockUiState
} from "@/lib/mock-ui-state";
import { MockUiStateContext, type MockUiStateActions } from "./mock-ui-state-context";

interface MockUiStateProviderProps {
  children: ReactNode;
}

function replaceListingFilters(
  currentState: MockUiState,
  filters: MockUiStateSeed["activeListingFilters"]
) {
  return mergeMockUiState(
    {
      ...currentState,
      activeListingFilters: {}
    },
    {
      activeListingFilters: filters ?? {}
    }
  );
}

export function MockUiStateProvider({ children }: MockUiStateProviderProps) {
  const mockMode = isMockDataMode();
  const [state, setState] = useState<MockUiState>(() => createMockUiState());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!mockMode) {
      setIsHydrated(true);
      return;
    }

    const syncFromStorage = () => {
      setState(readPersistedMockUiState());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== MOCK_UI_STATE_STORAGE_KEY) {
        return;
      }

      syncFromStorage();
    };

    syncFromStorage();
    setIsHydrated(true);

    window.addEventListener("storage", handleStorage);
    window.addEventListener(MOCK_UI_STATE_CHANGE_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(MOCK_UI_STATE_CHANGE_EVENT, syncFromStorage);
    };
  }, [mockMode]);

  useEffect(() => {
    if (!mockMode || !isHydrated) {
      return;
    }

    writePersistedMockUiState(state);
  }, [isHydrated, mockMode, state]);

  const actions: MockUiStateActions = {
    resetState() {
      setState(createMockUiState());
    },
    seedState(seed) {
      setState(createMockUiState(seed));
    },
    setListingShortlisted(listingId, isShortlisted) {
      setState((currentState) => {
        const shortlistedIds = new Set(currentState.shortlistedIds);
        const dismissedIds = new Set(currentState.dismissedIds);

        if (isShortlisted) {
          shortlistedIds.add(listingId);
          dismissedIds.delete(listingId);
        } else {
          shortlistedIds.delete(listingId);
        }

        return mergeMockUiState(currentState, {
          shortlistedIds: [...shortlistedIds],
          dismissedIds: [...dismissedIds]
        });
      });
    },
    dismissListing(listingId) {
      setState((currentState) => {
        const shortlistedIds = currentState.shortlistedIds.filter((id) => id !== listingId);
        const dismissedIds = new Set(currentState.dismissedIds);
        dismissedIds.add(listingId);

        return mergeMockUiState(currentState, {
          shortlistedIds,
          dismissedIds: [...dismissedIds]
        });
      });
    },
    restoreListing(listingId) {
      setState((currentState) =>
        mergeMockUiState(currentState, {
          dismissedIds: currentState.dismissedIds.filter((id) => id !== listingId)
        })
      );
    },
    setListingFilter(key, value) {
      setState((currentState) =>
        mergeMockUiState(currentState, {
          activeListingFilters: {
            [key]: value ?? undefined
          }
        })
      );
    },
    replaceListingFilters(filters) {
      setState((currentState) => replaceListingFilters(currentState, filters));
    },
    clearListingFilters() {
      setState((currentState) => replaceListingFilters(currentState, {}));
    },
    setShortlistFilter(value) {
      setState((currentState) =>
        currentState.activeShortlistFilter === value
          ? currentState
          : mergeMockUiState(currentState, {
              activeShortlistFilter: value || SHORTLIST_FILTER_ALL
            })
      );
    },
    setContactStatus(agentId, status) {
      setState((currentState) =>
        currentState.contactStatusByAgentId[agentId] === status
          ? currentState
          : mergeMockUiState(currentState, {
              contactStatusByAgentId: {
                [agentId]: status
              }
            })
      );
    },
    setCopiedValue(value) {
      setState((currentState) =>
        currentState.copiedValue === value
          ? currentState
          : mergeMockUiState(currentState, {
              copiedValue: value
            })
      );
    },
    setLastVisitedRoute(route) {
      setState((currentState) =>
        currentState.lastVisitedRoute === route
          ? currentState
          : mergeMockUiState(currentState, {
              lastVisitedRoute: route
            })
      );
    },
    setUiFlag(flag, value) {
      setState((currentState) =>
        currentState.uiFlags[flag] === value
          ? currentState
          : mergeMockUiState(currentState, {
              uiFlags: {
                [flag]: value
              }
            })
      );
    }
  };

  return (
    <MockUiStateContext.Provider
      value={{
        isHydrated,
        state,
        actions
      }}
    >
      {children}
    </MockUiStateContext.Provider>
  );
}
