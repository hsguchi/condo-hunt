import fs from "node:fs/promises";
import path from "node:path";
import { evaluateListingAgainstProfile } from "./criteria.mjs";

function normalizeWhitespace(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function truncateText(value, maxLength = 1000) {
  const normalized = normalizeWhitespace(value);

  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function canonicalizeListingUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return String(value ?? "");
  }
}

function digitsOnly(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizePhone(phone) {
  const digits = digitsOnly(phone);

  if (digits.length === 8 && /^[689]/.test(digits)) {
    return `+65${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("65")) {
    return `+${digits}`;
  }

  return normalizeWhitespace(phone);
}

function extractCurrency(text) {
  const match = text.match(/S?\$\s*([\d,]+)/i);
  return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
}

function extractDecimalWithKeyword(text, keywordPattern) {
  const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${keywordPattern})`, "i");
  const match = text.match(regex);
  return match ? Number.parseFloat(match[1]) : null;
}

function extractSizeSqft(text) {
  const match = text.match(/([\d,]+)\s*(?:sq\s*ft|sqft|ft²)/i);
  return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
}

function extractPsf(text) {
  const match = text.match(/\$?\s*([\d,]+)\s*psf/i);
  return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
}

function extractDistrict(text, sourceUrl) {
  const textMatch = text.match(/(?:district\s*|(?:^|\W)d)(\d{1,2})(?:\W|$)/i);

  if (textMatch) {
    return `D${Number.parseInt(textMatch[1], 10)}`;
  }

  const urlMatch = sourceUrl.match(/-d0?(\d{1,2})(?:\b|\/|$)/i);
  if (urlMatch) {
    return `D${Number.parseInt(urlMatch[1], 10)}`;
  }

  return "";
}

function extractSection(text, startPattern, endPattern) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return "";
  }

  const startMatch = normalized.match(startPattern);

  if (!startMatch || startMatch.index === undefined) {
    return "";
  }

  const startIndex = startMatch.index;
  const searchStart = startIndex + startMatch[0].length;
  const remainder = normalized.slice(searchStart);
  const endMatch = remainder.match(endPattern);
  const endIndex = endMatch?.index ?? remainder.length;

  return normalizeWhitespace(normalized.slice(startIndex, searchStart + endIndex));
}

function cleanStationCandidate(value) {
  const candidate = normalizeWhitespace(value).replace(/^(Nearest MRT Stations?|MRT Station)\s+/i, "");

  if (!candidate) {
    return "";
  }

  if (candidate.split(/\s+/).length > 3) {
    return "";
  }

  if (
    /\b(?:nearest|saved|places|show|more|what's|nearby|share|report|shortlist|hide|station)\b/i.test(
      candidate
    )
  ) {
    return "";
  }

  return candidate;
}

function extractMrtInfo(text) {
  const normalized = normalizeWhitespace(text);
  const nearbySection = extractSection(
    normalized,
    /Nearest MRT Stations?/i,
    /Nearest Schools|Hide Report|Shortlist|Share|Contact Agent|WhatsApp/i
  );
  const walkMatch =
    nearbySection.match(/(\d+)\s*(?:min|mins|minute|minutes)\s*walk(?:\s+to)?\s*(?:[A-Za-z' -]{0,30})?\s*MRT/i) ??
    normalized.match(/(\d+)\s*(?:min|mins|minute|minutes)\s*walk(?:\s+to)?\s*(?:[A-Za-z' -]{0,30})?\s*MRT/i) ??
    normalized.match(/(\d+)\s*(?:min|mins|minute|minutes)\s*walk/i);
  const meterMatch =
    nearbySection.match(
      /\b(\d{2,4})\s*m(?:eters?)?(?:(?:\s+walk)?\s+(?:to|from))?(?:\s+[A-Za-z' -]{0,30})?\s*MRT(?: Station)?\b/i
    ) ??
    normalized.match(
      /\b(\d{2,4})\s*m(?:eters?)?(?:(?:\s+walk)?\s+(?:to|from))?(?:\s+[A-Za-z' -]{0,30})?\s*MRT(?: Station)?\b/i
    );
  const kmMatch =
    nearbySection.match(
      /\b(\d+(?:\.\d+)?)\s*km(?:(?:\s+walk)?\s+(?:to|from))?(?:\s+[A-Za-z' -]{0,30})?\s*MRT(?: Station)?\b/i
    ) ??
    normalized.match(
      /\b(\d+(?:\.\d+)?)\s*km(?:(?:\s+walk)?\s+(?:to|from))?(?:\s+[A-Za-z' -]{0,30})?\s*MRT(?: Station)?\b/i
    );
  const stationMatches = [
    ...nearbySection.matchAll(/(?:[A-Z]{2}\d{1,2}\s+)?([A-Za-z][A-Za-z' -]{1,30}?)\s+MRT Station/gi),
    ...normalized.matchAll(/(?:[A-Z]{2}\d{1,2}\s+)?([A-Za-z][A-Za-z' -]{1,30}?)\s+MRT Station/gi)
  ]
    .map((match) => cleanStationCandidate(match[1]))
    .filter(Boolean);
  const mrtDistanceM = meterMatch
    ? Number.parseInt(meterMatch[1], 10)
    : kmMatch
      ? Math.round(Number.parseFloat(kmMatch[1]) * 1000)
      : null;

  return {
    mrtWalkMins: walkMatch ? Number.parseInt(walkMatch[1], 10) : null,
    mrtDistanceM:
      typeof mrtDistanceM === "number" && Number.isFinite(mrtDistanceM) && mrtDistanceM <= 5000
        ? mrtDistanceM
        : null,
    mrtStation: stationMatches[0] ?? ""
  };
}

function extractTopYear(text) {
  const normalized = normalizeWhitespace(text);
  const match = normalized.match(
    /\b(?:top|completed|completion|built)\b(?:\s+in|\s+on|\s*[:\-])?\s*(?:[A-Za-z]{3,9}\s+)?(19\d{2}|20\d{2})/i
  );
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractTenure(text) {
  const match = text.match(/\b(freehold|99-year|999-year|103-year|leasehold)\b/i);
  return match ? normalizeWhitespace(match[1]) : "";
}

function extractListedDate(text) {
  const match = text.match(
    /\b(?:today|yesterday|\d+\s*(?:day|days|week|weeks|month|months)\s*ago|listed on [^\n.]+)/i
  );
  return match ? normalizeWhitespace(match[0]) : "";
}

function extractAddress(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  return (
    lines.find(
      (line) =>
        /\d/.test(line) &&
        /road|avenue|drive|crescent|street|way|lane|close|walk|rise|place|terrace|view|hill|heights|link|boulevard|quay|park|garden|gardens|grove|court|mount/i.test(
          line
        )
    ) ?? ""
  );
}

function extractDescription(text) {
  const section = extractSection(
    text,
    /About this property/i,
    /See more|What's nearby|Saved Places|Common facilities|Amenities|Affordability/i
  );

  return section ? section.replace(/^About this property\s*/i, "").trim() : "";
}

function extractPropertyDetails(text) {
  const section = extractSection(
    text,
    /Property details/i,
    /About this property|Check affordability|What's nearby/i
  );

  return section ? section.replace(/^Property details\s*/i, "").trim() : "";
}

function extractNearbyText(text) {
  return extractSection(
    text,
    /Nearest MRT Stations?/i,
    /Nearest Schools|Hide Report|Shortlist|Share|Contact Agent|WhatsApp/i
  );
}

function extractPhoneFromText(text) {
  const match = text.match(/(?:\+65[\s-]?)?([689]\d{3}[\s-]?\d{4})\b/);
  return match ? normalizePhone(match[0]) : "";
}

function extractAgentName(text) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return "";
  }

  const stopPatterns = [
    /\bHUTTONS\b/i,
    /\bCEA\b/i,
    /\bL\d{4,}\b/i,
    /\bR\d{4,}\b/i
  ];

  let cutoff = normalized.length;

  for (const pattern of stopPatterns) {
    const match = normalized.match(pattern);
    if (match?.index !== undefined) {
      cutoff = Math.min(cutoff, match.index);
    }
  }

  return normalized.slice(0, cutoff).trim();
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function extractAgentNameFromHref(href) {
  if (!href) {
    return "";
  }

  const match = href.match(/\/agent\/([a-z0-9-]+)-\d+/i);

  if (!match) {
    return "";
  }

  const slug = match[1]
    .replace(/-/g, " ")
    .replace(/\b([a-z])\b/g, (_, char) => char.toUpperCase());

  return toTitleCase(slug);
}

function parseListingId(sourceUrl) {
  const match = canonicalizeListingUrl(sourceUrl).match(/(\d{6,})$/);
  return match ? match[1] : "";
}

function computePsf(price, sizeSqft) {
  if (!price || !sizeSqft) {
    return null;
  }

  return Math.round(price / sizeSqft);
}

function parseSearchFilterHints(searchUrl) {
  try {
    const url = new URL(searchUrl);
    const pathname = url.pathname;
    const minBedroomsMatch = pathname.match(/with-(\d+(?:\.\d+)?)-bedrooms?/i);
    const minSizePathMatch = pathname.match(/above-(\d+)-sqft/i);
    const maxPrice = Number.parseInt(url.searchParams.get("maxPrice") ?? "", 10);
    const minSizeQuery = Number.parseInt(url.searchParams.get("minSize") ?? "", 10);

    return {
      minBedrooms: minBedroomsMatch ? Number.parseFloat(minBedroomsMatch[1]) : null,
      maxPriceSgd: Number.isFinite(maxPrice) ? maxPrice : null,
      minSizeSqft: Number.isFinite(minSizeQuery)
        ? minSizeQuery
        : minSizePathMatch
          ? Number.parseInt(minSizePathMatch[1], 10)
          : null
    };
  } catch {
    return {
      minBedrooms: null,
      maxPriceSgd: null,
      minSizeSqft: null
    };
  }
}

function passesSeedHardFilters(listing, criteriaProfile, searchUrl) {
  const filterHints = parseSearchFilterHints(searchUrl);
  const price = safeNumber(listing.price);
  const bedrooms = safeNumber(listing.bedrooms);
  const sizeSqft = safeNumber(listing.sizeSqft);

  if (price !== null) {
    if (price > criteriaProfile.maxPriceSgd) {
      return false;
    }
  } else if (
    filterHints.maxPriceSgd === null ||
    filterHints.maxPriceSgd > criteriaProfile.maxPriceSgd
  ) {
    return false;
  }

  if (bedrooms !== null) {
    if (bedrooms < criteriaProfile.minBedrooms) {
      return false;
    }
  } else if (
    filterHints.minBedrooms === null ||
    filterHints.minBedrooms < criteriaProfile.minBedrooms
  ) {
    return false;
  }

  if (sizeSqft !== null) {
    if (sizeSqft < criteriaProfile.minSqft) {
      return false;
    }
  } else if (
    filterHints.minSizeSqft === null ||
    filterHints.minSizeSqft < criteriaProfile.minSqft
  ) {
    return false;
  }

  return true;
}

function buildListingFromText(raw, fallbackSourceUrl, fallbackProjectName = "") {
  const text = normalizeWhitespace(raw.cardText ?? raw.bodyText ?? "");
  const mrtInfo = extractMrtInfo(text);
  const price = extractCurrency(text);
  const sizeSqft = extractSizeSqft(text);
  const psf = extractPsf(text) ?? computePsf(price, sizeSqft);
  const sourceUrl = canonicalizeListingUrl(raw.sourceUrl ?? fallbackSourceUrl);
  const districtContextUrl = canonicalizeListingUrl(raw.districtContextUrl ?? sourceUrl);

  return {
    sourceSite: "propertyguru.com.sg",
    sourceUrl,
    sourceListingId: raw.sourceListingId ?? parseListingId(sourceUrl),
    projectName: normalizeWhitespace(raw.projectName) || fallbackProjectName,
    address: normalizeWhitespace(raw.address) || extractAddress(raw.bodyText ?? raw.cardText ?? ""),
    district: normalizeWhitespace(raw.district) || extractDistrict(text, districtContextUrl),
    price,
    bedrooms: extractDecimalWithKeyword(text, "bed(?:room)?s?|br"),
    bathrooms: extractDecimalWithKeyword(text, "bath(?:room)?s?"),
    sizeSqft,
    psf,
    tenure: normalizeWhitespace(raw.tenure) || extractTenure(text),
    topYear: raw.topYear ?? extractTopYear(text),
    mrtStation: normalizeWhitespace(raw.mrtStation) || mrtInfo.mrtStation,
    mrtWalkMins: raw.mrtWalkMins ?? mrtInfo.mrtWalkMins,
    mrtDistanceM: raw.mrtDistanceM ?? mrtInfo.mrtDistanceM,
    ipsDriveMins: raw.ipsDriveMins ?? null,
    agentName: normalizeWhitespace(raw.agentName),
    agentPhone: normalizePhone(raw.agentPhone),
    listedDate: normalizeWhitespace(raw.listedDate) || extractListedDate(raw.bodyText ?? raw.cardText ?? ""),
    notes: truncateText(raw.notes, 600),
    rawCardText: truncateText(raw.cardText, 1200),
    rawDetailText: truncateText(raw.bodyText, 2000)
  };
}

function mergeListingData(baseListing, detailListing) {
  return {
    ...baseListing,
    ...Object.fromEntries(
      Object.entries(detailListing).filter(([, value]) => {
        if (value === null || value === undefined) {
          return false;
        }

        if (typeof value === "string") {
          return value.trim().length > 0;
        }

        return true;
      })
    ),
    price: safeNumber(detailListing.price) ?? safeNumber(baseListing.price),
    bedrooms: safeNumber(detailListing.bedrooms) ?? safeNumber(baseListing.bedrooms),
    bathrooms: safeNumber(detailListing.bathrooms) ?? safeNumber(baseListing.bathrooms),
    sizeSqft: safeNumber(detailListing.sizeSqft) ?? safeNumber(baseListing.sizeSqft),
    psf: safeNumber(detailListing.psf) ?? safeNumber(baseListing.psf),
    topYear: safeNumber(detailListing.topYear) ?? safeNumber(baseListing.topYear),
    mrtWalkMins: safeNumber(detailListing.mrtWalkMins) ?? safeNumber(baseListing.mrtWalkMins),
    mrtDistanceM: safeNumber(detailListing.mrtDistanceM) ?? safeNumber(baseListing.mrtDistanceM),
    ipsDriveMins: safeNumber(detailListing.ipsDriveMins) ?? safeNumber(baseListing.ipsDriveMins)
  };
}

function getStorageCompletenessIssues(listing, job) {
  const missing = [];

  const requiredStrings = [
    ["sourceUrl", "source_url"],
    ["sourceListingId", "source_listing_id"],
    ["projectName", "project_name"],
    ["address", "address"],
    ["district", "district"],
    ["tenure", "tenure"],
    ["mrtStation", "mrt_station"],
    ["agentName", "agent_name"],
    ["notes", "notes"],
    ["rawCardText", "raw_card_json"]
  ];

  for (const [key, label] of requiredStrings) {
    if (!normalizeWhitespace(listing[key])) {
      missing.push(label);
    }
  }

  const requiredNumbers = [
    ["price", "price_sgd"],
    ["bedrooms", "bedrooms"],
    ["bathrooms", "bathrooms"],
    ["sizeSqft", "size_sqft"],
    ["psf", "psf"],
    ["topYear", "top_year"]
  ];

  for (const [key, label] of requiredNumbers) {
    if (!safeNumber(listing[key])) {
      missing.push(label);
    }
  }

  if (job.includeAgentPhone && !normalizePhone(listing.agentPhone)) {
    missing.push("agent_phone");
  }

  return missing;
}

async function ensurePropertyGuruPage(page, url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      const title = await page.title().catch(() => "");
      const bodyText = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
      const combined = `${title}\n${bodyText}`;

      if (/just a moment|security verification|cloudflare/i.test(combined)) {
        throw new Error("PropertyGuru blocked the browser session with a security verification page");
      }

      return bodyText;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        /ERR_ABORTED|frame was detached|Target page, context or browser has been closed/i.test(message);

      if (!isRetryable || attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(1_000).catch(() => {});
    }
  }

  throw lastError;
}

async function extractSearchCardSeeds(page) {
  return page.evaluate(() => {
    function canonicalize(urlString) {
      try {
        const url = new URL(urlString);
        url.hash = "";
        return url.toString();
      } catch {
        return urlString;
      }
    }

    function isVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }

    function pickContainer(anchor) {
      let node = anchor;
      let candidate = anchor;

      for (let depth = 0; depth < 8 && node.parentElement; depth += 1) {
        node = node.parentElement;
        const text = node.innerText?.trim() ?? "";

        if (text.length >= 50 && text.length <= 2400) {
          candidate = node;
        }

        if (/\$/.test(text) && /(sq\s*ft|sqft|bed|bath)/i.test(text)) {
          candidate = node;
          break;
        }
      }

      return candidate;
    }

    const seen = new Map();

    for (const anchor of document.querySelectorAll('a[href*="/listing/"]')) {
      if (!(anchor instanceof HTMLAnchorElement) || !isVisible(anchor)) {
        continue;
      }

      const href = canonicalize(anchor.href);
      if (!href || !/\/listing\//.test(href)) {
        continue;
      }

      const container = pickContainer(anchor);
      const cardText = container.innerText?.trim() ?? "";
      const projectName = anchor.innerText?.trim() ?? "";
      const existing = seen.get(href);

      if (!existing || cardText.length > existing.cardText.length) {
        seen.set(href, {
          sourceUrl: href,
          projectName,
          cardText
        });
      }
    }

    return [...seen.values()];
  });
}

async function getNextPageUrl(page) {
  return page.evaluate(() => {
    function isVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }

    function canonicalize(urlString) {
      try {
        const url = new URL(urlString);
        url.hash = "";
        return url.toString();
      } catch {
        return urlString;
      }
    }

    const activePage =
      Array.from(document.querySelectorAll(".page-item.active .page-link, .page-link.active, [aria-current='page']"))
        .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .find(Boolean) ?? "";

    const firstListingUrl = Array.from(document.querySelectorAll('a[href*="/listing/"]'))
      .find((anchor) => anchor instanceof HTMLAnchorElement && isVisible(anchor))
      ?.href;

    return {
      activePage,
      firstListingUrl: firstListingUrl ? canonicalize(firstListingUrl) : "",
      url: canonicalize(window.location.href)
    };
  });
}

async function advanceSearchResultsPage(page) {
  const before = await getNextPageUrl(page);
  const nextLocator = page.locator("a.page-link, button.page-link").filter({ hasText: /^Next$/i }).first();
  let clicked = false;

  if (await nextLocator.count()) {
    await nextLocator.scrollIntoViewIfNeeded().catch(() => {});
    await nextLocator.click({ force: true, timeout: 5_000 }).catch(() => {});
    clicked = true;
  } else if (before.activePage) {
    const nextPageNumber = Number.parseInt(before.activePage, 10) + 1;
    const numericLocator = page
      .locator("a.page-link, button.page-link")
      .filter({ hasText: new RegExp(`^${nextPageNumber}$`) })
      .first();

    if (await numericLocator.count()) {
      await numericLocator.scrollIntoViewIfNeeded().catch(() => {});
      await numericLocator.click({ force: true, timeout: 5_000 }).catch(() => {});
      clicked = true;
    }
  }

  if (!clicked) {
    return null;
  }

  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page
    .waitForFunction(
      (previous) => {
        function isVisible(element) {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        }

        function canonicalize(urlString) {
          try {
            const url = new URL(urlString);
            url.hash = "";
            return url.toString();
          } catch {
            return urlString;
          }
        }

        const activePage =
          Array.from(
            document.querySelectorAll(".page-item.active .page-link, .page-link.active, [aria-current='page']")
          )
            .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
            .find(Boolean) ?? "";
        const firstListingUrl = Array.from(document.querySelectorAll('a[href*="/listing/"]'))
          .find((anchor) => anchor instanceof HTMLAnchorElement && isVisible(anchor))
          ?.href;

        return (
          activePage !== previous.activePage ||
          canonicalize(firstListingUrl ?? "") !== previous.firstListingUrl
        );
      },
      before,
      { timeout: 10_000 }
    )
    .catch(() => {});

  const after = await getNextPageUrl(page);

  if (
    after.activePage === before.activePage &&
    after.firstListingUrl === before.firstListingUrl
  ) {
    return null;
  }

  return after;
}

async function captureScreenshot(page, artifactDir, prefix) {
  await fs.mkdir(artifactDir, { recursive: true });
  const filename = `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  const absolutePath = path.join(artifactDir, filename);

  await page.screenshot({
    path: absolutePath,
    fullPage: true
  });

  return absolutePath;
}

async function revealAgentPhone(page) {
  const telLocator = page.locator('a[href^="tel:"]').first();

  if (await telLocator.count()) {
    return true;
  }

  const dropdownLocator = page.locator('[da-id="other-enquiry-dropdown"]').locator(":visible").first();

  if (await dropdownLocator.count()) {
    const dropdownText = normalizeWhitespace(
      await dropdownLocator.textContent().catch(() => "")
    ).toLowerCase();

    if (dropdownText.includes("other ways to enquire")) {
      await dropdownLocator.scrollIntoViewIfNeeded().catch(() => {});
      await dropdownLocator.click({ force: true, timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(1_500);
    }
  }

  if (await telLocator.count()) {
    return true;
  }

  const phoneButton = page.locator('[da-id="enquiry-widget-phone-btn"]').locator(":visible").first();

  if (await phoneButton.count()) {
    await phoneButton.scrollIntoViewIfNeeded().catch(() => {});
    await phoneButton.click({ force: true, timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_500);
  }

  if (await telLocator.count()) {
    return true;
  }

  await page
    .waitForFunction(
      () => Boolean(document.querySelector('a[href^="tel:"]')),
      undefined,
      { timeout: 4_000 }
    )
    .catch(() => {});

  return (await telLocator.count()) > 0;
}

async function extractDetailListing(page, sourceUrl) {
  const bodyText = await ensurePropertyGuruPage(page, sourceUrl);
  await revealAgentPhone(page).catch(() => {});
  const heading = normalizeWhitespace(
    await page.locator('[da-id="property-title"], h1').first().textContent({ timeout: 5_000 }).catch(() => "")
  );
  const addressText = normalizeWhitespace(
    await page
      .locator('[da-id="property-address"]')
      .first()
      .textContent({ timeout: 3_000 })
      .catch(() => "")
  );
  const agentCardText = normalizeWhitespace(
    await page
      .locator('.agent-section-desktop [da-id="contact-agent-card"] a[href*="/agent/"]')
      .first()
      .innerText({ timeout: 3_000 })
      .catch(() => "")
  );
  const agentLinkHref = await page
    .locator('.agent-section-desktop [da-id="contact-agent-card"] a[href*="/agent/"]')
    .first()
    .getAttribute("href", { timeout: 3_000 })
    .catch(() => "");
  const snapshotText = normalizeWhitespace(
    await page
      .locator('[da-id="property-snapshot-info"]')
      .first()
      .innerText({ timeout: 3_000 })
      .catch(() => "")
  );
  const phoneCardText = normalizeWhitespace(
    await page
      .locator(".contact-card-root")
      .filter({ hasText: /phone number/i })
      .first()
      .innerText({ timeout: 3_000 })
      .catch(() => "")
  );
  const telHref = await page
    .locator('a[href^="tel:"]')
    .first()
    .getAttribute("href", { timeout: 3_000 })
    .catch(() => "");
  const telText = normalizeWhitespace(
    await page.locator('a[href^="tel:"]').first().textContent({ timeout: 3_000 }).catch(() => "")
  );
  const detailText = normalizeWhitespace(bodyText);
  const propertyDetailsText = extractPropertyDetails(detailText);
  const descriptionText = extractDescription(detailText);
  const nearbyText = extractNearbyText(detailText);
  const targetedText = [snapshotText, propertyDetailsText, descriptionText, nearbyText]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join("\n");
  const phoneCandidate = normalizePhone(
    telHref?.replace(/^tel:/i, "") || telText || extractPhoneFromText(phoneCardText)
  );

  return buildListingFromText(
    {
      sourceUrl,
      projectName: heading,
      address: addressText,
      bodyText: targetedText,
      notes: descriptionText,
      agentName: extractAgentNameFromHref(agentLinkHref) || extractAgentName(agentCardText),
      agentPhone: phoneCandidate
    },
    sourceUrl,
    heading
  );
}

function formatListingRecord(listing, job, criteriaProfile, decision) {
  const capturedAt = new Date().toISOString();

  return {
    job_id: job.recordId,
    run_id: job.runId,
    source_site: listing.sourceSite,
    source_url: listing.sourceUrl,
    source_listing_id: listing.sourceListingId || null,
    project_name: listing.projectName || null,
    address: listing.address || null,
    district: listing.district || null,
    price_sgd: listing.price ?? null,
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    size_sqft: listing.sizeSqft ?? null,
    psf: listing.psf ?? null,
    tenure: listing.tenure || null,
    top_year: listing.topYear ?? null,
    mrt_station: listing.mrtStation || null,
    mrt_distance_m: listing.mrtDistanceM ?? null,
    mrt_walk_mins: listing.mrtWalkMins ?? null,
    ips_drive_mins: listing.ipsDriveMins ?? null,
    matched_profile_id: criteriaProfile.id,
    match_status: decision,
    agent_name: listing.agentName || null,
    agent_phone: listing.agentPhone || null,
    notes: listing.notes || null,
    raw_card_json: JSON.stringify({
      rawCardText: listing.rawCardText,
      rawDetailText: listing.rawDetailText
    }),
    captured_at: capturedAt
  };
}

export async function connectToLocalChrome(cdpUrl) {
  let chromium;

  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright is not installed. Run npm ci before starting the browser worker.");
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("Chrome CDP connection succeeded, but no browser context was available");
  }

  return { browser, context };
}

export async function runExtractMatchesJob({
  context,
  job,
  criteriaProfile,
  artifactDir,
  knownSourceUrls = new Set(),
  log
}) {
  const searchPage = await context.newPage();
  const detailPage = job.includeDetailFields || job.includeAgentPhone ? await context.newPage() : null;
  const acceptedListings = [];
  const seenUrls = new Set();
  const visitedPageTokens = new Set();
  const screenshotPaths = [];
  let scannedCount = 0;
  let pageCount = 0;
  let currentUrl = job.entryUrl;

  try {
    while (currentUrl && pageCount < job.maxPages && acceptedListings.length < job.limit) {
      pageCount += 1;
      log(`Opening search page ${pageCount}: ${currentUrl}`);

      const bodyText = await ensurePropertyGuruPage(searchPage, currentUrl);

      if (/no results|sorry, we couldn't find/i.test(bodyText)) {
        log(`Search page reported no results: ${currentUrl}`);
        break;
      }

      const paginationState = await getNextPageUrl(searchPage);
      const pageToken = `${paginationState.url}#${paginationState.activePage || pageCount}`;

      if (visitedPageTokens.has(pageToken)) {
        break;
      }

      visitedPageTokens.add(pageToken);

      const seeds = await extractSearchCardSeeds(searchPage);

      if (seeds.length === 0) {
        log(`No listing cards found on page ${pageCount}`);
      }

      for (const seed of seeds) {
        if (acceptedListings.length >= job.limit) {
          break;
        }

        if (!seed.sourceUrl || seenUrls.has(seed.sourceUrl)) {
          continue;
        }

        if (knownSourceUrls.has(seed.sourceUrl)) {
          continue;
        }

        seenUrls.add(seed.sourceUrl);
        scannedCount += 1;

        let listing = buildListingFromText(
          {
            sourceUrl: seed.sourceUrl,
            projectName: seed.projectName,
            cardText: seed.cardText,
            districtContextUrl: currentUrl
          },
          seed.sourceUrl,
          seed.projectName
        );

        if (!passesSeedHardFilters(listing, criteriaProfile, currentUrl)) {
          continue;
        }

        let evaluation = evaluateListingAgainstProfile(listing, criteriaProfile, {
          allowMissing: true
        });

        if (evaluation.decision === "reject") {
          continue;
        }

        if (detailPage) {
          log(`Opening detail page for accepted candidate: ${seed.sourceUrl}`);
          const detailListing = await extractDetailListing(detailPage, seed.sourceUrl);
          listing = mergeListingData(listing, detailListing);
          evaluation = evaluateListingAgainstProfile(listing, criteriaProfile, {
            allowMissing: false
          });

          if (job.includeAgentPhone && !listing.agentPhone) {
            log(`Detail page did not expose a phone number: ${seed.sourceUrl}`);
          }

          if (evaluation.decision === "reject") {
            log(
              `Rejected after detail review: ${seed.sourceUrl} (${[
                ...evaluation.failures,
                ...evaluation.requiredMissing
              ].join(", ")})`
            );
            continue;
          }
        } else if (evaluation.decision === "reject") {
          continue;
        }

        const missingStorageFields = getStorageCompletenessIssues(listing, job);
        if (missingStorageFields.length > 0) {
          log(`Skipped incomplete listing: ${seed.sourceUrl} (${missingStorageFields.join(", ")})`);
          continue;
        }

        acceptedListings.push(
          formatListingRecord(listing, job, criteriaProfile, evaluation.decision)
        );
        knownSourceUrls.add(listing.sourceUrl);
      }

      if (acceptedListings.length >= job.limit) {
        break;
      }

      const nextPageState = await advanceSearchResultsPage(searchPage);
      currentUrl = nextPageState?.url ?? null;
    }

    return {
      status: "succeeded",
      listings: acceptedListings,
      scannedCount,
      pageCount,
      screenshotPaths,
      logSummary: `${acceptedListings.length} matched from ${scannedCount} scanned across ${pageCount} page(s)`
    };
  } catch (error) {
    screenshotPaths.push(await captureScreenshot(searchPage, artifactDir, "search-page-failure").catch(() => null));

    if (detailPage) {
      screenshotPaths.push(
        await captureScreenshot(detailPage, artifactDir, "detail-page-failure").catch(() => null)
      );
    }

    error.screenshotPaths = screenshotPaths.filter(Boolean);
    throw error;
  } finally {
    await searchPage.close().catch(() => {});
    if (detailPage) {
      await detailPage.close().catch(() => {});
    }
  }
}
