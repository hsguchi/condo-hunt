#!/usr/bin/env node

import { loadEnvFiles } from "./lib/env.mjs";
import { connectToLocalChrome } from "./lib/propertyguru.mjs";

function parseArgs(argv) {
  const args = { url: null };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--url") {
      args.url = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

async function main() {
  loadEnvFiles(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    throw new Error("Usage: node browser-worker/inspect-filters.mjs --url <propertyguru-search-url>");
  }

  const { context } = await connectToLocalChrome(process.env.BROWSER_CDP_URL ?? "http://127.0.0.1:9222");
  const page = await context.newPage();

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const summary = await page.evaluate(() => {
      function isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }

      const keywordRegex =
        /filter|sort|price|bed|bath|size|sqft|area|tenure|completion|furnish|district|mrt|more/i;

      const controls = Array.from(
        document.querySelectorAll("button, a, input, select, [role='button'], [role='combobox']")
      )
        .map((element) => {
          if (!(element instanceof HTMLElement) || !isVisible(element)) {
            return null;
          }

          const text = element.innerText?.replace(/\s+/g, " ").trim() ?? "";
          const ariaLabel = element.getAttribute("aria-label") ?? "";
          const placeholder = element.getAttribute("placeholder") ?? "";
          const role = element.getAttribute("role") ?? "";
          const className = element.className ?? "";
          const dataAttrs = Array.from(element.attributes)
            .filter((attribute) => /^data-|^da-id$/.test(attribute.name))
            .reduce((result, attribute) => {
              result[attribute.name] = attribute.value;
              return result;
            }, {});

          if (!keywordRegex.test(`${text} ${ariaLabel} ${placeholder} ${className}`)) {
            return null;
          }

          return {
            tag: element.tagName.toLowerCase(),
            text,
            ariaLabel,
            placeholder,
            role,
            className,
            id: element.id || "",
            name: element.getAttribute("name") ?? "",
            href: element instanceof HTMLAnchorElement ? element.href : "",
            dataAttrs
          };
        })
        .filter(Boolean);

      return {
        title: document.title,
        url: window.location.href,
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
