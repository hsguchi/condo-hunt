#!/usr/bin/env node

import { createAirtableClient } from "./lib/airtable.mjs";
import { loadEnvFiles } from "./lib/env.mjs";

function parseArgs(argv) {
  const args = {
    jobId: null,
    limit: null,
    maxPages: null,
    enabled: null,
    entryUrl: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--job") {
      args.jobId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      args.limit = Number.isNaN(parsed) ? null : parsed;
      index += 1;
      continue;
    }

    if (arg === "--max-pages") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      args.maxPages = Number.isNaN(parsed) ? null : parsed;
      index += 1;
      continue;
    }

    if (arg === "--enabled") {
      const raw = (argv[index + 1] ?? "").trim().toLowerCase();
      args.enabled = raw === "true" || raw === "1" || raw === "yes";
      index += 1;
      continue;
    }

    if (arg === "--entry-url") {
      args.entryUrl = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (!args.jobId) {
    throw new Error("Usage: node browser-worker/update-browser-job.mjs --job <recordId> [--limit N] [--max-pages N] [--enabled true|false]");
  }

  const fields = {};

  if (typeof args.limit === "number") {
    fields.limit = args.limit;
  }

  if (typeof args.maxPages === "number") {
    fields.max_pages = args.maxPages;
  }

  if (typeof args.enabled === "boolean") {
    fields.enabled = String(args.enabled);
  }

  if (typeof args.entryUrl === "string" && args.entryUrl.trim().length > 0) {
    fields.entry_url = args.entryUrl.trim();
  }

  if (Object.keys(fields).length === 0) {
    throw new Error("No updates requested");
  }

  const client = createAirtableClient();
  const updated = await client.updateBrowserJob(args.jobId, fields);
  console.log(
    JSON.stringify(
      {
        id: updated.id,
        name: updated.fields.name,
        entry_url: updated.fields.entry_url,
        limit: updated.fields.limit,
        max_pages: updated.fields.max_pages,
        enabled: updated.fields.enabled
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
