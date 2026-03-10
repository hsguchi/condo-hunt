# Property Hunter Backend Playbook

Owner: Adrian Lo
Project: Condo Hunt
Execution agent: Codex Desktop
Deployment target: Netlify
Primary browser executor: Local Playwright worker
Deferred batch orchestrator: Windmill

## Goal

Build the backend as two separate but compatible layers for MVP:

- an online retrieval layer for the app
- a local browser-use execution layer for authenticated PropertyGuru workflows

The frontend is already built around mock data, shared selectors, and screen-specific behaviors. Backend work should now mirror that contract closely enough that we can switch from mock mode to live mode with minimal UI rewrite.

## Current MVP Direction

The current MVP is no longer "autonomous ETL first."

It is now:

- Airtable as the control plane for schedules, prompts, and criteria profiles
- a local Playwright worker as the executor
- your logged-in Chrome browser session as the authenticated runtime
- Netlify as the app-facing retrieval and mutation layer

This means the MVP browser worker should:

- read due jobs from Airtable
- attach to your local authenticated Chrome session
- navigate PropertyGuru on demand
- extract a bounded number of matching listings
- write normalized results and run status back to Airtable
- reuse one browser process per run instead of fanning out one-off probe sessions

Windmill and Firecrawl are still useful later for public-page discovery or post-processing, but they are not the critical path for the current MVP.

## Guiding Principle

Do not design the backend around Airtable rows first.

Design it around the current frontend contract:

- `types/models.ts`
- `lib/sample-data.ts`
- `lib/mock-selectors.ts`
- `lib/mock-ui-state.ts`

The UI already assumes a specific listing shape, agent shape, and a small set of user decision states. The backend should return those same primitives instead of inventing a parallel API vocabulary.

## System Architecture

### Online retrieval layer

Runtime:

- Next.js app on Netlify
- Netlify Functions as the app-facing API

Responsibilities:

- serve normalized listing and agent data to the UI
- serve durable user decision state
- accept app mutations like shortlist, dismiss, and contact status changes
- never depend on live Firecrawl calls during normal page loads

### Browser-use execution layer

Runtime:

- local Playwright worker attached to a logged-in Chrome session

Responsibilities:

- poll Airtable for due browser jobs
- interpret bounded extraction tasks such as "extract 10 matches"
- attach to the local authenticated browser session
- navigate PropertyGuru search or listing pages
- extract normalized listing cards and detail fields
- persist extracted records, run logs, and failures back to Airtable
- skip already-known `source_url` values before opening detail pages
- stop after explicit limits like `10` or `50` matches

### Deferred offline ETL layer

Runtime:

- Windmill flows and scripts

Responsibilities:

- optional later-stage public-page discovery
- optional later-stage refresh or post-processing
- enrichment that does not require the local authenticated browser

### Shared contract

Both layers must use the same domain model and normalization rules.

The app should read curated Airtable-backed data. It should not talk to Firecrawl directly.

## Why Browser-Use Fits This MVP

Browser-use is the better MVP shape because:

- the critical field, agent phone number, is login-gated
- the authenticated session exists in your real browser, not in Netlify
- prompt-driven tasks such as "extract 10 matches" map naturally to job execution
- Airtable can act as a human-editable control plane for schedules and prompts
- a local worker avoids the mismatch between remote scraping services and the logged-in browser state

## Why Windmill Still Matters Later

Windmill is a good fit for this ETL layer because it gives us:

- scheduled scripts and flows
- retries and error handlers at the workflow level
- secure variables and secrets
- resource-based external system configuration

That still matches later public-page ETL better than trying to run the scrape pipeline inside Netlify request handlers, but it is no longer the first implementation target.

## Browser-Use Job Model

The MVP should not accept unconstrained free-form prompts as the only interface.

Instead, Airtable jobs should be structured and optionally include a prompt for operator context.

Supported job types for MVP:

- `extract_matches`
- `refresh_listing`
- `navigate_and_capture`

The first implementation target should be `extract_matches`.

Minimum job inputs:

- `entry_url`
- `limit`
- `criteria_profile`
- `max_pages`
- `schedule_kind`
- `next_run_at`

The worker should interpret `extract_matches` deterministically:

- open the configured PropertyGuru search URL
- ensure the session is authenticated and usable
- inspect listing cards in order
- evaluate cards against the criteria profile
- collect up to the requested limit
- write results and run metadata to Airtable

Do not rely on a generic autonomous browser agent for MVP. Use a bounded action set and a small number of supported job contracts.

## Search Criteria And On-Site Filters

The current MVP should use strict, criteria-first filtering, but it should push as much narrowing as possible into PropertyGuru's own search URLs before any detail-page traversal.

### Source restrictions

- source site: `propertyguru.com.sg` only
- listing type: `For Sale`
- property type: `Condominium` or `Apartment`
- no broad full-domain crawl
- prefer pre-filtered search entry URLs over open-ended discovery

### Price and size

- price: `<= S$1,500,000`
- bedrooms: `>= 2`
- floor area: `>= 900 sqft`

### Location

Primary district preferences:

- District 5
- District 10
- District 21

Representative focus areas:

- Buona Vista
- Clementi
- Pasir Panjang
- Bukit Timah
- Holland
- Upper Bukit Timah
- Beauty World

### Transport and commute

- MRT proximity: within `500 m` or `<= 5 min walk`
- preferred stations include `Buona Vista`, `Dover`, and `Clementi`
- commute target: `< 15 minutes drive` to NUS Institute of Policy Studies

### Additional preference filters

- tenure: `Freehold` or any leasehold `>= 99 years`
- completion status: `Completed`
- floor level: `Mid` or `High`
- furnishing: `Partially Furnished` or `Unfurnished`
- listed date: `Recent`

### Sort order for search entry pages

- `Price (Low to High)`
- `Newest Listings`
- `Price per sqft`

### Browser-worker operating interpretation

These criteria should be used in two passes:

- search-page narrowing: use them to build or maintain very narrow PropertyGuru search entry URLs
- detail-page acceptance: only keep or refresh listings that still match the hard filters or are already shortlisted by the user

Default search-page URL shape for MVP:

- `with-2-bedrooms`
- `maxPrice=1500000`
- `minSize=900`

Do not spend time on `3BR` or `4BR` branches under the same price cap. Under the current budget, those searches have materially lower expected yield than `2BR`.

For MVP control, treat these as hard filters unless explicitly overridden:

- source site must be `propertyguru.com.sg`
- price must be `<= S$1,500,000`
- bedrooms must be `>= 2`
- size must be `>= 900 sqft`
- the search URL should already encode bedrooms, price, and size when possible

Treat these as preference or review fields, not automatic rejection:

- district, because it is an optional narrowing axis rather than a core economic filter
- MRT proximity when it is missing from the search card
- IPS drive time when it is not cheaply derivable
- tenure, as long as it is `freehold` or a leasehold term of at least `99 years`

The worker should trust PropertyGuru's own URL filters for price, bedroom count, and minimum size when the search card is incomplete, then confirm the stored values on the detail page.

## Current Operational Learnings

The live runs changed the operating rules in a few important ways:

- Candidate URL discovery must happen in one process, not one exec session per URL probe.
- Helper scripts must exit explicitly after output so the CDP connection does not leave orphaned terminals behind.
- Known `source_url` values must be loaded before a run so we skip already-stored listings before opening detail pages.
- Exact filtered pools in `D5`, `D10`, `D21`, and adjacent MRT pages can saturate quickly. When incremental yield drops to near zero, widen to the next plausible geography instead of repeatedly rerunning the same pool.
- Data quality fixes such as address parsing and agent-name extraction can recover valid rows more cheaply than widening the crawl blindly.

## Frontend Surfaces The Backend Must Support

### Listings

Route: `/listings`

Needs:

- active listings queue
- filterable by budget, tenure, bedrooms, district
- shortlist toggle
- dismiss or restore listing
- property detail navigation

### Property Detail

Route: `/property/[id]`

Needs:

- one listing by id
- agent name and phone
- MRT, commute, TOP, tenure, notes
- shortlist state
- dismiss state

### Shortlist

Route: `/shortlist`

Needs:

- shortlisted listings only
- shortlist filters
- remove from shortlist
- deep link into property detail

### Contact Hub

Route: `/contacts`

Needs:

- contacts derived from shortlisted listings
- one agent can represent multiple listings
- per-agent contact status: `pending`, `contacted`, `scheduled`
- phone, agency, listing count, listing names

### Dashboard

Route: `/dashboard`

Needs:

- tracked count
- shortlisted count
- viewed count
- average shortlist price
- average shortlist psf
- pending contact count
- top value deals
- listing scatter points

Important:

The dashboard is already derived from listings plus user decision state. We do not need a separate analytics service for MVP. We need stable primary data that lets the existing selectors compute the same answers in live mode.

## Ownership Boundary

### Backend owns persistent business data

- listings
- agents
- listing source metadata
- normalized import results
- scrape run records
- raw scrape snapshots
- scrape errors
- listing change events
- user-specific shortlist state
- user-specific dismissed state
- user-specific agent contact status

### Frontend keeps transient UI state

- active filters
- filter sheet open or closed
- currently selected listing card
- copied phone feedback
- local route memory
- other presentational flags

This matters because the current `MockUiState` mixes durable user decisions with temporary UI-only values. Live backend work should persist only the durable decision state.

## Canonical Data Contract

The backend should return data that maps directly into the existing frontend types.

### Listing

```ts
export interface Listing {
  id: string;
  listingId: string;
  projectName: string;
  address: string;
  district: string;
  price: number;
  sizeSqft: number;
  psf: number;
  bedrooms: number;
  bathrooms: number;
  tenure: string;
  topYear: number;
  mrtStation: string;
  mrtWalkMins: number;
  ipsDriveMins: number;
  sourceUrl: string;
  sourceSite: string;
  agentName: string;
  agentPhone: string;
  status: "new" | "shortlisted" | "viewing_booked" | "viewed" | "negotiating" | "dropped";
  notes: string;
}
```

### Agent

```ts
export interface Agent {
  id: string;
  agentId: string;
  agentName: string;
  phone: string;
  agency: string;
  notes: string;
  contacted: boolean;
  listingCount: number;
}
```

### User Decision State

The live backend should persist and return the durable part of the current mock state:

```ts
type ContactStatus = "pending" | "contacted" | "scheduled";

interface UserListingState {
  shortlistedIds: string[];
  dismissedIds: string[];
  contactStatusByAgentId: Record<string, ContactStatus>;
}
```

These current mock-state fields should stay client-only:

- `activeListingFilters`
- `activeShortlistFilter`
- `copiedValue`
- `lastVisitedRoute`
- `uiFlags`

## Online Retrieval Layer

Keep the Netlify API close to the current frontend contract so we can replace mock data without rewriting selectors.

### 1. App bootstrap

`GET /.netlify/functions/getAppState`

Response:

```json
{
  "listings": [],
  "agents": [],
  "userState": {
    "shortlistedIds": [],
    "dismissedIds": [],
    "contactStatusByAgentId": {}
  }
}
```

This is the best first live-mode contract because listings, shortlist, contacts, and dashboard all derive from these primitives already.

### 2. Listing detail

`GET /.netlify/functions/getListing?id={listingId}`

Returns one normalized listing object matching `types/models.ts`.

### 3. Manual import trigger

`POST /.netlify/functions/importListing`

Purpose:

- manually ingest a single listing URL on demand
- reuse the same normalization and upsert services as the ETL layer
- not replace the scheduled Windmill pipeline

Request:

```json
{
  "url": "https://property-site-listing"
}
```

Response:

```json
{
  "ok": true,
  "listing": {},
  "agent": {},
  "created": true,
  "updated": false
}
```

### 4. Update shortlist or dismiss state

`PATCH /.netlify/functions/updateListingState`

Request:

```json
{
  "listingId": "1",
  "shortlisted": true,
  "dismissed": false
}
```

### 5. Update contact status

`PATCH /.netlify/functions/updateContactStatus`

Request:

```json
{
  "agentId": "1",
  "status": "scheduled"
}
```

## Why This Fits The Existing UI

- listings, shortlist, contacts, and dashboard are all derived from the same small set of primitives
- the current selectors already expect `listings`, `agents`, and user decision state
- a bootstrap payload lets us replace `sample-data.ts` and part of `mock-ui-state.ts` incrementally
- we avoid building separate dashboard endpoints too early

## Airtable Persistence Model

If Airtable remains the MVP database, split config, run tracking, canonical business records, and user decision records.

### Config tables

#### ScrapeSources

- `id`
- `source_site`
- `source_type`
- `entry_url`
- `enabled`
- `refresh_priority`
- `notes`

### Run tracking tables

#### ScrapeRuns

- `id`
- `run_id`
- `job_type`
- `started_at`
- `finished_at`
- `status`
- `source_count`
- `success_count`
- `error_count`
- `notes`

#### RawListingSnapshots

- `id`
- `run_id`
- `source_site`
- `source_url`
- `raw_payload_json`
- `normalized_fingerprint`
- `scraped_at`

#### ScrapeErrors

- `id`
- `run_id`
- `source_url`
- `stage`
- `error_code`
- `error_message`
- `retryable`
- `created_at`

### Canonical tables

#### Listings

- `id`
- `listing_id`
- `project_name`
- `address`
- `district`
- `price`
- `size_sqft`
- `psf`
- `bedrooms`
- `bathrooms`
- `tenure`
- `top_year`
- `mrt_station`
- `mrt_walk_mins`
- `ips_drive_mins`
- `source_url`
- `source_site`
- `agent_id`
- `status`
- `notes`
- `raw_import_hash`
- `last_imported_at`
- `last_seen_at`
- `is_active`

#### Agents

- `id`
- `agent_id`
- `agent_name`
- `phone`
- `agency`
- `notes`

#### ListingEvents

- `id`
- `listing_id`
- `run_id`
- `event_type`
- `old_value_json`
- `new_value_json`
- `created_at`

### User decision tables

#### UserListingState

- `id`
- `user_id`
- `listing_id`
- `is_shortlisted`
- `is_dismissed`
- `updated_at`

#### UserAgentState

- `id`
- `user_id`
- `agent_id`
- `contact_status`
- `updated_at`

Important:

Do not treat `Listing.status` as the same thing as shortlist or dismiss state.

`Listing.status` is listing workflow state such as:

- `new`
- `viewing_booked`
- `viewed`
- `negotiating`
- `dropped`

Shortlist and dismiss are user-specific decisions and should be stored separately.

## Deferred Offline ETL Pipeline

The scheduled scrape pipeline is still independent from the Netlify retrieval layer, but it is deferred behind the authenticated browser-worker path.

Netlify reads normalized data.
Windmill creates and refreshes normalized data.

### Job families

#### 1. Discovery job

Purpose:

- scan very narrow PropertyGuru search pages or curated search URLs
- discover new candidate listing URLs
- reject obviously out-of-criteria candidates as early as possible
- enqueue only viable new listings for detail scrape

#### 2. Refresh job

Purpose:

- re-scrape active listings already in Airtable
- detect price, status, agent, or content changes
- update canonical records

Refresh priority:

- shortlisted listings: highest priority
- active listings that strongly match criteria: medium priority
- edge-case listings that only partially match preferences: low priority
- inactive or stale listings: do not refresh unless manually requested

#### 3. Reconcile or stale-marking job

Purpose:

- mark listings inactive if not seen for a configured window
- avoid showing dead inventory forever

#### 4. Reporting job

Purpose:

- summarize runs, failures, and major listing changes
- notify operators or write summary records

### Pipeline stages

1. Scheduler triggers a run and creates a `run_id`.
2. Source loader reads `ScrapeSources` or active listings to process.
3. Criteria gate loads the current hard filters and refresh-priority rules.
4. Public extraction stage performs narrow discovery or detailed scrape.
5. Early rejection gate drops listings that clearly fail the hard criteria before expensive follow-up work.
6. Raw capture stage stores the raw payload and metadata.
7. Normalization stage converts the payload into frontend-ready fields.
8. Match scoring stage classifies the listing as hard-match, soft-match, or reject.
9. Dedup stage resolves canonical listing identity.
10. Agent resolution stage matches or creates the agent.
11. Diff stage compares new data against the canonical listing.
12. Promotion stage upserts `Listings` and `Agents`.
13. Post-processing stage writes `ListingEvents`, updates `last_seen_at`, and marks stale records.
14. Reporting stage updates `ScrapeRuns` and `ScrapeErrors`.

### Hard rules

- the ETL pipeline must never overwrite user shortlist, dismiss, or contact-status state
- the app must never depend on live Firecrawl calls during page loads
- the ETL pipeline must optimize for minimal Firecrawl credit usage over maximum catalog coverage
- the ETL pipeline must stay within PropertyGuru-only search scope for MVP
- raw scrape output should be stored before aggressive normalization when feasible
- all listing writes should be idempotent by canonical identity
- failed hard criteria should stop further processing for that listing unless it is explicitly user-shortlisted
- unchanged listings should not generate unnecessary Airtable writes
- do not branch into economically implausible search pools, such as larger bedroom counts under the same tight price ceiling, unless the user explicitly asks for that expansion

## Authenticated Extraction Contract

The current local Playwright extractor should populate both listing cards and the property detail page. Firecrawl remains a later public-page tool, not the core authenticated extraction path.

Minimum extracted fields:

- project name
- address
- district when available
- price
- size sqft
- psf when available
- bedrooms
- bathrooms when available
- tenure when available
- top year when available
- mrt station when available
- mrt walk mins when available
- agent name
- agent phone when the logged-in page exposes it
- source url
- source site
- notes or summary copy when available

If the authenticated browser cannot provide some fields, the normalizer should still return a complete listing object with safe defaults and predictable fallback behavior. If Firecrawl is reintroduced later for public discovery, it should match the same normalized output contract.

## Normalization Rules

The normalizer should produce frontend-ready values, not scraper-native strings.

### Required normalization

- phone to `+65XXXXXXXX` where possible
- currency to integer SGD
- numeric strings to numbers
- `sizeSqft` as integer
- `psf` as integer
- `bedrooms` and `bathrooms` as integers
- `topYear` as integer
- `mrtWalkMins` and `ipsDriveMins` as integers

### Derived values

- compute `psf` from `price / sizeSqft` if missing and both exist
- infer `sourceSite` from hostname when not extracted
- generate stable `listingId` if source-site id is missing
- attach `agentId` by deduping on normalized phone first, then normalized name

### Safe defaults

- unknown text fields: `""`
- unknown numeric fields: `0`
- default listing status: `"new"`

## Recommended Windmill Setup

### Workspace configuration

Create resources and secrets for:

- Firecrawl API access
- Airtable API access
- optional notification endpoints

### Scripts

Start with small scripts that do one thing each:

- `load_scrape_sources`
- `discover_listing_urls`
- `scrape_listing_detail`
- `normalize_listing_payload`
- `upsert_agent`
- `upsert_listing`
- `record_listing_event`
- `record_scrape_error`
- `mark_stale_listings`
- `summarize_scrape_run`

### Flows

Create a few opinionated flows instead of one giant workflow:

- `daily_discovery_flow`
- `daily_refresh_flow`
- `stale_reconciliation_flow`
- `scrape_reporting_flow`

### Scheduling

Recommended starting point:

- discovery once daily using only narrow pre-filtered entry URLs
- shortlisted listing refresh once daily
- active matched listing refresh every 2 to 3 days
- low-priority listing refresh weekly
- stale reconciliation nightly
- reporting after the main scrape window

### Reliability

Use Windmill flow retries and error handlers for transient failures.

Typical retry candidates:

- Firecrawl request failures
- Airtable rate-limit or temporary API failures
- intermittent parsing or network issues

Use run-level logging so each ETL run can be audited by `run_id`.

## Implementation Order

### Phase 1: Lock the backend contract

- keep `types/models.ts` as the canonical frontend-facing schema
- keep the online and offline layers separate by design
- treat this playbook as the source of truth for the split

### Phase 2: Build the ETL core first

- expand `lib/normalizer.ts` to cover all UI-required fields
- add robust unit tests for Singapore phone and currency parsing
- implement Airtable repositories for canonical tables and run tracking
- define the first Windmill scripts and flows

### Phase 3: Land the scheduled pipeline

- implement discovery flow
- implement refresh flow
- implement snapshot and error recording
- implement stale listing handling
- verify Airtable is populated without involving the app

### Phase 4: Build the Netlify retrieval layer

- add `getAppState`
- add `getListing`
- keep manual `importListing` as an operator tool, not the primary ingestion path
- add shortlist and contact-status mutation endpoints

### Phase 5: Add the frontend live-mode adapter

- replace direct `sample-data.ts` reads with fetched live data when `NEXT_PUBLIC_DATA_MODE === "live"`
- preserve the current selectors where possible
- keep transient UI flags local

## Acceptance Criteria

Backend is ready for frontend integration when all of the following are true:

1. Scheduled Windmill runs populate and refresh Airtable canonical tables.
2. Run snapshots, errors, and changes are inspectable after each ETL run.
3. `getAppState` returns data that can drive listings, shortlist, contacts, and dashboard without page-specific reshaping.
4. Property detail can load by listing id using the same fields already rendered today.
5. Shortlist, dismiss, and contact status updates persist across reloads.
6. WhatsApp and call links still work because the backend returns normalized phone numbers.
7. The frontend does not need a second domain model for live mode.

## Non-Goals For This Phase

- redesigning the frontend
- changing route structure
- making live Firecrawl requests from page loads
- inventing a separate analytics service
- persisting temporary UI flags
- over-optimizing beyond the current MVP screen set

## Files To Review First

- `types/models.ts`
- `lib/sample-data.ts`
- `lib/mock-ui-state.ts`
- `lib/mock-selectors.ts`
- `lib/airtable.ts`
- `lib/firecrawl.ts`
- `lib/normalizer.ts`
- `netlify/functions/importListing.ts`
- `netlify/functions/getListings.ts`

## Future Folder Direction

As the ETL layer grows, prefer a structure like:

- `windmill/scripts/`
- `windmill/flows/`
- `lib/services/`
- `lib/repositories/`
- `lib/normalizer/`

## Final Direction

The fastest path is:

1. keep the current frontend contract
2. let Windmill own scheduled scraping and post-processing
3. let Airtable store canonical data, run history, and user state
4. let Netlify serve curated data to the UI
5. leave ephemeral UI behavior in the client

That gives us a backend that genuinely fits the existing UI instead of forcing the UI to be rebuilt around the backend.

