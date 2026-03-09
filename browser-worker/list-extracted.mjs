#!/usr/bin/env node

import { loadEnvFiles, getRequiredEnv } from "./lib/env.mjs";

const DEFAULT_AIRTABLE_API_URL = "https://api.airtable.com/v0";

function parseArgs(argv) {
  const args = {
    maxRecords: 10,
    full: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--max-records") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.maxRecords = parsed;
      }
      index += 1;
      continue;
    }

    if (arg === "--full") {
      args.full = true;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;
  const tableName = process.env.AIRTABLE_EXTRACTED_LISTINGS_TABLE ?? "ExtractedListings";

  const search = new URLSearchParams();
  search.set("maxRecords", String(args.maxRecords));
  search.set("sort[0][field]", "captured_at");
  search.set("sort[0][direction]", "desc");

  const response = await fetch(
    `${apiUrl}/${baseId}/${encodeURIComponent(tableName)}?${search.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
  }

  const body = await response.json();
  const rows = body.records.map((record) =>
    args.full
      ? {
          id: record.id,
          ...record.fields
        }
      : {
          id: record.id,
          project_name: record.fields.project_name ?? "",
          source_url: record.fields.source_url ?? "",
          agent_name: record.fields.agent_name ?? "",
          agent_phone: record.fields.agent_phone ?? "",
          match_status: record.fields.match_status ?? "",
          captured_at: record.fields.captured_at ?? ""
        }
  );

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
