#!/usr/bin/env node

import { loadEnvFiles } from "./lib/env.mjs";
import { connectToLocalChrome } from "./lib/propertyguru.mjs";

function parseArgs(argv) {
  const args = {
    urls: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--url") {
      const url = argv[index + 1] ?? null;
      if (url) {
        args.urls.push(url);
      }
      index += 1;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (args.urls.length === 0) {
    throw new Error(
      "Usage: node browser-worker/inspect-search.mjs --url <propertyguru-search-url> [--url <propertyguru-search-url> ...]"
    );
  }

  const { context } = await connectToLocalChrome(process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222");
  const page = await context.newPage();
  const results = [];

  try {
    for (const url of args.urls) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      const summary = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a[href]"))
          .map((anchor) => {
            if (!(anchor instanceof HTMLAnchorElement)) {
              return null;
            }

            const text = anchor.innerText?.replace(/\s+/g, " ").trim() ?? "";
            const ariaLabel = anchor.getAttribute("aria-label") ?? "";
            const rel = anchor.getAttribute("rel") ?? "";
            const className = anchor.className ?? "";

            if (!text && !ariaLabel && !/page|pagination|next|listing/i.test(`${anchor.href} ${className}`)) {
              return null;
            }

            return {
              text,
              href: anchor.href,
              ariaLabel,
              rel,
              className
            };
          })
          .filter(Boolean);

        const buttons = Array.from(document.querySelectorAll("button,[role='button']"))
          .map((button) => {
            if (!(button instanceof HTMLElement)) {
              return null;
            }

            const text = button.innerText?.replace(/\s+/g, " ").trim() ?? "";
            const ariaLabel = button.getAttribute("aria-label") ?? "";
            const className = button.className ?? "";

            if (!/page|pagination|next/i.test(`${text} ${ariaLabel} ${className}`)) {
              return null;
            }

            return {
              text,
              ariaLabel,
              className
            };
          })
          .filter(Boolean);

        return {
          title: document.title,
          url: window.location.href,
          anchors: anchors.slice(0, 200),
          buttons: buttons.slice(0, 50)
        };
      });

      results.push(summary);
    }

    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
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
