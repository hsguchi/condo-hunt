import type { Listing } from "../../types/models";
import {
  normalizeCurrency,
  normalizeListingPayload,
  normalizeNumber,
  normalizePhone
} from "../../lib/normalizer";
import { buildListingFingerprint } from "../shared/fingerprint";
import {
  evaluateListingAgainstCriteria,
  PROPERTYGURU_SOURCE_SITE
} from "../shared/propertyguru-criteria";
import type { NormalizedListingBundle, PropertyGuruDetailPayload } from "../shared/etl-types";

function toStringValue(value?: string | number) {
  if (typeof value === "number") {
    return value.toString();
  }

  return value;
}

function getSourceSite(sourceUrl: string, explicitSourceSite?: string) {
  if (explicitSourceSite?.trim()) {
    return explicitSourceSite.trim();
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return PROPERTYGURU_SOURCE_SITE;
  }
}

export async function main({
  detail,
  sourceUrl,
  defaultStatus = "new"
}: {
  detail: PropertyGuruDetailPayload;
  sourceUrl: string;
  defaultStatus?: Listing["status"];
}): Promise<NormalizedListingBundle> {
  const baseNormalized = normalizeListingPayload({
    project: detail.project ?? detail.projectName,
    address: detail.address,
    price: detail.price,
    size: detail.size ?? detail.sizeSqft,
    bedrooms: detail.bedrooms,
    agent: detail.agent ?? detail.agentName,
    phone: detail.phone ?? detail.agentPhone
  });

  const price = normalizeCurrency(detail.price);
  const sizeSqft = normalizeNumber(toStringValue(detail.sizeSqft ?? detail.size));
  const explicitPsf = normalizeNumber(toStringValue(detail.psf));
  const computedPsf = price > 0 && sizeSqft > 0 ? Math.round(price / sizeSqft) : 0;
  const sourceSite = getSourceSite(sourceUrl, detail.sourceSite);

  const listing: Listing = {
    id: detail.listingId?.trim() || sourceUrl,
    listingId: detail.listingId?.trim() || sourceUrl,
    projectName: baseNormalized.projectName || detail.projectName?.trim() || detail.project?.trim() || "",
    address: baseNormalized.address || detail.address?.trim() || "",
    district: detail.district?.trim() || "",
    price,
    sizeSqft,
    psf: explicitPsf || computedPsf,
    bedrooms: normalizeNumber(toStringValue(detail.bedrooms)),
    bathrooms: normalizeNumber(toStringValue(detail.bathrooms)),
    tenure: detail.tenure?.trim() || "",
    topYear: normalizeNumber(toStringValue(detail.topYear)),
    mrtStation: detail.mrtStation?.trim() || "",
    mrtWalkMins: normalizeNumber(toStringValue(detail.mrtWalkMins)),
    ipsDriveMins: normalizeNumber(toStringValue(detail.ipsDriveMins)),
    sourceUrl,
    sourceSite,
    agentName: baseNormalized.agentName || detail.agentName?.trim() || detail.agent?.trim() || "",
    agentPhone: normalizePhone(detail.agentPhone ?? detail.phone ?? baseNormalized.agentPhone),
    status: defaultStatus,
    notes: detail.notes?.trim() || ""
  };

  const evaluation = evaluateListingAgainstCriteria(listing, detail);

  return {
    listing,
    fingerprint: buildListingFingerprint(listing),
    decision: evaluation.decision,
    matchedHardFilters: evaluation.matchedHardFilters,
    preferenceMatches: evaluation.preferenceMatches,
    rejectedBy: evaluation.rejectedBy,
    notes: evaluation.notes
  };
}
