# Windmill ETL Scaffold

This folder is the source-of-truth scaffold for the offline ETL layer described in
`architecture/property-hunter-playbook.md`.

## Layout

- `shared/`: criteria, fingerprints, and shared ETL types
- `scripts/`: Windmill TypeScript entrypoints with `main(...)`
- `flows/`: starter flow definitions and step ordering notes

## Intent

The current scaffold is deliberately thin:

- business rules are encoded in reusable TypeScript
- external calls to Firecrawl and Airtable are still placeholders where appropriate
- the first real implementation should wire these scripts to Windmill resources and Airtable tables

## Suggested next steps

1. Fill `ScrapeSources` in Airtable with narrow PropertyGuru search URLs.
2. Wire `scrape_propertyguru_search_page.ts` to Firecrawl scrape for result-card extraction.
3. Wire `scrape_propertyguru_detail_page.ts` to Firecrawl scrape for detail extraction.
4. Replace in-memory outputs in `start_scrape_run.ts` and `finalize_scrape_run.ts` with Airtable writes.
5. Build the actual Windmill flow in `daily_propertyguru_intake.flow` using the step order documented in the flow README.

## Windmill note

Each script exports `main(...)` to match Windmill TypeScript script conventions. If you want repository-backed metadata files later, generate them from the Windmill CLI after the script contracts settle.
