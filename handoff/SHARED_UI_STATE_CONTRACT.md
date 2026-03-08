# Shared UI State Contract

## Status

Agent 4 owns the shared mock UI state foundation.

The provider is already mounted in `components/app-shell.tsx`, so Agents 1 to 3 should not add another provider. Client components can import the hook and selectors directly.
Dashboard metrics, the bottom-nav contacts dot, and the last-visited-route behavior are already wired against this shared state.

## Import Paths

- Hook: `@/components/providers/mock-ui-state-context`
- Provider implementation reference: `@/components/providers/mock-ui-state-provider`
- State types and persistence helpers: `@/lib/mock-ui-state`
- Derived selectors: `@/lib/mock-selectors`

## State Shape

```ts
type ContactStatus = "pending" | "contacted" | "scheduled";

interface MockListingFilters {
  budget?: string;
  tenure?: string;
  bedrooms?: string;
  district?: string;
}

interface MockUiFlags {
  filterSheetOpen: boolean;
  contactAllSheetOpen: boolean;
}

interface MockUiState {
  shortlistedIds: string[];
  dismissedIds: string[];
  activeListingFilters: MockListingFilters;
  activeShortlistFilter: string;
  contactStatusByAgentId: Record<string, ContactStatus>;
  copiedValue: string | null;
  lastVisitedRoute: string | null;
  uiFlags: MockUiFlags;
}
```

## Persistence

- Mock-mode persistence key: `condo-hunt.mock-ui-state`
- Same-tab sync event: `condo-hunt:mock-ui-state-change`
- Persistence is enabled when `NEXT_PUBLIC_DATA_MODE !== "live"`
- Default state is created from `lib/sample-data.ts`

## Exported Hooks

- `useMockUiState()`
- `useMockUiStateActions()`

`useMockUiState()` returns:

```ts
{
  isHydrated: boolean;
  state: MockUiState;
  actions: MockUiStateActions;
}
```

## Exported Actions

```ts
resetState()
seedState(seed?)
setListingShortlisted(listingId, isShortlisted)
dismissListing(listingId)
restoreListing(listingId)
setListingFilter(key, value)
replaceListingFilters(filters)
clearListingFilters()
setShortlistFilter(value)
setContactStatus(agentId, status)
setCopiedValue(value)
setLastVisitedRoute(route)
setUiFlag(flag, value)
```

## Persistence Helpers

Available from `@/lib/mock-ui-state`:

- `createMockUiState(seed?)`
- `mergeMockUiState(currentState, patch)`
- `readPersistedMockUiState()`
- `writePersistedMockUiState(state)`
- `clearPersistedMockUiState()`
- `resetPersistedMockUiState()`
- `seedPersistedMockUiState(seed?)`
- `notifyMockUiStateChanged()`

## Recommended Selectors

Agents should derive UI from selectors instead of re-implementing state math.

- Shared helpers: `getListingById`, `getTrackedListings`, `formatCompactCurrency`, `formatCompactNumber`
- Listings/detail: `getVisibleListings`, `getTrackedListingById`, `isListingShortlisted`, `isListingDismissed`, `getAgentIdForListing`
- Shortlist: `getShortlistedListings`, `getFilteredShortlistedListings`
- Contacts: `getDerivedContacts`, `getContactStatusCounts`, `getPendingContactAgents`
- Dashboard: `getDashboardSummary`, `getTopValueDeals`, `getDashboardScatterPoints`

`getPendingContactAgents` returns only agents still in the `pending` status. `scheduled` contacts are treated as already in motion, not pending.

## Usage Example

```tsx
"use client";

import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import { getFilteredShortlistedListings } from "@/lib/mock-selectors";

export function ExampleClientComponent() {
  const { state, actions } = useMockUiState();
  const listings = getFilteredShortlistedListings(state);

  return (
    <>
      <button onClick={() => actions.setListingShortlisted("2", true)}>Save</button>
      <button onClick={() => actions.dismissListing("2")}>Dismiss</button>
      <div>{listings.length}</div>
    </>
  );
}
```

## Test Utilities

Playwright helpers live in `tests/e2e/utils/mock-state.ts`.

Available helpers:

- `buildMockUiState(seed?)`
- `resetMockUiState(page)`
- `seedMockUiState(page, seed)`
- `clearMockUiState(page)`

These utilities seed `localStorage` and dispatch the shared state change event so pages update without a full auth flow reset.

## Coordination Notes

- Agent 1 can read `state.lastVisitedRoute` if the auth flow wants to preserve or restore destination.
- Agent 2 should use `setListingShortlisted`, `dismissListing`, and listing selectors instead of introducing per-page state.
- Agent 3 should use `setShortlistFilter`, `setContactStatus`, and contact selectors so counts stay in sync with the dashboard.
- `dismissedIds` and `shortlistedIds` are mutually exclusive. Dismissed listings are filtered out of derived selectors.

## Styling Constraints

- Do not wrap protected pages in another shell. `components/app-shell.tsx` already provides the provider, `phone-shell`, `phone-content`, and fixed bottom-nav frame.
- Keep page-level content inside the existing `.screen` flow so the shell's `padding-bottom` continues to reserve space for the fixed nav.
- Any page-owned sticky or fixed CTA should stay above the nav by using an offset of about `88px` from the bottom, matching the existing `.contact-all` pattern.
- Prefer existing shared classes like `.hero-card`, `.stats-tile`, `.summary-chip`, `.primary-cta`, `.pill-button`, and `.list-action` instead of introducing competing shell-level variants in shared files.
