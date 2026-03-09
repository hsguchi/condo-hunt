import { DEFAULT_CRITERIA_PROFILE, mergeCriteriaProfile } from "./criteria.mjs";
import { getRequiredEnv } from "./env.mjs";

const DEFAULT_AIRTABLE_API_URL = "https://api.airtable.com/v0";
const DEFAULT_TABLES = {
  browserJobs: "BrowserJobs",
  browserRuns: "BrowserRuns",
  extractedListings: "ExtractedListings",
  criteriaProfiles: "CriteriaProfiles"
};

function toQueryString(params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        search.append(key, entry);
      }
      continue;
    }

    search.set(key, String(value));
  }

  return search.toString();
}

function readField(fields, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(fields, name)) {
      return fields[name];
    }
  }

  return undefined;
}

function readString(fields, names, fallbackValue = "") {
  const value = readField(fields, names);

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallbackValue;
}

function readBoolean(fields, names, fallbackValue = false) {
  const value = readField(fields, names);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return fallbackValue;
}

function readNumber(fields, names, fallbackValue = 0) {
  const value = readField(fields, names);

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallbackValue : parsed;
  }

  return fallbackValue;
}

function readDate(fields, names) {
  const value = readField(fields, names);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readLinkedRecordId(fields, names) {
  const value = readField(fields, names);

  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string") ?? null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function readStringList(fields, names) {
  const value = readField(fields, names);

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry).trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }

    return trimmed
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeSourceSite(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return DEFAULT_CRITERIA_PROFILE.sourceSite;
  }
}

function normalizeBrowserJob(record) {
  const fields = record.fields;
  const entryUrl = readString(fields, ["entry_url", "entryUrl"]);

  return {
    recordId: record.id,
    name: readString(fields, ["name"], record.id),
    enabled: readBoolean(fields, ["enabled"], true),
    jobType: readString(fields, ["job_type", "jobType"], "extract_matches"),
    entryUrl,
    sourceSite: normalizeSourceSite(entryUrl),
    criteriaProfileId: readLinkedRecordId(fields, ["criteria_profile_id", "criteria_profile"]),
    limit: readNumber(fields, ["limit"], 10),
    maxPages: readNumber(fields, ["max_pages", "maxPages"], 1),
    sortMode: readString(fields, ["sort_mode", "sortMode"]) || null,
    prompt: readString(fields, ["prompt"]) || null,
    scheduleKind: readString(fields, ["schedule_kind", "scheduleKind"], "manual"),
    scheduleValue: readString(fields, ["schedule_value", "scheduleValue"]) || null,
    nextRunAt: readDate(fields, ["next_run_at", "nextRunAt"]),
    lastRunAt: readDate(fields, ["last_run_at", "lastRunAt"]),
    status: readString(fields, ["status"], "idle"),
    lastError: readString(fields, ["last_error", "lastError"]) || null,
    includeDetailFields: readBoolean(fields, ["include_detail_fields"], false),
    includeAgentPhone: readBoolean(fields, ["include_agent_phone"], false)
  };
}

function normalizeCriteriaProfile(record) {
  const fields = record.fields;

  return mergeCriteriaProfile({
    id: record.id,
    name: readString(fields, ["name"], record.id),
    sourceSite: readString(fields, ["source_site"], DEFAULT_CRITERIA_PROFILE.sourceSite),
    maxPriceSgd: readNumber(fields, ["max_price_sgd"], DEFAULT_CRITERIA_PROFILE.maxPriceSgd),
    minBedrooms: readNumber(fields, ["min_bedrooms"], DEFAULT_CRITERIA_PROFILE.minBedrooms),
    minSqft: readNumber(fields, ["min_sqft"], DEFAULT_CRITERIA_PROFILE.minSqft),
    districts: readStringList(fields, ["districts_json", "districts"]),
    maxMrtDistanceM: readNumber(
      fields,
      ["max_mrt_distance_m"],
      DEFAULT_CRITERIA_PROFILE.maxMrtDistanceM
    ),
    maxMrtWalkMins: readNumber(
      fields,
      ["max_mrt_walk_mins"],
      DEFAULT_CRITERIA_PROFILE.maxMrtWalkMins
    ),
    maxDriveMinutesToIps: readNumber(
      fields,
      ["max_drive_minutes_to_ips"],
      DEFAULT_CRITERIA_PROFILE.maxDriveMinutesToIps
    ),
    requireCompleted: readBoolean(fields, ["require_completed"], DEFAULT_CRITERIA_PROFILE.requireCompleted),
    allowedTenures: readStringList(fields, ["allowed_tenures_json", "allowed_tenures"]),
    preferredMrtStations: readStringList(fields, ["preferred_mrt_stations_json", "preferred_mrt_stations"])
  });
}

export function createAirtableClient() {
  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;
  const tables = {
    browserJobs: process.env.AIRTABLE_BROWSER_JOBS_TABLE ?? DEFAULT_TABLES.browserJobs,
    browserRuns: process.env.AIRTABLE_BROWSER_RUNS_TABLE ?? DEFAULT_TABLES.browserRuns,
    extractedListings:
      process.env.AIRTABLE_EXTRACTED_LISTINGS_TABLE ?? DEFAULT_TABLES.extractedListings,
    criteriaProfiles:
      process.env.AIRTABLE_CRITERIA_PROFILES_TABLE ?? DEFAULT_TABLES.criteriaProfiles
  };

  async function request(method, pathSegments, options = {}) {
    const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
    const tableUrl = `${apiUrl}/${baseId}/${encodedPath}`;
    const query = options.query ? `?${toQueryString(options.query)}` : "";
    const response = await fetch(`${tableUrl}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Airtable request failed (${response.status} ${method} ${pathSegments.join("/")}): ${errorBody}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function listRecords(tableName, options = {}) {
    const records = [];
    let offset;

    do {
      const body = await request("GET", [tableName], {
        query: {
          pageSize: 100,
          offset,
          filterByFormula: options.filterByFormula,
          view: options.view,
          ...Object.fromEntries(
            (options.sort ?? []).flatMap((entry, index) => [
              [`sort[${index}][field]`, entry.field],
              [`sort[${index}][direction]`, entry.direction ?? "asc"]
            ])
          )
        }
      });

      records.push(...body.records);
      offset = body.offset;
    } while (offset);

    return records;
  }

  async function getRecord(tableName, recordId) {
    return request("GET", [tableName, recordId]);
  }

  async function createRecord(tableName, fields) {
    const body = await request("POST", [tableName], {
      body: {
        typecast: true,
        records: [{ fields }]
      }
    });

    return body.records[0];
  }

  async function updateRecord(tableName, recordId, fields) {
    return request("PATCH", [tableName, recordId], {
      body: {
        fields,
        typecast: true
      }
    });
  }

  async function updateRecords(tableName, records) {
    const updated = [];

    for (let index = 0; index < records.length; index += 10) {
      const chunk = records.slice(index, index + 10).map((entry) => ({
        id: entry.id,
        fields: entry.fields
      }));

      const body = await request("PATCH", [tableName], {
        body: {
          typecast: true,
          records: chunk
        }
      });

      updated.push(...body.records);
    }

    return updated;
  }

  async function deleteRecords(tableName, recordIds) {
    const deleted = [];

    for (let index = 0; index < recordIds.length; index += 10) {
      const chunk = recordIds.slice(index, index + 10);
      const query = {};
      chunk.forEach((recordId, chunkIndex) => {
        query[`records[${chunkIndex}]`] = recordId;
      });

      const body = await request("DELETE", [tableName], { query });
      deleted.push(...body.records);
    }

    return deleted;
  }

  async function createRecords(tableName, records) {
    const created = [];

    for (let index = 0; index < records.length; index += 10) {
      const chunk = records.slice(index, index + 10).map((fields) => ({ fields }));
      const body = await request("POST", [tableName], {
        body: {
          typecast: true,
          records: chunk
        }
      });

      created.push(...body.records);
    }

    return created;
  }

  async function listBrowserJobs({ jobId } = {}) {
    if (jobId) {
      return [normalizeBrowserJob(await getRecord(tables.browserJobs, jobId))];
    }

    const records = await listRecords(tables.browserJobs, {
      filterByFormula: "OR({enabled}=1, {enabled}=TRUE(), {enabled}=BLANK())",
      sort: [{ field: "next_run_at", direction: "asc" }]
    });

    return records.map(normalizeBrowserJob).filter((job) => job.entryUrl.length > 0);
  }

  async function getCriteriaProfile(profileId) {
    if (!profileId) {
      return mergeCriteriaProfile(DEFAULT_CRITERIA_PROFILE);
    }

    try {
      return normalizeCriteriaProfile(await getRecord(tables.criteriaProfiles, profileId));
    } catch {
      return mergeCriteriaProfile(DEFAULT_CRITERIA_PROFILE);
    }
  }

  async function createBrowserRun(fields) {
    return createRecord(tables.browserRuns, fields);
  }

  async function updateBrowserRun(recordId, fields) {
    return updateRecord(tables.browserRuns, recordId, fields);
  }

  async function updateBrowserJob(recordId, fields) {
    return updateRecord(tables.browserJobs, recordId, fields);
  }

  async function createExtractedListings(records) {
    if (records.length === 0) {
      return [];
    }

    return createRecords(tables.extractedListings, records);
  }

  async function listExtractedListings({ maxRecords, filterByFormula, sort } = {}) {
    const records = await listRecords(tables.extractedListings, {
      filterByFormula,
      sort: sort ?? [{ field: "captured_at", direction: "desc" }]
    });

    return typeof maxRecords === "number" ? records.slice(0, maxRecords) : records;
  }

  async function listExtractedListingSourceUrls() {
    const records = await listExtractedListings({
      sort: [{ field: "source_url", direction: "asc" }]
    });
    const sourceUrls = new Set();

    for (const record of records) {
      const sourceUrl = readString(record.fields, ["source_url"]);

      if (!sourceUrl) {
        continue;
      }

      sourceUrls.add(sourceUrl);
    }

    return sourceUrls;
  }

  async function upsertExtractedListings(records) {
    if (records.length === 0) {
      return {
        created: [],
        updated: []
      };
    }

    const existing = await listExtractedListings();
    const existingBySourceUrl = new Map();

    for (const record of existing) {
      const sourceUrl = readString(record.fields, ["source_url"]);

      if (!sourceUrl || existingBySourceUrl.has(sourceUrl)) {
        continue;
      }

      existingBySourceUrl.set(sourceUrl, record);
    }

    const toCreate = [];
    const toUpdate = [];

    for (const fields of records) {
      const sourceUrl = fields.source_url;
      const existingRecord = sourceUrl ? existingBySourceUrl.get(sourceUrl) : null;

      if (existingRecord) {
        toUpdate.push({
          id: existingRecord.id,
          fields
        });
        continue;
      }

      toCreate.push(fields);
    }

    return {
      created: await createRecords(tables.extractedListings, toCreate),
      updated: await updateRecords(tables.extractedListings, toUpdate)
    };
  }

  async function dedupeExtractedListings() {
    const records = await listExtractedListings();
    const seen = new Set();
    const toDelete = [];

    for (const record of records) {
      const sourceUrl = readString(record.fields, ["source_url"]);

      if (!sourceUrl) {
        continue;
      }

      if (seen.has(sourceUrl)) {
        toDelete.push(record.id);
        continue;
      }

      seen.add(sourceUrl);
    }

    if (toDelete.length === 0) {
      return [];
    }

    return deleteRecords(tables.extractedListings, toDelete);
  }

  return {
    listBrowserJobs,
    getCriteriaProfile,
    createBrowserRun,
    updateBrowserRun,
    updateBrowserJob,
    createExtractedListings,
    listExtractedListings,
    listExtractedListingSourceUrls,
    upsertExtractedListings,
    dedupeExtractedListings
  };
}
