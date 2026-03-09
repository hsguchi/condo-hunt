#!/usr/bin/env node

import { loadEnvFiles } from "./lib/env.mjs";
import { connectToLocalChrome } from "./lib/propertyguru.mjs";

function parseArgs(argv) {
  const args = {
    url: null,
    durationSeconds: 60
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url") {
      args.url = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--duration") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.durationSeconds = parsed;
      }
      index += 1;
    }
  }

  return args;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhoneish(text) {
  const matches = text.match(/(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}/g) ?? [];
  return [...new Set(matches.map((value) => value.replace(/\s+/g, " ").trim()))];
}

async function collectState(page) {
  const title = await page.title().catch(() => "");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const telLinks = await page
    .locator('a[href^="tel:"]')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        text: element.textContent?.trim() ?? "",
        href: element.getAttribute("href") ?? ""
      }))
    )
    .catch(() => []);

  const contactCandidates = await page
    .locator('button, [role="button"], a')
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const ariaLabel = element.getAttribute("aria-label") ?? "";

          if (!/contact agent|call|phone|whatsapp|show number|reveal/i.test(`${text} ${ariaLabel}`)) {
            return null;
          }

          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);

          return {
            text,
            tag: element.tagName.toLowerCase(),
            href: element instanceof HTMLAnchorElement ? element.href : "",
            ariaLabel,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none",
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            outerHTML: element.outerHTML.slice(0, 300)
          };
        })
        .filter(Boolean)
    )
    .catch(() => []);

  const dialogs = await page
    .locator('[role="dialog"], .modal, [class*="modal"], [data-testid*="modal"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
    )
    .catch(() => []);

  const phoneContainers = await page
    .evaluate(() => {
      const phoneRegex = /(?:\+65[\s-]?)?[689]\d{3}[\s-]?\d{4}/;
      const matched = [];

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let current = walker.nextNode();

      while (current) {
        if (current instanceof HTMLElement) {
          const text = current.innerText?.replace(/\s+/g, " ").trim() ?? "";

          if (text && phoneRegex.test(text)) {
            matched.push({
              tag: current.tagName.toLowerCase(),
              text: text.slice(0, 300),
              outerHTML: current.outerHTML.slice(0, 500)
            });
          }
        }

        current = walker.nextNode();
      }

      return matched.slice(0, 10);
    })
    .catch(() => []);

  const specialNodes = await page
    .evaluate(() => {
      return Array.from(
        document.querySelectorAll(
          '[da-id*="contact"], [da-id*="phone"], [data-testid*="contact"], [class*="contact"], [class*="phone"]'
        )
      )
        .map((element) => {
          if (!(element instanceof HTMLElement)) {
            return null;
          }

          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);

          return {
            tag: element.tagName.toLowerCase(),
            text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 200) ?? "",
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none",
            daId: element.getAttribute("da-id") ?? "",
            className: element.className,
            outerHTML: element.outerHTML.slice(0, 400)
          };
        })
        .filter(Boolean)
        .slice(0, 30);
    })
    .catch(() => []);

  return {
    title,
    telLinks,
    phoneishTexts: normalizePhoneish(bodyText),
    contactCandidates,
    dialogs,
    phoneContainers,
    specialNodes
  };
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    throw new Error("Usage: node browser-worker/watch-detail.mjs --url <listing-url> [--duration 60]");
  }

  const { context } = await connectToLocalChrome(process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222");

  let page =
    context.pages().find((candidate) => candidate.url().startsWith(args.url)) ??
    (await context.newPage());

  if (!page.url().startsWith(args.url)) {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  }

  console.log(`Watching page for ${args.durationSeconds} seconds: ${args.url}`);
  console.log("Interact with the page now in your Chrome window.");

  let previousSerialized = "";
  const deadline = Date.now() + args.durationSeconds * 1000;

  while (Date.now() < deadline) {
    const state = await collectState(page);
    const serialized = JSON.stringify(state);

    if (serialized !== previousSerialized) {
      previousSerialized = serialized;
      console.log(JSON.stringify({ observedAt: new Date().toISOString(), ...state }, null, 2));
    }

    await sleep(1500);
  }

  await page.close().catch(() => {});
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
