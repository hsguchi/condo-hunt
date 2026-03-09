#!/usr/bin/env node

import { loadEnvFiles, getRequiredEnv } from "./lib/env.mjs";

const DEFAULT_AIRTABLE_API_URL = "https://api.airtable.com/v0";

const FILTERED_JOB_SPECS = [
  {
    name: "D5 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/condo-for-sale/in-buona-vista-west-coast-clementi-new-town-d05/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "D10 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/condo-for-sale/in-tanglin-holland-bukit-timah-d10/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "D21 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/condo-for-sale/in-clementi-park-upper-bukit-timah-d21/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "Clementi MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/condo-for-sale/near-ew23-clementi-mrt-station-74/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "Buona Vista MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/condo-for-sale/near-ew21-buona-vista-mrt-station-68/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "One-North MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/apartment-condo-for-sale/near-cc23-one-north-mrt-station-1658/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "Haw Par Villa MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/apartment-condo-for-sale/near-cc25-haw-par-villa-mrt-station-1664/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "Beauty World MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/apartment-condo-for-sale/near-dt5-beauty-world-mrt-station-2027/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  },
  {
    name: "Tan Kah Kee MRT 2BR exact",
    entry_url:
      "https://www.propertyguru.com.sg/apartment-condo-for-sale/near-dt8-tan-kah-kee-mrt-station-2018/with-2-bedrooms?maxPrice=1500000&minSize=900",
    limit: 20,
    max_pages: 10
  }
];

async function request(method, path, body) {
  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;
  const response = await fetch(`${apiUrl}/${baseId}/${encodeURIComponent(path)}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function listRecords(tableName, filterByFormula) {
  const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
  const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
  const apiUrl = process.env.AIRTABLE_API_URL ?? DEFAULT_AIRTABLE_API_URL;
  const search = new URLSearchParams();
  search.set("pageSize", "100");
  if (filterByFormula) {
    search.set("filterByFormula", filterByFormula);
  }
  const response = await fetch(
    `${apiUrl}/${baseId}/${encodeURIComponent(tableName)}?${search.toString()}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function createRecords(tableName, records) {
  return request("POST", tableName, {
    typecast: true,
    records: records.map((fields) => ({ fields }))
  });
}

async function main() {
  loadEnvFiles(process.cwd());
  const browserJobsTable = process.env.AIRTABLE_BROWSER_JOBS_TABLE ?? "BrowserJobs";
  const criteriaTable = process.env.AIRTABLE_CRITERIA_PROFILES_TABLE ?? "CriteriaProfiles";
  const criteria = await listRecords(criteriaTable, "{name}='Default Condo MVP'");
  const criteriaProfileId = criteria.records[0]?.id;

  if (!criteriaProfileId) {
    throw new Error("Default Condo MVP criteria profile not found");
  }

  const existing = await listRecords(browserJobsTable);
  const existingByName = new Map(existing.records.map((record) => [record.fields.name, record]));
  const toCreate = [];

  for (const job of FILTERED_JOB_SPECS) {
    if (existingByName.has(job.name)) {
      continue;
    }

    toCreate.push({
      name: job.name,
      enabled: "true",
      job_type: "extract_matches",
      entry_url: job.entry_url,
      criteria_profile_id: criteriaProfileId,
      limit: job.limit,
      max_pages: job.max_pages,
      sort_mode: "price_low_to_high",
      prompt: `extract ${job.limit} elements that fit our criteria`,
      schedule_kind: "manual",
      schedule_value: "",
      next_run_at: "",
      last_run_at: "",
      status: "idle",
      last_error: "",
      include_detail_fields: "true",
      include_agent_phone: "true",
      notes:
        "Seeded by browser-worker/seed-browser-jobs.mjs with PropertyGuru site-side 2BR, price, and minSize filters"
    });
  }

  if (toCreate.length === 0) {
    console.log("No new browser jobs needed");
    return;
  }

  const created = await createRecords(browserJobsTable, toCreate);
  console.log(`Created ${created.records.length} browser job(s)`);
  for (const record of created.records) {
    console.log(`${record.fields.name}: ${record.id}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
