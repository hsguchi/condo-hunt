import type { FirecrawlListingPayload } from "./normalizer";

const DEFAULT_FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2";
const DEFAULT_FIRECRAWL_TIMEOUT_MS = 30_000;
const DEFAULT_FIRECRAWL_MAX_AGE_MS = 43_200_000;

interface FirecrawlScrapeResponse<T> {
  success?: boolean;
  data?: {
    json?: T;
    metadata?: {
      sourceURL?: string;
      statusCode?: number;
      [key: string]: unknown;
    };
  };
  error?: string;
}

interface FirecrawlJsonScrapeRequest<T> {
  url: string;
  schema: Record<string, unknown>;
  prompt: string;
  waitFor?: number;
  timeout?: number;
  maxAge?: number;
  onlyMainContent?: boolean;
  mobile?: boolean;
  location?: {
    country: string;
    languages: string[];
  };
  actions?: Array<Record<string, unknown>>;
}

export interface FirecrawlPropertyGuruSearchCardPayload {
  sourceUrl?: string;
  projectName?: string;
  price?: string;
  bedrooms?: string;
  sizeSqft?: string;
  district?: string;
  mrtWalk?: string;
  listedDate?: string;
}

function getFirecrawlConfig() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const apiUrl = process.env.FIRECRAWL_API_URL ?? DEFAULT_FIRECRAWL_API_URL;

  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY");
  }

  return {
    apiKey,
    apiUrl: apiUrl.replace(/\/$/, "")
  };
}

export async function firecrawlScrapeJson<T>({
  url,
  schema,
  prompt,
  waitFor = 3_000,
  timeout = DEFAULT_FIRECRAWL_TIMEOUT_MS,
  maxAge = DEFAULT_FIRECRAWL_MAX_AGE_MS,
  onlyMainContent = false,
  mobile = false,
  location = {
    country: "SG",
    languages: ["en-SG", "en"]
  },
  actions
}: FirecrawlJsonScrapeRequest<T>): Promise<T> {
  const { apiKey, apiUrl } = getFirecrawlConfig();
  const response = await fetch(`${apiUrl}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
          schema,
          prompt
        }
      ],
      onlyMainContent,
      waitFor,
      timeout,
      maxAge,
      mobile,
      location,
      actions,
      blockAds: true,
      storeInCache: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Firecrawl scrape failed (${response.status}): ${errorBody}`);
  }

  const body = (await response.json()) as FirecrawlScrapeResponse<T>;

  if (!body.success || !body.data?.json) {
    throw new Error(body.error || "Firecrawl scrape returned no structured JSON payload.");
  }

  return body.data.json;
}

const propertyGuruSearchSchema = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceUrl: {
            type: "string",
            description: "Absolute URL to the PropertyGuru listing detail page."
          },
          projectName: {
            type: "string"
          },
          price: {
            type: "string",
            description: "Price text exactly as shown on the card, in SGD."
          },
          bedrooms: {
            type: "string",
            description: "Bedroom text as shown, such as '2 bed' or '3 Bedrooms'."
          },
          sizeSqft: {
            type: "string",
            description: "Floor area text in square feet as shown on the card."
          },
          district: {
            type: "string",
            description: "District or area label shown on the card."
          },
          mrtWalk: {
            type: "string",
            description: "MRT distance or walk-time text, such as '5 min walk' or '450 m'."
          },
          listedDate: {
            type: "string",
            description: "Recency or listed-date text shown on the card."
          }
        },
        required: ["sourceUrl"]
      }
    }
  },
  required: ["cards"]
} satisfies Record<string, unknown>;

export async function scrapePropertyGuruSearchResultCards(
  searchUrl: string,
  {
    maxCards = 8,
    maxAgeMs = DEFAULT_FIRECRAWL_MAX_AGE_MS
  }: {
    maxCards?: number;
    maxAgeMs?: number;
  } = {}
): Promise<FirecrawlPropertyGuruSearchCardPayload[]> {
  const extracted = await firecrawlScrapeJson<{
    cards?: FirecrawlPropertyGuruSearchCardPayload[];
  }>({
    url: searchUrl,
    schema: propertyGuruSearchSchema,
    prompt: `Extract up to the first ${maxCards} real PropertyGuru sale-result property cards from this page. Ignore ads, banners, promoted widgets, navigation, filters, pagination, and non-listing content. Return absolute PropertyGuru listing detail URLs and the visible card text for project name, price, bedrooms, floor area, district or area, MRT walk or distance, and listed date.`,
    onlyMainContent: false,
    waitFor: 4_000,
    timeout: 45_000,
    maxAge: maxAgeMs,
    mobile: false,
    location: {
      country: "SG",
      languages: ["en-SG", "en"]
    }
  });

  return (extracted.cards ?? []).slice(0, Math.max(maxCards, 0));
}

export async function scrapeListing(url: string): Promise<FirecrawlListingPayload> {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("Missing FIRECRAWL_API_KEY");
  }

  return {
    project: "Placeholder listing",
    address: url,
    price: 0,
    size: 0,
    bedrooms: 0,
    agent: "",
    phone: ""
  };
}
