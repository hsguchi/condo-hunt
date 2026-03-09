#!/usr/bin/env node

import { loadEnvFiles } from "./lib/env.mjs";
import { connectToLocalChrome } from "./lib/propertyguru.mjs";

function parseArgs(argv) {
  const args = {
    url: null,
    daId: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--url") {
      args.url = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argv[index] === "--da-id") {
      args.daId = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (!args.url || !args.daId) {
    throw new Error(
      "Usage: node browser-worker/inspect-filter-dialog.mjs --url <search-url> --da-id <filter-da-id>"
    );
  }

  const { context } = await connectToLocalChrome(process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222");
  const page = await context.newPage();

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const trigger = page.locator(`[da-id="${args.daId}"]`).first();
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ force: true, timeout: 5_000 });
    await page.waitForTimeout(1_000);

    const summary = await page.evaluate(() => {
      function isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }

      const visibleRoots = Array.from(
        document.querySelectorAll("[role='dialog'], .modal, [class*='popover'], [class*='dropdown'], [class*='sheet']")
      )
        .filter((element) => element instanceof HTMLElement && isVisible(element))
        .slice(0, 10);

      const controls = visibleRoots.flatMap((root) =>
        Array.from(root.querySelectorAll("button, a, input, select, label, [role='button'], [role='option']"))
          .map((element) => {
            if (!(element instanceof HTMLElement) || !isVisible(element)) {
              return null;
            }

            return {
              tag: element.tagName.toLowerCase(),
              text: element.innerText?.replace(/\s+/g, " ").trim() ?? "",
              ariaLabel: element.getAttribute("aria-label") ?? "",
              placeholder: element.getAttribute("placeholder") ?? "",
              role: element.getAttribute("role") ?? "",
              className: element.className ?? "",
              id: element.id || "",
              name: element.getAttribute("name") ?? "",
              value: "value" in element ? element.value ?? "" : "",
              daId: element.getAttribute("da-id") ?? ""
            };
          })
          .filter(Boolean)
      );

      return {
        title: document.title,
        url: window.location.href,
        visibleRoots: visibleRoots.map((root) => ({
          tag: root.tagName.toLowerCase(),
          className: root.className ?? "",
          text: root.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) ?? ""
        })),
        controls
      };
    });

    console.log(JSON.stringify(summary, null, 2));
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
