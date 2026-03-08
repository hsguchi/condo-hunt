# Parallel Agent Launch Guide

## Short Answer

Yes. If you want to run 4 coding agents against this repo without stepping on each other, use separate git worktrees.

Do not run 4 agents inside the same checkout.

## Important Repo Note

When I checked the repo, Git reported a `safe.directory` ownership warning for `D:/SZ Github/condo-hunt`.

Run this once before creating worktrees:

```powershell
git config --global --add safe.directory 'D:/SZ Github/condo-hunt'
```

## Recommended Launch Strategy

If your goal is minimum clashes, do not start all 4 agents coding at exactly the same moment.

Use this sequence instead:

1. Create 4 worktrees.
2. Start Agent 4 first to establish the shared UI state contract and Playwright foundation.
3. Merge or cherry-pick Agent 4's foundation into `main`.
4. Create fresh branches for Agents 1, 2, and 3 from that updated `main`.
5. Run Agents 1, 2, and 3 in parallel.
6. Finish with Agent 4 as integrator on a fresh branch if needed.

This is the cleanest way to avoid both file conflicts and API-contract drift.

## Worktree Commands

Run these from `D:/SZ Github/condo-hunt`.

Phase 1, foundation worktree:

```powershell
git worktree add -b codex/ui-shell-playwright ..\condo-hunt-agent-4 main
```

After Agent 4 foundation is merged into `main`, create the remaining parallel worktrees:

```powershell
git worktree add -b codex/ui-auth-entry ..\condo-hunt-agent-1 main
git worktree add -b codex/ui-listings-detail ..\condo-hunt-agent-2 main
git worktree add -b codex/ui-shortlist-contacts ..\condo-hunt-agent-3 main
```

If you insist on creating all four immediately, you can, but Agent 1 through Agent 3 should wait to code until Agent 4's shared contract is merged.

## No-Clash Rules

Use these rules strictly.

Agent 1 may edit only:
- `app/page.tsx`
- `components/login-form.tsx`
- new files under `components/auth/`
- new files under `lib/auth/`

Agent 2 may edit only:
- `app/listings/page.tsx`
- `app/property/[id]/page.tsx`
- new files under `components/listings/`
- new files under `components/property/`

Agent 3 may edit only:
- `app/shortlist/page.tsx`
- `app/contacts/page.tsx`
- new files under `components/shortlist/`
- new files under `components/contacts/`

Agent 4 may edit only:
- `components/app-shell.tsx`
- `app/dashboard/page.tsx`
- `app/globals.css`
- `package.json`
- `.env.example`
- `playwright.config.ts`
- `tests/e2e/**`
- `components/providers/**`
- `lib/mock-ui-state.ts`
- `lib/mock-selectors.ts`
- `handoff/SHARED_UI_STATE_CONTRACT.md`

Off-limits to Agents 1 to 3:
- `app/globals.css`
- `components/app-shell.tsx`
- `app/dashboard/page.tsx`
- `package.json`
- `.env.example`
- `components/providers/**`
- `lib/mock-ui-state.ts`
- `lib/mock-selectors.ts`

If any agent needs one of those files changed, that agent should note the requirement in its final message instead of editing it.

## Shared Contract Assumption

Agents 1 to 3 should assume Agent 4 will expose a hook with this general shape:

```ts
useMockUiState()
```

Expected read state:
- `shortlistedIds`
- `dismissedIds`
- `activeListingFilters`
- `activeShortlistFilter`
- `contactStatusByAgentId`
- `uiFlags`

Expected actions:
- `toggleShortlist(id)`
- `dismissListing(id)`
- `setListingFilters(partial)`
- `setShortlistFilter(value)`
- `setContactStatus(agentId, status)`
- `openUiFlag(name)`
- `closeUiFlag(name)`
- `showCopiedFeedback(value)`
- `clearCopiedFeedback()`

If Agent 4 chooses slightly different names, Agent 4 should document them in `handoff/SHARED_UI_STATE_CONTRACT.md`.

## Copy-Paste Prompt: Agent 4

```text
You are Agent 4 working in the Condo Hunt repo.

Workspace:
- Use your own git worktree and branch only.
- Do not edit files owned by Agents 1, 2, or 3.

Read these first:
- handoff/SESSION_HANDOFF.md
- architecture/property-hunter-playbook.md
- handoff/UI_INTERACTIVITY_TASK_BOARD.md

Your mission:
Build the shared UI foundation and test harness so the other agents can work without clashes.

You own these files:
- components/app-shell.tsx
- app/dashboard/page.tsx
- app/globals.css
- package.json
- .env.example
- playwright.config.ts
- tests/e2e/**
- components/providers/**
- lib/mock-ui-state.ts
- lib/mock-selectors.ts
- handoff/SHARED_UI_STATE_CONTRACT.md

What to do:
1. Create the shared mock UI state provider and hook.
2. Persist mock UI state in localStorage for mock mode.
3. Document the exact state shape and hook API in handoff/SHARED_UI_STATE_CONTRACT.md.
4. Keep the bottom nav stable while interactivity grows.
5. Make dashboard metrics derive from shared state rather than static values.
6. Add a local-first Playwright harness that runs against localhost and does not require Netlify production.
7. Add test utilities for resetting and seeding mock state.

Constraints:
- Do not edit app/page.tsx, components/login-form.tsx, app/listings/page.tsx, app/property/[id]/page.tsx, app/shortlist/page.tsx, or app/contacts/page.tsx.
- Keep the current auth middleware behavior intact.
- Prefer accessible selectors over brittle test ids.

Definition of done:
- Shared state API exists and is documented.
- Dashboard reads derived state.
- Playwright can run locally against next dev.
- There is a clear path for Agents 1 to 3 to consume the state hook without editing shared files.

In your final message include:
- the exact exported hook and action names
- any files that Agents 1 to 3 must import
- any styling constraints they should know about
```

## Copy-Paste Prompt: Agent 1

```text
You are Agent 1 working in the Condo Hunt repo.

Workspace:
- Use your own git worktree and branch only.
- Do not edit files owned by Agents 2, 3, or 4.

Read these first:
- handoff/SESSION_HANDOFF.md
- architecture/property-hunter-playbook.md
- handoff/UI_INTERACTIVITY_TASK_BOARD.md
- handoff/SHARED_UI_STATE_CONTRACT.md if it exists

Your mission:
Own auth and entry-flow interactivity without touching shared foundation files.

You may edit only:
- app/page.tsx
- components/login-form.tsx
- new files under components/auth/
- new files under lib/auth/

Do not edit:
- app/globals.css
- components/app-shell.tsx
- app/dashboard/page.tsx
- package.json
- .env.example
- components/providers/**
- lib/mock-ui-state.ts
- lib/mock-selectors.ts

What to do:
1. Make the login flow resilient and stateful.
2. Preserve intended protected-route destination after login.
3. Add pending, success, and invalid-credentials behavior.
4. Replace or neutralize dead affordances like non-working account-recovery links.
5. Keep the mobile layout stable when errors appear.

Constraints:
- Do not change middleware route protection rules.
- Keep the existing cookie-based mock session unless there is a very strong reason not to.
- If you need shared-state changes, note them in your final message instead of editing Agent 4-owned files.

Definition of done:
- Protected-route redirect flow returns users to the originally requested page after valid login.
- Invalid login does not create a valid session.
- UI states are accessible and testable.

In your final message include:
- what route-intent mechanism you used
- any follow-up requests for Agent 4 integration
```

## Copy-Paste Prompt: Agent 2

```text
You are Agent 2 working in the Condo Hunt repo.

Workspace:
- Use your own git worktree and branch only.
- Do not edit files owned by Agents 1, 3, or 4.

Read these first:
- handoff/SESSION_HANDOFF.md
- architecture/property-hunter-playbook.md
- handoff/UI_INTERACTIVITY_TASK_BOARD.md
- handoff/SHARED_UI_STATE_CONTRACT.md

Your mission:
Own listings-page and property-detail interactivity.

You may edit only:
- app/listings/page.tsx
- app/property/[id]/page.tsx
- new files under components/listings/
- new files under components/property/

Do not edit:
- app/globals.css
- components/app-shell.tsx
- app/dashboard/page.tsx
- package.json
- .env.example
- components/providers/**
- lib/mock-ui-state.ts
- lib/mock-selectors.ts
- app/page.tsx
- components/login-form.tsx
- app/shortlist/page.tsx
- app/contacts/page.tsx

What to do:
1. Turn listings into a real interactive browsing screen.
2. Implement working save and reject behavior.
3. Add usable filter interactions.
4. Fix CTA semantics so labels match actions.
5. Make property-detail actions work: back, save, call, WhatsApp, copy.
6. Use Agent 4's shared state hook rather than inventing local global state.

Constraints:
- Keep changes isolated to your owned files and new subcomponents.
- Do not modify shared CSS files; work with existing classes, inline styles, or local component structure.
- If you need a new shared action from Agent 4, request it in your final message.

Definition of done:
- Listings actions change visible state predictably.
- Property detail reflects and updates shared shortlist state.
- Copy, call, and WhatsApp behavior is testable.

In your final message include:
- any shared-hook actions you consumed
- any small integration requests for Agent 4 or Agent 3
```

## Copy-Paste Prompt: Agent 3

```text
You are Agent 3 working in the Condo Hunt repo.

Workspace:
- Use your own git worktree and branch only.
- Do not edit files owned by Agents 1, 2, or 4.

Read these first:
- handoff/SESSION_HANDOFF.md
- architecture/property-hunter-playbook.md
- handoff/UI_INTERACTIVITY_TASK_BOARD.md
- handoff/SHARED_UI_STATE_CONTRACT.md

Your mission:
Own shortlist and Contact Hub interactivity.

You may edit only:
- app/shortlist/page.tsx
- app/contacts/page.tsx
- new files under components/shortlist/
- new files under components/contacts/

Do not edit:
- app/globals.css
- components/app-shell.tsx
- app/dashboard/page.tsx
- package.json
- .env.example
- components/providers/**
- lib/mock-ui-state.ts
- lib/mock-selectors.ts
- app/page.tsx
- components/login-form.tsx
- app/listings/page.tsx
- app/property/[id]/page.tsx

What to do:
1. Drive shortlist from shared shortlist state instead of a hardcoded array.
2. Make shortlist filters and remove behavior functional.
3. Make shortlist cards navigate to the correct property detail page.
4. Turn Contact Hub into a working action center.
5. Add per-contact WhatsApp, call, copy, and status actions.
6. Add summary-chip filtering and a real bulk-contact surface.
7. Use Agent 4's shared state hook rather than inventing local global state.

Constraints:
- Keep contact derivation deterministic for Playwright.
- Do not modify shared CSS files; work with existing classes, inline styles, or local component structure.
- If you need a new shared action from Agent 4, request it in your final message.

Definition of done:
- Shortlist content reflects shared state.
- Contact counts and filters update predictably.
- Quick actions are real and testable.

In your final message include:
- any shared-hook actions you consumed
- any integration requests for Agent 4
```
