import { sampleAgents, sampleListings } from "@/lib/sample-data";

export const MOCK_UI_STATE_STORAGE_KEY = "condo-hunt.mock-ui-state";
export const MOCK_UI_STATE_CHANGE_EVENT = "condo-hunt:mock-ui-state-change";
export const SHORTLIST_FILTER_ALL = "all";

export type ContactStatus = "pending" | "contacted" | "scheduled";

export interface MockListingFilters {
  budget?: string;
  tenure?: string;
  bedrooms?: string;
  district?: string;
}

export interface MockUiFlags {
  filterSheetOpen: boolean;
  contactAllSheetOpen: boolean;
}

export interface MockUiState {
  shortlistedIds: string[];
  dismissedIds: string[];
  activeListingFilters: MockListingFilters;
  activeShortlistFilter: string;
  contactStatusByAgentId: Record<string, ContactStatus>;
  copiedValue: string | null;
  lastVisitedRoute: string | null;
  uiFlags: MockUiFlags;
}

export interface MockUiStateSeed {
  shortlistedIds?: string[];
  dismissedIds?: string[];
  activeListingFilters?: Partial<MockListingFilters>;
  activeShortlistFilter?: string;
  contactStatusByAgentId?: Record<string, ContactStatus>;
  copiedValue?: string | null;
  lastVisitedRoute?: string | null;
  uiFlags?: Partial<MockUiFlags>;
}

const allowedContactStatuses = new Set<ContactStatus>(["pending", "contacted", "scheduled"]);
const listingFilterKeys = ["budget", "tenure", "bedrooms", "district"] as const;

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function uniqueStrings(values: string[] = []) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function isAllValue(value?: string | null) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeToken(value).replace(/[^a-z0-9]+/g, "");
  return normalized === "" || normalized === "all" || normalized.startsWith("all");
}

function sanitizeFilterValue(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || isAllValue(trimmed) ? undefined : trimmed;
}

function sanitizeListingFilters(filters?: Partial<MockListingFilters> | null): MockListingFilters {
  const nextFilters: MockListingFilters = {};

  for (const key of listingFilterKeys) {
    const value = sanitizeFilterValue(filters?.[key]);

    if (value) {
      nextFilters[key] = value;
    }
  }

  return nextFilters;
}

function sanitizeContactStatusMap(input?: Record<string, ContactStatus> | null) {
  const nextStatusMap: Record<string, ContactStatus> = {};

  if (!input) {
    return nextStatusMap;
  }

  for (const [agentId, status] of Object.entries(input)) {
    if (allowedContactStatuses.has(status)) {
      nextStatusMap[agentId] = status;
    }
  }

  return nextStatusMap;
}

function sanitizeUiFlags(flags?: Partial<MockUiFlags> | null): MockUiFlags {
  return {
    filterSheetOpen: Boolean(flags?.filterSheetOpen),
    contactAllSheetOpen: Boolean(flags?.contactAllSheetOpen)
  };
}

const defaultContactStatusByAgentId = sampleAgents.reduce<Record<string, ContactStatus>>((statusByAgent, agent) => {
  statusByAgent[agent.id] = agent.contacted ? "contacted" : "pending";
  return statusByAgent;
}, {});

export const DEFAULT_MOCK_UI_STATE: MockUiState = {
  shortlistedIds: sampleListings
    .filter((listing) => listing.status === "shortlisted")
    .map((listing) => listing.id),
  dismissedIds: [],
  activeListingFilters: {},
  activeShortlistFilter: SHORTLIST_FILTER_ALL,
  contactStatusByAgentId: defaultContactStatusByAgentId,
  copiedValue: null,
  lastVisitedRoute: null,
  uiFlags: {
    filterSheetOpen: false,
    contactAllSheetOpen: false
  }
};

export function sanitizeMockUiState(input?: Partial<MockUiState> | MockUiStateSeed | null): MockUiState {
  const dismissedIds = uniqueStrings(input?.dismissedIds ?? DEFAULT_MOCK_UI_STATE.dismissedIds);
  const dismissedIdSet = new Set(dismissedIds);
  const shortlistedIds = uniqueStrings(input?.shortlistedIds ?? DEFAULT_MOCK_UI_STATE.shortlistedIds).filter(
    (listingId) => !dismissedIdSet.has(listingId)
  );

  return {
    shortlistedIds,
    dismissedIds,
    activeListingFilters: sanitizeListingFilters(
      input?.activeListingFilters ?? DEFAULT_MOCK_UI_STATE.activeListingFilters
    ),
    activeShortlistFilter:
      sanitizeFilterValue(input?.activeShortlistFilter) ?? SHORTLIST_FILTER_ALL,
    contactStatusByAgentId: sanitizeContactStatusMap(
      input?.contactStatusByAgentId ?? DEFAULT_MOCK_UI_STATE.contactStatusByAgentId
    ),
    copiedValue:
      typeof input?.copiedValue === "string"
        ? input.copiedValue
        : input?.copiedValue === null
          ? null
          : DEFAULT_MOCK_UI_STATE.copiedValue,
    lastVisitedRoute:
      typeof input?.lastVisitedRoute === "string"
        ? input.lastVisitedRoute
        : input?.lastVisitedRoute === null
          ? null
          : DEFAULT_MOCK_UI_STATE.lastVisitedRoute,
    uiFlags: sanitizeUiFlags(input?.uiFlags ?? DEFAULT_MOCK_UI_STATE.uiFlags)
  };
}

export function createMockUiState(seed: MockUiStateSeed = {}): MockUiState {
  return sanitizeMockUiState({
    shortlistedIds: seed.shortlistedIds ?? DEFAULT_MOCK_UI_STATE.shortlistedIds,
    dismissedIds: seed.dismissedIds ?? DEFAULT_MOCK_UI_STATE.dismissedIds,
    activeListingFilters: {
      ...DEFAULT_MOCK_UI_STATE.activeListingFilters,
      ...seed.activeListingFilters
    },
    activeShortlistFilter:
      seed.activeShortlistFilter ?? DEFAULT_MOCK_UI_STATE.activeShortlistFilter,
    contactStatusByAgentId: {
      ...DEFAULT_MOCK_UI_STATE.contactStatusByAgentId,
      ...seed.contactStatusByAgentId
    },
    copiedValue:
      seed.copiedValue !== undefined
        ? seed.copiedValue
        : DEFAULT_MOCK_UI_STATE.copiedValue,
    lastVisitedRoute:
      seed.lastVisitedRoute !== undefined
        ? seed.lastVisitedRoute
        : DEFAULT_MOCK_UI_STATE.lastVisitedRoute,
    uiFlags: {
      ...DEFAULT_MOCK_UI_STATE.uiFlags,
      ...seed.uiFlags
    }
  });
}

export function mergeMockUiState(currentState: MockUiState, patch: MockUiStateSeed): MockUiState {
  return sanitizeMockUiState({
    shortlistedIds: patch.shortlistedIds ?? currentState.shortlistedIds,
    dismissedIds: patch.dismissedIds ?? currentState.dismissedIds,
    activeListingFilters:
      patch.activeListingFilters === undefined
        ? currentState.activeListingFilters
        : {
            ...currentState.activeListingFilters,
            ...patch.activeListingFilters
          },
    activeShortlistFilter:
      patch.activeShortlistFilter ?? currentState.activeShortlistFilter,
    contactStatusByAgentId:
      patch.contactStatusByAgentId === undefined
        ? currentState.contactStatusByAgentId
        : {
            ...currentState.contactStatusByAgentId,
            ...patch.contactStatusByAgentId
          },
    copiedValue:
      patch.copiedValue !== undefined ? patch.copiedValue : currentState.copiedValue,
    lastVisitedRoute:
      patch.lastVisitedRoute !== undefined
        ? patch.lastVisitedRoute
        : currentState.lastVisitedRoute,
    uiFlags:
      patch.uiFlags === undefined
        ? currentState.uiFlags
        : {
            ...currentState.uiFlags,
            ...patch.uiFlags
          }
  });
}

export function isMockDataMode() {
  return process.env.NEXT_PUBLIC_DATA_MODE !== "live";
}

export function readPersistedMockUiState() {
  if (!isBrowserStorageAvailable()) {
    return createMockUiState();
  }

  try {
    const persistedValue = window.localStorage.getItem(MOCK_UI_STATE_STORAGE_KEY);

    if (!persistedValue) {
      return createMockUiState();
    }

    return sanitizeMockUiState(JSON.parse(persistedValue));
  } catch {
    return createMockUiState();
  }
}

export function writePersistedMockUiState(state: MockUiState) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.setItem(
    MOCK_UI_STATE_STORAGE_KEY,
    JSON.stringify(sanitizeMockUiState(state))
  );
}

export function clearPersistedMockUiState() {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(MOCK_UI_STATE_STORAGE_KEY);
}

export function notifyMockUiStateChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(MOCK_UI_STATE_CHANGE_EVENT));
}

export function resetPersistedMockUiState() {
  const nextState = createMockUiState();

  writePersistedMockUiState(nextState);
  notifyMockUiStateChanged();

  return nextState;
}

export function seedPersistedMockUiState(seed: MockUiStateSeed = {}) {
  const nextState = createMockUiState(seed);

  writePersistedMockUiState(nextState);
  notifyMockUiStateChanged();

  return nextState;
}
