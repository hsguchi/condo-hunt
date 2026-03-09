import type { Listing } from "../types/models";
import type { ScrapeSource } from "../windmill/shared/etl-types";

const DEFAULT_AIRTABLE_API_URL = "https://api.airtable.com/v0";
const DEFAULT_SCRAPE_SOURCES_TABLE = "ScrapeSources";

interface AirtableRecord<TFields extends Record<string, unknown>> {
  id: string;
  createdTime?: string;
  fields: TFields;
}

interface AirtableListResponse<TFields extends Record<string, unknown>> {
  offset?: string;
  records: Array<AirtableRecord<TFields>>;
}

interface ScrapeSourceFields {
  [key: string]: unknown;
  source_site?: string;
  source_type?: string;
  entry_url?: string;
  enabled?: boolean;
  refresh_priority?: number;
  notes?: string;
}

function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;

  if (!apiKey || !baseId) {
    throw new Error("Missing Airtable configuration");
  }

  return {
    apiKey,
    baseId,
    apiUrl
  };
}

async function listAirtableRecords<TFields extends Record<string, unknown>>(
  tableName: string,
  params: {
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
    view?: string;
  } = {}
): Promise<Array<AirtableRecord<TFields>>> {
  const { apiKey, baseId, apiUrl } = getAirtableConfig();
  const records: Array<AirtableRecord<TFields>> = [];
  let offset: string | undefined;

  do {
    const search = new URLSearchParams();

    if (params.filterByFormula) {
      search.set("filterByFormula", params.filterByFormula);
    }

    if (typeof params.maxRecords === "number") {
      search.set("maxRecords", String(params.maxRecords));
    }

    if (params.view) {
      search.set("view", params.view);
    }

    params.sort?.forEach((sortEntry, index) => {
      search.set(`sort[${index}][field]`, sortEntry.field);
      if (sortEntry.direction) {
        search.set(`sort[${index}][direction]`, sortEntry.direction);
      }
    });

    if (offset) {
      search.set("offset", offset);
    }

    const response = await fetch(
      `${apiUrl}/${baseId}/${encodeURIComponent(tableName)}?${search.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Airtable request failed (${response.status}): ${errorBody}`);
    }

    const body = (await response.json()) as AirtableListResponse<TFields>;
    records.push(...body.records);
    offset = body.offset;
  } while (offset);

  return records;
}

function normalizeScrapeSourceRecord(record: AirtableRecord<ScrapeSourceFields>): ScrapeSource {
  const sourceSite = record.fields.source_site?.trim() ?? "";
  const sourceType = record.fields.source_type === "manual_watchlist" ? "manual_watchlist" : "search_page";
  const entryUrl = record.fields.entry_url?.trim() ?? "";
  const refreshPriority =
    typeof record.fields.refresh_priority === "number" ? record.fields.refresh_priority : 0;

  return {
    id: record.id,
    sourceSite,
    sourceType,
    entryUrl,
    enabled: record.fields.enabled !== false,
    refreshPriority,
    notes: record.fields.notes?.trim() || undefined
  };
}

export async function getScrapeSources({
  sourceSite,
  enabledOnly = true,
  tableName = process.env.AIRTABLE_SCRAPE_SOURCES_TABLE ?? DEFAULT_SCRAPE_SOURCES_TABLE
}: {
  sourceSite?: string;
  enabledOnly?: boolean;
  tableName?: string;
} = {}): Promise<ScrapeSource[]> {
  const filters: string[] = [];

  if (enabledOnly) {
    filters.push("OR({enabled}=1, {enabled}=TRUE(), {enabled}=BLANK())");
  }

  if (sourceSite) {
    filters.push(`LOWER({source_site})='${sourceSite.toLowerCase().replace(/'/g, "\\'")}'`);
  }

  const filterByFormula = filters.length > 0 ? `AND(${filters.join(",")})` : undefined;
  const records = await listAirtableRecords<ScrapeSourceFields>(tableName, {
    filterByFormula,
    sort: [{ field: "refresh_priority", direction: "desc" }]
  });

  return records
    .map(normalizeScrapeSourceRecord)
    .filter((source) => source.entryUrl.length > 0)
    .sort((left, right) => right.refreshPriority - left.refreshPriority || left.id.localeCompare(right.id));
}

export async function createListing(listing: Partial<Listing>) {
  getAirtableConfig();
  return listing;
}

export async function getListings(): Promise<Listing[]> {
  return [];
}

export async function createAgentIfMissing(agentName: string, phone: string) {
  return {
    agentName,
    phone
  };
}


