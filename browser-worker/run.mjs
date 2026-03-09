#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createAirtableClient } from "./lib/airtable.mjs";
import { DEFAULT_CRITERIA_PROFILE, mergeCriteriaProfile } from "./lib/criteria.mjs";
import { loadEnvFiles, getNumberEnv } from "./lib/env.mjs";
import { connectToLocalChrome, runExtractMatchesJob } from "./lib/propertyguru.mjs";
import { computeNextRunAt, isJobDue } from "./lib/schedule.mjs";

function parseArgs(argv) {
  const args = {
    once: false,
    dryRun: false,
    help: false,
    jobId: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--once") {
      args.once = true;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--job") {
      args.jobId = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Local PropertyGuru browser worker

Usage:
  npm run worker:browser
  npm run worker:browser:once
  npm run worker:browser:once -- --job recXXXXXXXXXXXXXX
  npm run worker:browser:once -- --job recXXXXXXXXXXXXXX --dry-run

Flags:
  --once     Run due jobs once, then exit
  --job ID   Run a specific Airtable BrowserJobs record id
  --dry-run  Skip Airtable writes for runs and extracted listings
  --help     Show this message
`);
}

function createLogger(prefix = "browser-worker") {
  const entries = [];

  return {
    log(message) {
      const timestamped = `[${new Date().toISOString()}] ${prefix}: ${message}`;
      entries.push(timestamped);
      console.log(timestamped);
    },
    excerpt() {
      return entries.slice(-20).join("\n");
    }
  };
}

function serializeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getBrowserSession(sessionRef, cdpUrl) {
  if (
    sessionRef.current &&
    (!sessionRef.current.browser.isConnected || sessionRef.current.browser.isConnected())
  ) {
    return sessionRef.current;
  }

  sessionRef.current = await connectToLocalChrome(cdpUrl);
  return sessionRef.current;
}

async function processJob({
  client,
  context,
  job,
  dryRun,
  artifactDir,
  logger,
  knownSourceUrls
}) {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const runLogger = createLogger(job.name);
  job.runId = runId;

  const criteriaProfile = mergeCriteriaProfile(
    (await client.getCriteriaProfile(job.criteriaProfileId)) ?? DEFAULT_CRITERIA_PROFILE
  );
  const nextRunAt = computeNextRunAt(job, startedAt);
  let browserRunRecord = null;

  logger.log(`Starting job ${job.name} (${job.recordId})`);

  if (!dryRun) {
    browserRunRecord = await client.createBrowserRun({
      run_id: runId,
      job_id: job.recordId,
      job_name: job.name,
      started_at: startedAt.toISOString(),
      status: "running",
      matched_count: 0,
      scanned_count: 0,
      page_count: 0
    });

    await client.updateBrowserJob(job.recordId, {
      status: "running",
      last_error: null
    });
  }

  try {
    if (job.jobType !== "extract_matches") {
      throw new Error(`Unsupported job_type for MVP worker: ${job.jobType}`);
    }

    const result = await runExtractMatchesJob({
      context,
      job,
      criteriaProfile,
      artifactDir,
      knownSourceUrls,
      log: (message) => runLogger.log(message)
    });

    if (!dryRun) {
      const upsertResult = await client.upsertExtractedListings(result.listings);
      result.listings.forEach((listing) => knownSourceUrls.add(listing.source_url));
      await client.updateBrowserRun(browserRunRecord.id, {
        finished_at: new Date().toISOString(),
        status: result.status,
        matched_count: result.listings.length,
        scanned_count: result.scannedCount,
        page_count: result.pageCount,
        screenshot_urls_json: JSON.stringify(result.screenshotPaths),
        log_excerpt: `${runLogger.excerpt()}\ncreated=${upsertResult.created.length} updated=${upsertResult.updated.length}`
      });
      await client.updateBrowserJob(job.recordId, {
        status: "succeeded",
        last_run_at: startedAt.toISOString(),
        next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
        last_error: null
      });
    }

    logger.log(
      `Completed job ${job.name}: ${result.listings.length} matched from ${result.scannedCount} scanned`
    );

    return {
      ok: true,
      matchedCount: result.listings.length
    };
  } catch (error) {
    const message = serializeError(error);
    const screenshotPaths = Array.isArray(error?.screenshotPaths) ? error.screenshotPaths : [];

    if (!dryRun && browserRunRecord) {
      await client.updateBrowserRun(browserRunRecord.id, {
        finished_at: new Date().toISOString(),
        status: "failed",
        error_summary: message,
        screenshot_urls_json: JSON.stringify(screenshotPaths),
        log_excerpt: runLogger.excerpt()
      });
      await client.updateBrowserJob(job.recordId, {
        status: "failed",
        last_run_at: startedAt.toISOString(),
        next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
        last_error: message
      });
    }

    logger.log(`Job ${job.name} failed: ${message}`);
    return {
      ok: false,
      error: message
    };
  }
}

async function processAvailableJobs({ client, args, config, logger, sessionRef }) {
  const loadedJobs = await client.listBrowserJobs({
    jobId: args.jobId
  });
  const dueJobs = args.jobId ? loadedJobs : loadedJobs.filter((job) => isJobDue(job, new Date()));

  if (dueJobs.length === 0) {
    logger.log("No due browser jobs found");
    return {
      processedJobs: 0
    };
  }

  logger.log(`Found ${dueJobs.length} browser job(s) to process`);
  const { context } = await getBrowserSession(sessionRef, config.cdpUrl);
  const knownSourceUrls = args.dryRun ? new Set() : await client.listExtractedListingSourceUrls();
  let processedJobs = 0;

  for (const job of dueJobs) {
    await processJob({
      client,
      context,
      job,
      dryRun: args.dryRun,
      artifactDir: config.artifactDir,
      logger,
      knownSourceUrls
    });
    processedJobs += 1;
  }

  return { processedJobs };
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const logger = createLogger();
  const config = {
    cdpUrl: process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222",
    pollIntervalSeconds: getNumberEnv("BROWSER_WORKER_POLL_INTERVAL_SECONDS", 60),
    artifactDir:
      process.env.BROWSER_WORKER_ARTIFACT_DIR ??
      path.join("/tmp", "condo-hunt-browser-worker"),
    timezone: process.env.BROWSER_WORKER_TIMEZONE ?? "Asia/Singapore"
  };

  await fs.mkdir(config.artifactDir, { recursive: true });
  const client = createAirtableClient();
  const sessionRef = { current: null };

  if (args.once || args.jobId) {
    const result = await processAvailableJobs({
      client,
      args,
      config,
      logger,
      sessionRef
    });

    if (args.jobId && result.processedJobs === 0) {
      throw new Error(`Browser job not found or not runnable: ${args.jobId}`);
    }

    return;
  }

  logger.log(
    `Starting polling loop against ${config.cdpUrl} every ${config.pollIntervalSeconds} seconds`
  );

  while (true) {
    try {
      await processAvailableJobs({
        client,
        args,
        config,
        logger,
        sessionRef
      });
    } catch (error) {
      logger.log(`Polling iteration failed: ${serializeError(error)}`);
    }

    await sleep(config.pollIntervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] browser-worker: ${serializeError(error)}`);
  process.exit(1);
});
