import type { PropertyGuruDetailPayload } from "../shared/etl-types";
import { PROPERTYGURU_SOURCE_SITE } from "../shared/propertyguru-criteria";

function assertPropertyGuruUrl(listingUrl: string) {
  const hostname = new URL(listingUrl).hostname.replace(/^www\./, "").toLowerCase();

  if (hostname !== PROPERTYGURU_SOURCE_SITE) {
    throw new Error(`Expected a ${PROPERTYGURU_SOURCE_SITE} URL but received ${hostname || "an invalid URL"}.`);
  }
}

export async function main({
  listingUrl,
  mockPayload
}: {
  listingUrl: string;
  mockPayload?: PropertyGuruDetailPayload;
}): Promise<PropertyGuruDetailPayload> {
  assertPropertyGuruUrl(listingUrl);

  if (mockPayload) {
    return {
      ...mockPayload,
      sourceUrl: mockPayload.sourceUrl ?? listingUrl,
      sourceSite: mockPayload.sourceSite ?? PROPERTYGURU_SOURCE_SITE
    };
  }

  throw new Error(
    "Wire this script to Firecrawl scrape for PropertyGuru detail-page extraction."
  );
}
