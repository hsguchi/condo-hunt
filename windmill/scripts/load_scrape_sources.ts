import { getScrapeSources } from "../../lib/airtable";
import type { ScrapeSource } from "../shared/etl-types";
import { PROPERTYGURU_SOURCE_SITE } from "../shared/propertyguru-criteria";

export async function main({
  sources,
  sourceSite = PROPERTYGURU_SOURCE_SITE,
  enabledOnly = true
}: {
  sources?: ScrapeSource[];
  sourceSite?: string;
  enabledOnly?: boolean;
} = {}): Promise<ScrapeSource[]> {
  const resolvedSources =
    sources ?? (await getScrapeSources({ sourceSite, enabledOnly }));

  return resolvedSources.filter((source) => {
    return (
      source.enabled &&
      source.sourceSite === sourceSite &&
      source.entryUrl.trim().length > 0
    );
  });
}
