#!/usr/bin/env node

import { createAirtableClient } from "./lib/airtable.mjs";
import { loadEnvFiles } from "./lib/env.mjs";

async function main() {
  loadEnvFiles(process.cwd());
  const client = createAirtableClient();
  const deleted = await client.dedupeExtractedListings();
  console.log(`Deleted ${deleted.length} duplicate extracted listing record(s)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
