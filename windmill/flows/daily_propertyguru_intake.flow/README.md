# Daily PropertyGuru Intake Flow

This flow is the first low-credit MVP ETL for PropertyGuru Singapore listings.

## Mermaid Diagram

```mermaid
flowchart TD
    A["Windmill Schedule"] --> B["start_scrape_run"]
    B --> C["load_scrape_sources"]
    C --> D["Airtable: ScrapeSources"]

    C --> E["scrape_propertyguru_search_page"]
    E --> F["Firecrawl: scrape narrow PropertyGuru search pages"]
    F --> G["Candidate cards"]

    G --> H["filter_candidate_cards"]
    H --> I["Reject obvious non-matches early"]
    H --> J["Accepted / Review candidates"]

    J --> K["plan_detail_queue"]
    K --> L["Airtable: Listings + UserListingState"]
    K --> M["Priority queue for detail scrape"]

    M --> N["scrape_propertyguru_detail_page"]
    N --> O["Firecrawl: scrape listing detail page"]
    O --> P["Raw detail payload"]

    P --> Q["normalize_and_score_listing"]
    Q --> R{"Criteria decision"}

    R -- "Reject" --> S["Skip write"]
    R -- "Review" --> T["Low-priority / manual review lane"]
    R -- "Accept" --> U["Upsert agent"]
    U --> V["Upsert listing"]
    V --> W["Record listing event if changed"]

    U --> X["Airtable: Agents"]
    V --> Y["Airtable: Listings"]
    W --> Z["Airtable: ListingEvents"]

    S --> AA["finalize_scrape_run"]
    T --> AA
    W --> AA
    I --> AA

    AA --> AB["Airtable: ScrapeRuns / ScrapeErrors"]
```

## Intended step order

1. `start_scrape_run`
2. `load_scrape_sources`
3. `scrape_propertyguru_search_page`
4. `filter_candidate_cards`
5. `plan_detail_queue`
6. `scrape_propertyguru_detail_page`
7. `normalize_and_score_listing`
8. future Airtable upsert scripts
9. `finalize_scrape_run`

## Notes

- Discovery should only use narrow pre-filtered search URLs.
- Candidate cards should be rejected early on price, bedroom, size, district, and MRT criteria when available.
- Detail scrapes should be capped per run.
- Shortlisted listings should always outrank ordinary refresh work.
- Unchanged listings should not trigger unnecessary Airtable writes.

## Future scripts to add

- `upsert_agent`
- `upsert_listing`
- `record_listing_event`
- `record_scrape_error`
- `mark_stale_listings`
