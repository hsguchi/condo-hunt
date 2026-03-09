#!/usr/bin/env node

import { createAirtableClient } from "./lib/airtable.mjs";
import { loadEnvFiles } from "./lib/env.mjs";

const REQUIRED_STRING_FIELDS = [
  "source_site",
  "source_url",
  "source_listing_id",
  "project_name",
  "address",
  "district",
  "tenure",
  "mrt_station",
  "agent_name",
  "agent_phone",
  "notes",
  "raw_card_json",
  "captured_at"
];

const REQUIRED_NUMBER_FIELDS = [
  "price_sgd",
  "bedrooms",
  "bathrooms",
  "size_sqft",
  "psf",
  "top_year"
];

function readString(fields, name) {
  const value = fields?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(fields, name) {
  const value = fields?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isValidPhone(value) {
  return /^\+65[689]\d{7}$/.test(value);
}

function hasUsableRawPayload(value) {
  if (!value || value.length < 50) {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    return Boolean(readString(parsed, "rawCardText")) && Boolean(readString(parsed, "rawDetailText"));
  } catch {
    return false;
  }
}

function getRecordIssues(record) {
  const fields = record.fields ?? {};
  const issues = [];

  for (const fieldName of REQUIRED_STRING_FIELDS) {
    if (!readString(fields, fieldName)) {
      issues.push(fieldName);
    }
  }

  for (const fieldName of REQUIRED_NUMBER_FIELDS) {
    if (readNumber(fields, fieldName) === null) {
      issues.push(fieldName);
    }
  }

  const phone = readString(fields, "agent_phone");
  if (phone && !isValidPhone(phone)) {
    issues.push("agent_phone_format");
  }

  const matchStatus = readString(fields, "match_status");
  if (matchStatus === "reject") {
    issues.push("match_status");
  }

  const rawCardJson = readString(fields, "raw_card_json");
  if (rawCardJson && !hasUsableRawPayload(rawCardJson)) {
    issues.push("raw_card_json_format");
  }

  return issues;
}

async function main() {
  loadEnvFiles(process.cwd());
  const client = createAirtableClient();
  const records = await client.listExtractedListings();
  const missingFieldCounts = new Map();
  const cleanRecords = [];
  const incompleteRecords = [];
  const byDistrict = new Map();

  for (const record of records) {
    const fields = record.fields ?? {};
    const district = readString(fields, "district") || "UNKNOWN";
    byDistrict.set(district, (byDistrict.get(district) ?? 0) + 1);

    const issues = getRecordIssues(record);

    if (issues.length === 0) {
      cleanRecords.push(record);
      continue;
    }

    incompleteRecords.push({
      id: record.id,
      source_url: readString(fields, "source_url"),
      project_name: readString(fields, "project_name"),
      issues
    });

    for (const issue of issues) {
      missingFieldCounts.set(issue, (missingFieldCounts.get(issue) ?? 0) + 1);
    }
  }

  const sortedMissing = [...missingFieldCounts.entries()].sort((left, right) => right[1] - left[1]);
  const sortedDistricts = [...byDistrict.entries()].sort((left, right) => left[0].localeCompare(right[0]));

  console.log(
    JSON.stringify(
      {
        totalRecords: records.length,
        cleanRecords: cleanRecords.length,
        incompleteRecords: incompleteRecords.length,
        byDistrict: Object.fromEntries(sortedDistricts),
        issueCounts: Object.fromEntries(sortedMissing),
        incompleteSamples: incompleteRecords.slice(0, 10)
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
