#!/usr/bin/env node

import { loadEnvFiles, getRequiredEnv } from "./lib/env.mjs";
import { DEFAULT_CRITERIA_PROFILE } from "./lib/criteria.mjs";

const DEFAULT_AIRTABLE_API_URL = "https://api.airtable.com/v0";

const TABLE_SPECS = [
  {
    name: "CriteriaProfiles",
    primaryField: "name",
    description: "Reusable PropertyGuru criteria profiles for the local browser worker.",
    fields: [
      { name: "enabled", type: "singleLineText" },
      { name: "source_site", type: "singleLineText" },
      { name: "max_price_sgd", type: "number", options: { precision: 0 } },
      { name: "min_bedrooms", type: "number", options: { precision: 0 } },
      { name: "min_sqft", type: "number", options: { precision: 0 } },
      { name: "districts_json", type: "multilineText" },
      { name: "max_mrt_distance_m", type: "number", options: { precision: 0 } },
      { name: "max_mrt_walk_mins", type: "number", options: { precision: 0 } },
      { name: "preferred_mrt_stations_json", type: "multilineText" },
      { name: "require_completed", type: "singleLineText" },
      { name: "allowed_tenures_json", type: "multilineText" },
      { name: "max_drive_minutes_to_ips", type: "number", options: { precision: 0 } },
      { name: "notes", type: "multilineText" }
    ]
  },
  {
    name: "BrowserJobs",
    primaryField: "name",
    description: "Scheduled or manual browser-use jobs executed by the local worker.",
    fields: [
      { name: "enabled", type: "singleLineText" },
      { name: "job_type", type: "singleLineText" },
      { name: "entry_url", type: "singleLineText" },
      { name: "criteria_profile_id", type: "singleLineText" },
      { name: "limit", type: "number", options: { precision: 0 } },
      { name: "max_pages", type: "number", options: { precision: 0 } },
      { name: "sort_mode", type: "singleLineText" },
      { name: "prompt", type: "multilineText" },
      { name: "schedule_kind", type: "singleLineText" },
      { name: "schedule_value", type: "singleLineText" },
      { name: "next_run_at", type: "singleLineText" },
      { name: "last_run_at", type: "singleLineText" },
      { name: "status", type: "singleLineText" },
      { name: "last_error", type: "multilineText" },
      { name: "include_detail_fields", type: "singleLineText" },
      { name: "include_agent_phone", type: "singleLineText" },
      { name: "notes", type: "multilineText" }
    ]
  },
  {
    name: "BrowserRuns",
    primaryField: "run_id",
    description: "Execution log for the local browser worker.",
    fields: [
      { name: "job_id", type: "singleLineText" },
      { name: "job_name", type: "singleLineText" },
      { name: "started_at", type: "singleLineText" },
      { name: "finished_at", type: "singleLineText" },
      { name: "status", type: "singleLineText" },
      { name: "matched_count", type: "number", options: { precision: 0 } },
      { name: "scanned_count", type: "number", options: { precision: 0 } },
      { name: "page_count", type: "number", options: { precision: 0 } },
      { name: "error_summary", type: "multilineText" },
      { name: "screenshot_urls_json", type: "multilineText" },
      { name: "log_excerpt", type: "multilineText" }
    ]
  },
  {
    name: "ExtractedListings",
    primaryField: "source_url",
    description: "Normalized PropertyGuru listings captured by the local browser worker.",
    fields: [
      { name: "job_id", type: "singleLineText" },
      { name: "run_id", type: "singleLineText" },
      { name: "source_site", type: "singleLineText" },
      { name: "source_listing_id", type: "singleLineText" },
      { name: "project_name", type: "singleLineText" },
      { name: "address", type: "multilineText" },
      { name: "district", type: "singleLineText" },
      { name: "price_sgd", type: "number", options: { precision: 0 } },
      { name: "bedrooms", type: "number", options: { precision: 0 } },
      { name: "bathrooms", type: "number", options: { precision: 1 } },
      { name: "size_sqft", type: "number", options: { precision: 0 } },
      { name: "psf", type: "number", options: { precision: 0 } },
      { name: "tenure", type: "singleLineText" },
      { name: "top_year", type: "number", options: { precision: 0 } },
      { name: "mrt_station", type: "singleLineText" },
      { name: "mrt_distance_m", type: "number", options: { precision: 0 } },
      { name: "mrt_walk_mins", type: "number", options: { precision: 0 } },
      { name: "ips_drive_mins", type: "number", options: { precision: 0 } },
      { name: "matched_profile_id", type: "singleLineText" },
      { name: "match_status", type: "singleLineText" },
      { name: "agent_name", type: "singleLineText" },
      { name: "agent_phone", type: "singleLineText" },
      { name: "notes", type: "multilineText" },
      { name: "raw_card_json", type: "multilineText" },
      { name: "captured_at", type: "singleLineText" }
    ]
  },
  {
    name: "BrowserSettings",
    primaryField: "key",
    description: "Optional environment-level settings for the local browser worker.",
    fields: [
      { name: "value", type: "multilineText" },
      { name: "notes", type: "multilineText" }
    ]
  }
];

function parseArgs(argv) {
  const args = {
    help: false,
    entryUrl: null,
    jobName: "Manual PropertyGuru test",
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--entry-url") {
      args.entryUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--job-name") {
      args.jobName = argv[index + 1] ?? args.jobName;
      index += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Bootstrap Airtable tables for the local PropertyGuru browser worker

Usage:
  node browser-worker/bootstrap-airtable.mjs
  node browser-worker/bootstrap-airtable.mjs --entry-url "https://www.propertyguru.com.sg/..."
  node browser-worker/bootstrap-airtable.mjs --dry-run

Flags:
  --entry-url URL   Create a sample manual BrowserJobs row for this search URL
  --job-name TEXT   Name for the sample BrowserJobs row
  --dry-run         Print actions without writing to Airtable
  --help            Show this message
`);
}

function createMetadataClient() {
  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;

  async function request(method, path, body) {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Airtable request failed (${response.status} ${method} ${path}): ${errorBody}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  return {
    baseId,
    listTables() {
      return request("GET", `/meta/bases/${baseId}/tables`);
    },
    createTable(table) {
      return request("POST", `/meta/bases/${baseId}/tables`, table);
    },
    createField(tableId, field) {
      return request("POST", `/meta/bases/${baseId}/tables/${tableId}/fields`, field);
    },
    listRecords(tableName, filterByFormula) {
      const search = new URLSearchParams();
      if (filterByFormula) {
        search.set("filterByFormula", filterByFormula);
      }
      search.set("pageSize", "100");
      return request(
        "GET",
        `/${baseId}/${encodeURIComponent(tableName)}?${search.toString()}`
      );
    },
    createRecords(tableName, records) {
      return request("POST", `/${baseId}/${encodeURIComponent(tableName)}`, {
        typecast: true,
        records: records.map((fields) => ({ fields }))
      });
    }
  };
}

function formatFieldSpec(field) {
  const formatted = {
    name: field.name,
    type: field.type
  };

  if (field.options) {
    formatted.options = field.options;
  }

  return formatted;
}

async function ensureTables(client, args) {
  const schema = await client.listTables();
  const tableMap = new Map(schema.tables.map((table) => [table.name, table]));
  const summary = [];

  for (const tableSpec of TABLE_SPECS) {
    let table = tableMap.get(tableSpec.name);

    if (!table) {
      if (args.dryRun) {
        summary.push(`Would create table ${tableSpec.name}`);
        continue;
      }

      const created = await client.createTable({
        name: tableSpec.name,
        description: tableSpec.description,
        fields: [
          {
            name: tableSpec.primaryField,
            type: "singleLineText"
          }
        ]
      });

      table = created;
      tableMap.set(table.name, table);
      summary.push(`Created table ${tableSpec.name}`);
    }

    const existingFieldNames = new Set(table.fields.map((field) => field.name));

    for (const fieldSpec of tableSpec.fields) {
      if (existingFieldNames.has(fieldSpec.name)) {
        continue;
      }

      if (args.dryRun) {
        summary.push(`Would create field ${tableSpec.name}.${fieldSpec.name}`);
        continue;
      }

      const createdField = await client.createField(table.id, formatFieldSpec(fieldSpec));
      existingFieldNames.add(createdField.name);
      summary.push(`Created field ${tableSpec.name}.${fieldSpec.name}`);
    }
  }

  return {
    tableMap,
    summary
  };
}

async function seedDefaultCriteriaProfile(client, args) {
  const existing = await client.listRecords("CriteriaProfiles", "{name}='Default Condo MVP'");

  if (existing.records.length > 0) {
    return {
      recordId: existing.records[0].id,
      created: false
    };
  }

  const record = {
    name: "Default Condo MVP",
    enabled: "true",
    source_site: DEFAULT_CRITERIA_PROFILE.sourceSite,
    max_price_sgd: DEFAULT_CRITERIA_PROFILE.maxPriceSgd,
    min_bedrooms: DEFAULT_CRITERIA_PROFILE.minBedrooms,
    min_sqft: DEFAULT_CRITERIA_PROFILE.minSqft,
    districts_json: JSON.stringify(DEFAULT_CRITERIA_PROFILE.districts),
    max_mrt_distance_m: DEFAULT_CRITERIA_PROFILE.maxMrtDistanceM,
    max_mrt_walk_mins: DEFAULT_CRITERIA_PROFILE.maxMrtWalkMins,
    preferred_mrt_stations_json: JSON.stringify(DEFAULT_CRITERIA_PROFILE.preferredMrtStations),
    require_completed: String(DEFAULT_CRITERIA_PROFILE.requireCompleted),
    allowed_tenures_json: JSON.stringify(DEFAULT_CRITERIA_PROFILE.allowedTenures),
    max_drive_minutes_to_ips: DEFAULT_CRITERIA_PROFILE.maxDriveMinutesToIps,
    notes: "Seeded by browser-worker/bootstrap-airtable.mjs"
  };

  if (args.dryRun) {
    return {
      recordId: "dry-run-default-profile",
      created: true
    };
  }

  const created = await client.createRecords("CriteriaProfiles", [record]);
  return {
    recordId: created.records[0].id,
    created: true
  };
}

async function seedSampleBrowserJob(client, args, criteriaProfileId) {
  if (!args.entryUrl) {
    return null;
  }

  const existing = await client.listRecords(
    "BrowserJobs",
    `AND({job_type}='extract_matches', {entry_url}='${args.entryUrl.replace(/'/g, "\\'")}')`
  );

  if (existing.records.length > 0) {
    return {
      recordId: existing.records[0].id,
      created: false
    };
  }

  const jobRecord = {
    name: args.jobName,
    enabled: "true",
    job_type: "extract_matches",
    entry_url: args.entryUrl,
    criteria_profile_id: criteriaProfileId,
    limit: 10,
    max_pages: 2,
    sort_mode: "price_low_to_high",
    prompt: "extract 10 elements that fit our criteria",
    schedule_kind: "manual",
    schedule_value: "",
    next_run_at: "",
    last_run_at: "",
    status: "idle",
    last_error: "",
    include_detail_fields: "true",
    include_agent_phone: "true",
    notes: "Seeded by browser-worker/bootstrap-airtable.mjs"
  };

  if (args.dryRun) {
    return {
      recordId: "dry-run-browser-job",
      created: true
    };
  }

  const created = await client.createRecords("BrowserJobs", [jobRecord]);
  return {
    recordId: created.records[0].id,
    created: true
  };
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const client = createMetadataClient();
  const { summary } = await ensureTables(client, args);
  const profile = await seedDefaultCriteriaProfile(client, args);
  const sampleJob = await seedSampleBrowserJob(client, args, profile.recordId);

  for (const line of summary) {
    console.log(line);
  }

  console.log(
    `${profile.created ? "Created" : "Found"} default criteria profile: ${profile.recordId}`
  );

  if (sampleJob) {
    console.log(`${sampleJob.created ? "Created" : "Found"} sample browser job: ${sampleJob.recordId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
