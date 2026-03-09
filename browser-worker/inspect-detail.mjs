#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvFiles } from "./lib/env.mjs";
import { connectToLocalChrome } from "./lib/propertyguru.mjs";

function parseArgs(argv) {
  const args = {
    url: null,
    clickContact: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url") {
      args.url = argv[index + 1] ?? null;
      index += 1;
    }

    if (arg === "--click-contact") {
      args.clickContact = true;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    throw new Error("Usage: node browser-worker/inspect-detail.mjs --url <propertyguru-listing-url>");
  }

  const artifactDir =
    process.env.BROWSER_WORKER_ARTIFACT_DIR ?? path.join("/tmp", "condo-hunt-browser-worker");
  await fs.mkdir(artifactDir, { recursive: true });

  const { context } = await connectToLocalChrome(process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222");
  const page = await context.newPage();

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const title = await page.title();
    const h1 = await page.locator("h1").first().textContent().catch(() => "");
    const telLinks = await page
      .locator('a[href^="tel:"]')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent?.trim() ?? "",
          href: element.getAttribute("href") ?? ""
        }))
      )
      .catch(() => []);

    const buttons = await page
      .locator('button, [role="button"], a')
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
            href: element instanceof HTMLAnchorElement ? element.href : "",
            ariaLabel: element.getAttribute("aria-label") ?? ""
          }))
          .filter((entry) => entry.text || entry.href || entry.ariaLabel)
      )
      .catch(() => []);

    const phoneishTexts = await page
      .locator("body")
      .innerText()
      .then((text) => {
        const matches = text.match(/(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}/g) ?? [];
        return [...new Set(matches)];
      })
      .catch(() => []);

    const contactCandidates = await page
      .locator('button, [role="button"], a')
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
            if (!/contact agent/i.test(text)) {
              return null;
            }

            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);

            return {
              text,
              tag: element.tagName.toLowerCase(),
              href: element instanceof HTMLAnchorElement ? element.href : "",
              ariaLabel: element.getAttribute("aria-label") ?? "",
              visible:
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none",
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              outerHTML: element.outerHTML.slice(0, 400)
            };
          })
          .filter(Boolean)
      )
      .catch(() => []);

    if (args.clickContact) {
      const visibleContactLocator = page
        .locator('button, [role="button"], a')
        .filter({ hasText: /contact agent/i })
        .locator(":visible")
        .first();

      if (await visibleContactLocator.count()) {
        await visibleContactLocator.scrollIntoViewIfNeeded().catch(() => {});
        await visibleContactLocator.click({ timeout: 5_000, force: true }).catch(() => {});
        await page.waitForTimeout(2_000);
      }
    }

    const postClickTelLinks = await page
      .locator('a[href^="tel:"]')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent?.trim() ?? "",
          href: element.getAttribute("href") ?? ""
        }))
      )
      .catch(() => []);

    const postClickPhoneishTexts = await page
      .locator("body")
      .innerText()
      .then((text) => {
        const matches = text.match(/(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}/g) ?? [];
        return [...new Set(matches)];
      })
      .catch(() => []);

    const postClickDialogs = await page
      .locator('[role="dialog"], .modal, [data-testid*="modal"], [class*="modal"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean)
      )
      .catch(() => []);

    const screenshotPath = path.join(
      artifactDir,
      `inspect-detail-${new Date().toISOString().replace(/[:.]/g, "-")}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const relevantButtons = buttons.filter((entry) =>
      /phone|contact|call|show|agent|whatsapp/i.test(
        `${entry.text} ${entry.ariaLabel} ${entry.href}`
      )
    );

    console.log(
      JSON.stringify(
        {
          title,
          h1,
          telLinks,
          phoneishTexts,
          contactCandidates,
          postClickTelLinks,
          postClickPhoneishTexts,
          postClickDialogs,
          relevantButtons: relevantButtons.slice(0, 50),
          screenshotPath
        },
        null,
        2
      )
    );
  } finally {
    await page.close().catch(() => {});
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
