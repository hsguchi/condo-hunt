# UI Interactivity Task Board

## Purpose

This document turns the current UI interactivity plan into a concrete execution board for four parallel agents working in the existing Next.js app.

Scope for this pass:
- Make the current screens meaningfully interactive.
- Keep Airtable, Firecrawl, and Netlify Functions out of the critical path.
- Build a non-production Playwright loop for rapid UI iteration.

Out of scope for this pass:
- Real backend integration
- Production Netlify deploy as part of daily test loops
- Figma fidelity polish beyond what is required to support interaction states

## Current Baseline

Current behavior already present:
- Login page at `app/page.tsx`
- Protected route enforcement via `middleware.ts`
- Bottom navigation in `components/app-shell.tsx`
- Navigation between dashboard, listings, shortlist, contacts, and property detail
- Mock data in `lib/sample-data.ts`

Current gaps:
- Most buttons are visual only.
- Filters do not change UI state.
- Save, reject, shortlist, copy, and bulk-contact actions are not implemented.
- Dashboard metrics are not derived from shared state.
- No first-class Playwright configuration exists in source control yet.

## Shared Rules For All Agents

- Build against mock data first.
- Do not block on Airtable, Firecrawl, or Netlify Functions.
- Keep route protection behavior intact.
- Prefer server page files with client leaf components for interactivity.
- Use accessible labels and roles so Playwright can target UI semantically.
- Use `Link` for internal navigation and reserve `<a>` for real external actions like `tel:` and `https://wa.me/...`.
- Keep shared UI state contract centralized. No page may invent a parallel store shape.

## Shared State Contract

Agent 4 owns the first version of the contract. Other agents build against it.

Planned shared state keys:
- `shortlistedIds: string[]`
- `dismissedIds: string[]`
- `activeListingFilters: { budget?: string; tenure?: string; bedrooms?: string; district?: string }`
- `activeShortlistFilter: string`
- `contactStatusByAgentId: Record<string, "pending" | "contacted" | "scheduled">`
- `copiedValue: string | null`
- `lastVisitedRoute: string | null`
- `uiFlags: { filterSheetOpen: boolean; contactAllSheetOpen: boolean }`

Persistence target:
- `localStorage` in mock mode

Planned new shared files:
- `components/providers/mock-ui-state-provider.tsx`
- `components/providers/mock-ui-state-context.tsx`
- `lib/mock-ui-state.ts`
- `lib/mock-selectors.ts`

## Branching And Merge Order

Recommended branch names:
- `codex/ui-shell-playwright`
- `codex/ui-auth-entry`
- `codex/ui-listings-detail`
- `codex/ui-shortlist-contacts`

Recommended merge order:
1. Agent 4 lands shared state contract and Playwright harness.
2. Agent 1 lands auth and entry flow on top of the shared contract.
3. Agent 2 and Agent 3 land page interactivity in parallel.
4. Agent 4 finishes dashboard wiring, integration cleanup, and full-suite validation.

## Agent 1

### Ownership

Area:
- Auth and entry flow

Primary files:
- `app/page.tsx`
- `components/login-form.tsx`

Secondary files if needed:
- `components/app-shell.tsx`
- `app/globals.css`

### Deliverables

- Convert the login experience from static form behavior into a resilient entry flow.
- Preserve intended destination when users are redirected from a protected route to `/`.
- Add clear loading, success, and invalid-credentials states.
- Replace dead or misleading login UI affordances.
- Ensure mobile-safe layout remains stable when validation errors appear.

### Planned Work

- Add client-side submit pending state to the login form.
- Add route intent preservation using query param or storage.
- Keep the existing cookie-based mock session model unless Agent 4 proposes a better shared mock contract.
- Decide whether `Create account` and `Forgot password?` become disabled explanatory actions or route to placeholder informational surfaces.
- Add explicit aria labels and error messaging for testability.

### Acceptance Tests

- Visiting `/dashboard` without auth redirects to `/`.
- After valid login from a redirected state, the app returns to the originally requested protected page.
- Invalid login does not create a session cookie.
- Valid login creates the mock session and lands in-app.
- Login layout does not shift enough to hide the primary action on mobile.

### Hand-off Notes To Other Agents

- Expose any route-intent helper in a shared utility if other pages need it.
- Do not change the protected route list in `middleware.ts` without notifying Agent 4.

## Agent 2

### Ownership

Area:
- Listings discovery flow and property detail flow

Primary files:
- `app/listings/page.tsx`
- `app/property/[id]/page.tsx`

Secondary files if needed:
- `components/icon.tsx`
- `app/globals.css`
- `lib/sample-data.ts`
- `lib/mock-selectors.ts`

### Deliverables

- Turn the listings page into an actual interactive browsing screen.
- Make property detail actions functional and stateful.
- Ensure saved or dismissed state is reflected immediately across screens.

### Planned Work

- Replace the current single static listing card behavior with a stateful card flow driven by mock data.
- Implement filter interaction on listings, even if the first pass is a simple pill row or bottom sheet.
- Convert the current save and reject FABs into real actions.
- Fix CTA semantics on the listings screen so the primary action matches the action it performs.
- Wire property detail save, back, call, WhatsApp, and copy actions.
- Add copy feedback via toast or inline state.
- Ensure property detail can derive the current listing from shared mock state and not only the static dataset.

### Acceptance Tests

- Listing save action adds the listing to shortlist state.
- Reject action removes or hides the listing from the visible queue.
- Filter changes alter visible listings predictably.
- Entering a property detail page from listings shows the correct record.
- Saving or unsaving from detail updates shortlist state immediately.
- Copy action shows feedback and can be asserted in Playwright.
- Call and WhatsApp links have the expected `href` values.

### Hand-off Notes To Other Agents

- Agent 3 depends on shortlist state semantics staying stable.
- Agent 4 depends on listing-state selectors for dashboard metrics.

## Agent 3

### Ownership

Area:
- Shortlist and Contact Hub

Primary files:
- `app/shortlist/page.tsx`
- `app/contacts/page.tsx`

Secondary files if needed:
- `lib/sample-data.ts`
- `lib/mock-selectors.ts`
- `app/globals.css`

### Deliverables

- Turn shortlist into a real working collection view.
- Turn contacts into a real action hub with status and quick actions.
- Make contact-related state reflect shortlist changes.

### Planned Work

- Drive shortlist cards from shared shortlist state instead of the hardcoded array.
- Implement shortlist filter chips.
- Make card close/remove behavior functional.
- Make tapping a shortlist card navigate to the correct property detail page.
- Implement `Contact All Agents` as a real action surface, likely a bottom sheet or confirmation panel.
- Drive contacts from sample agents plus derived listing relationships.
- Implement summary-chip filtering for pending, contacted, and scheduled views.
- Add WhatsApp, call, copy, and status update actions per contact.
- Ensure the back action in contacts remains compatible with bottom-nav navigation.

### Acceptance Tests

- Removing a property from shortlist updates the shortlist count and visible cards.
- Shortlist cards navigate to the correct detail page.
- Contact summary chips filter the list correctly.
- WhatsApp and call links are valid and derived from agent data.
- Copying a phone number provides visible feedback.
- Marking an agent as contacted or scheduled updates counts immediately.
- Bulk contact surface opens and closes without breaking navigation.

### Hand-off Notes To Other Agents

- Coordinate agent-status enum values with Agent 4 before merging.
- Keep contacts derivation deterministic so Playwright assertions remain stable.

## Agent 4

### Ownership

Area:
- Shared shell, shared state contract, dashboard wiring, and test harness

Primary files:
- `components/app-shell.tsx`
- `app/dashboard/page.tsx`
- `app/globals.css`

Planned new files:
- `components/providers/mock-ui-state-provider.tsx`
- `components/providers/mock-ui-state-context.tsx`
- `lib/mock-ui-state.ts`
- `lib/mock-selectors.ts`
- `playwright.config.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/navigation.spec.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/e2e/listings.spec.ts`
- `tests/e2e/property-detail.spec.ts`
- `tests/e2e/shortlist.spec.ts`
- `tests/e2e/contacts.spec.ts`
- `tests/e2e/global.setup.ts`

Also expected:
- `package.json` script updates
- `.env.example` updates for mock mode if needed

### Deliverables

- Establish the only shared client-side mock state model used by all pages.
- Keep bottom navigation behavior stable while page interactivity increases.
- Replace static dashboard numbers with derived metrics from shared state.
- Add a local-first Playwright loop that does not require production Netlify deploys.

### Planned Work

- Create and document the shared mock-state provider.
- Add selectors for derived values used by dashboard and contacts.
- Wire dashboard cards, links, and action buttons to meaningful stateful behavior.
- Add Playwright config with a local `webServer` against `npm run dev`.
- Add auth setup and storage-state reuse for authenticated tests.
- Add a second local build-parity command for `next build && next start`.
- Add utilities for clearing and reseeding local mock state before tests.

### Acceptance Tests

- Bottom nav remains fixed and usable on all interactive screens.
- Dashboard metrics update after shortlist and contact-state changes.
- Local Playwright suite runs fully against localhost.
- Authenticated tests reuse a saved storage state.
- Unauthenticated redirect tests still run independently.
- Build-parity Playwright loop passes without Netlify production.

### Hand-off Notes To Other Agents

- Publish the mock-state contract before other agents start implementation.
- Provide one short usage example so other agents do not guess selector names.
- Own final conflict resolution if multiple agents touch `app/globals.css`.

## File-By-File Ownership Map

Single-owner default:
- Agent 1: `app/page.tsx`
- Agent 1: `components/login-form.tsx`
- Agent 2: `app/listings/page.tsx`
- Agent 2: `app/property/[id]/page.tsx`
- Agent 3: `app/shortlist/page.tsx`
- Agent 3: `app/contacts/page.tsx`
- Agent 4: `app/dashboard/page.tsx`
- Agent 4: `components/app-shell.tsx`
- Agent 4: shared mock-state files
- Agent 4: Playwright config, setup, and test specs

Shared-touch files requiring coordination:
- `app/globals.css`
- `lib/sample-data.ts`
- `package.json`
- `.env.example`

Coordination rule:
- If more than one agent needs a shared-touch file, Agent 4 resolves the final merge.

## Non-Production Playwright Environment Plan

### Goal

Run fast UI interactivity loops without touching Netlify production.

### Environment Strategy

Primary loop:
- Run locally against `next dev`

Secondary loop:
- Run locally against `next build && next start`

Optional parity loop after major milestones:
- Run locally against `netlify dev` or a draft deploy

Not part of the daily loop:
- Netlify production deploy

### Required Setup Tasks

1. Add Playwright as a first-class dev dependency if it is not already declared in `package.json`.
2. Add scripts:
   - `test:e2e`
   - `test:e2e:ui`
   - `test:e2e:headed`
   - `test:e2e:prodlike`
3. Add `playwright.config.ts` with:
   - `baseURL` on localhost
   - `webServer` for `npm run dev`
   - `reuseExistingServer: true`
   - desktop and mobile browser projects if test time remains reasonable
4. Add global setup to log in once and save storage state.
5. Add test helper utilities to clear and seed local mock state before each spec.
6. Add mock-mode env configuration:
   - `NEXT_PUBLIC_DATA_MODE=mock`
   - optional `NEXT_PUBLIC_E2E=true`

### Test Data Strategy

- Use only local mock state and `lib/sample-data.ts` for UI interactivity tests.
- Do not depend on Airtable keys, Firecrawl keys, or Netlify env vars.
- Seed deterministic listings, shortlist entries, and contact statuses.
- Keep phone numbers and listing IDs stable for reliable assertions.

### Spec Matrix

Auth:
- redirect unauthenticated users from protected routes
- reject invalid credentials
- allow valid login and persist mock session

Navigation:
- bottom nav switches screens without breaking layout
- returning from detail and contacts preserves expected behavior

Dashboard:
- metrics reflect current shortlist and contact statuses
- CTA links reach the correct pages

Listings:
- filters change visible results
- save and reject mutate visible state

Property detail:
- page loads from a listing route
- save, copy, call, and WhatsApp actions work correctly

Shortlist:
- list reflects shared shortlist state
- remove action and detail navigation both work

Contacts:
- summary filters work
- WhatsApp, call, copy, and status actions work
- bulk-contact surface opens correctly

### Daily Developer Loop

1. Start local app in mock mode.
2. Run Playwright against `next dev`.
3. Fix interactivity issues until green.
4. Run build-parity Playwright loop locally.
5. Only after both are green, consider a draft Netlify verification.

### Release Candidate Gate

Required before draft deploy:
- local dev loop green
- local build-parity loop green
- no known regressions in auth redirects, bottom nav, shortlist sync, or contact actions

Required before production deploy:
- successful draft verification
- manual spot check on mobile viewport

## Risks And Watchouts

- `app/globals.css` is likely to become the highest-conflict file.
- The current pages mix static markup and route logic; interactivity should move into client components without over-clientifying whole pages.
- If mock-state persistence is inconsistent, Playwright will become flaky quickly.
- The current login cookie behavior is simple and test-friendly; replacing it with something more complex should be avoided in this phase.

## Done Definition

This phase is complete when:
- Every page has at least one meaningful interactive loop, not just navigation.
- Shared mock state stays consistent across listings, detail, shortlist, contacts, and dashboard.
- Playwright runs locally without production Netlify deploys.
- The repo has a repeatable non-production validation path for UI interactivity work.
