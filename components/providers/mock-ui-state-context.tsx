"use client";

import { createContext, useContext } from "react";
import type {
  ContactStatus,
  MockListingFilters,
  MockUiFlags,
  MockUiState,
  MockUiStateSeed
} from "@/lib/mock-ui-state";

export interface MockUiStateActions {
  resetState: () => void;
  seedState: (seed?: MockUiStateSeed) => void;
  setListingShortlisted: (listingId: string, isShortlisted: boolean) => void;
  dismissListing: (listingId: string) => void;
  restoreListing: (listingId: string) => void;
  setListingFilter: (key: keyof MockListingFilters, value: string | null) => void;
  replaceListingFilters: (filters: Partial<MockListingFilters>) => void;
  clearListingFilters: () => void;
  setShortlistFilter: (value: string) => void;
  setContactStatus: (agentId: string, status: ContactStatus) => void;
  setCopiedValue: (value: string | null) => void;
  setLastVisitedRoute: (route: string | null) => void;
  setUiFlag: (flag: keyof MockUiFlags, value: boolean) => void;
}

export interface MockUiStateContextValue {
  isHydrated: boolean;
  state: MockUiState;
  actions: MockUiStateActions;
}

export const MockUiStateContext = createContext<MockUiStateContextValue | null>(null);

export function useMockUiState() {
  const context = useContext(MockUiStateContext);

  if (!context) {
    throw new Error("useMockUiState must be used within MockUiStateProvider.");
  }

  return context;
}

export function useMockUiStateActions() {
  return useMockUiState().actions;
}
