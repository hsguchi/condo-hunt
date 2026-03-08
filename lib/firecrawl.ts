import type { FirecrawlListingPayload } from "@/lib/normalizer";

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
