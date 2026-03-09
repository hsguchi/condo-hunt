# Local Browser Worker

This worker turns Airtable into the control plane for scheduled PropertyGuru browser tasks.

It does not run a remote scraper. It connects to your local logged-in Chrome session through CDP and executes bounded browser jobs.

## Current Scope

Implemented job type:

- `extract_matches`

The worker will:

- poll Airtable for due `BrowserJobs`
- connect to Chrome over CDP
- open the configured `entry_url`
- scan PropertyGuru listing cards
- optionally open listing detail pages
- persist accepted matches into Airtable
- record `BrowserRuns` history

## Required Airtable Tables

### `CriteriaProfiles`

Recommended fields:

- `name`
- `enabled`
- `source_site`
- `max_price_sgd`
- `min_bedrooms`
- `min_sqft`
- `districts_json`
- `max_mrt_distance_m`
- `max_mrt_walk_mins`
- `preferred_mrt_stations_json`
- `require_completed`
- `allowed_tenures_json`
- `max_drive_minutes_to_ips`

### `BrowserJobs`

Required fields for the first user test:

- `name`
- `enabled`
- `job_type`
- `entry_url`
- `criteria_profile_id`
- `limit`
- `max_pages`
- `schedule_kind`
- `schedule_value`
- `next_run_at`
- `include_detail_fields`
- `include_agent_phone`

Suggested values for the first job:

- `job_type = extract_matches`
- `limit = 10`
- `max_pages = 2`
- `schedule_kind = manual`
- `include_detail_fields = true`
- `include_agent_phone = true`

### `BrowserRuns`

Fields written by the worker:

- `run_id`
- `job_id`
- `job_name`
- `started_at`
- `finished_at`
- `status`
- `matched_count`
- `scanned_count`
- `page_count`
- `error_summary`
- `screenshot_urls_json`
- `log_excerpt`

### `ExtractedListings`

Fields written by the worker:

- `job_id`
- `run_id`
- `source_site`
- `source_url`
- `source_listing_id`
- `project_name`
- `address`
- `district`
- `price_sgd`
- `bedrooms`
- `bathrooms`
- `size_sqft`
- `psf`
- `tenure`
- `top_year`
- `mrt_station`
- `mrt_distance_m`
- `mrt_walk_mins`
- `ips_drive_mins`
- `matched_profile_id`
- `match_status`
- `agent_name`
- `agent_phone`
- `notes`
- `raw_card_json`
- `captured_at`

## Environment

Add these to `.env.local`:

```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_BROWSER_JOBS_TABLE=BrowserJobs
AIRTABLE_BROWSER_RUNS_TABLE=BrowserRuns
AIRTABLE_EXTRACTED_LISTINGS_TABLE=ExtractedListings
AIRTABLE_CRITERIA_PROFILES_TABLE=CriteriaProfiles
BROWSER_CDP_URL=http://127.0.0.1:9222
BROWSER_WORKER_POLL_INTERVAL_SECONDS=60
BROWSER_WORKER_TIMEZONE=Asia/Singapore
BROWSER_WORKER_ARTIFACT_DIR=/tmp/condo-hunt-browser-worker
```

Install dependencies if this worktree does not already have them:

```bash
npm ci
```

## Chrome Setup

Launch Chrome with remote debugging enabled.

Windows example:

```powershell
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\propertyguru-worker"
```

Then:

1. Log into PropertyGuru in that Chrome window.
2. Open a search page that matches your intended job.
3. Leave Chrome running.

## Run Commands

Bootstrap Airtable tables:

```bash
npm run worker:airtable:bootstrap
```

Bootstrap Airtable and create a sample manual job:

```bash
npm run worker:airtable:bootstrap -- --entry-url "https://www.propertyguru.com.sg/..."
```

Run one polling iteration:

```bash
npm run worker:browser:once
```

Run one specific Airtable job:

```bash
npm run worker:browser:once -- --job recXXXXXXXXXXXXXX
```

Run continuously:

```bash
npm run worker:browser
```

Dry run without Airtable writes:

```bash
npm run worker:browser:once -- --job recXXXXXXXXXXXXXX --dry-run
```

## First User Test

Use one manual job row in `BrowserJobs`:

- `name = D5 manual test`
- `enabled = true`
- `job_type = extract_matches`
- `entry_url = <your narrowed PropertyGuru search URL>`
- `criteria_profile_id = <record id from CriteriaProfiles>`
- `limit = 10`
- `max_pages = 2`
- `schedule_kind = manual`
- `include_detail_fields = true`
- `include_agent_phone = true`

Then run:

```bash
npm run worker:browser:once -- --job <browser_job_record_id>
```

Expected result:

- one row in `BrowserRuns`
- up to `10` rows in `ExtractedListings`
- screenshots written to `BROWSER_WORKER_ARTIFACT_DIR` if the run fails

## Notes

- The worker uses a deterministic `extract_matches` flow. It does not execute arbitrary prompt plans.
- `criteria_profile_id` can be a linked record field or a plain Airtable record id string.
- The extraction logic is heuristic because PropertyGuru’s DOM is not stable or documented. Expect selector tuning after the first real browser test.
