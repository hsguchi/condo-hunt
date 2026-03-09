import type { Listing } from "../../types/models";
import type {
  CandidateCard,
  CriteriaEvaluation,
  PropertyGuruDetailPayload
} from "./etl-types";

export const PROPERTYGURU_SOURCE_SITE = "propertyguru.com.sg";
export const ALLOWED_DISTRICTS = ["D5", "D10", "D21"] as const;
export const PREFERRED_MRT_STATIONS = ["buona vista", "dover", "clementi"] as const;

export const PROPERTYGURU_HARD_FILTERS = {
  sourceSite: PROPERTYGURU_SOURCE_SITE,
  maxPriceSgd: 1_500_000,
  minBedrooms: 2,
  minSizeSqft: 900,
  allowedDistricts: new Set<string>(ALLOWED_DISTRICTS),
  maxMrtWalkMins: 5,
  maxMrtDistanceMeters: 500,
  maxIpsDriveMins: 15
};

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDistrictToken(value?: string | null) {
  const token = normalizeText(value).toUpperCase();
  const numericMatch = token.match(/(?:D|DISTRICT\s*)(\d{1,2})/i);

  if (numericMatch) {
    return `D${Number(numericMatch[1])}`;
  }

  return token;
}

function getSourceHostname(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function pushHardFilterResult(
  evaluation: CriteriaEvaluation,
  filterName: string,
  result: boolean | undefined,
  missingNote?: string
) {
  if (result === true) {
    evaluation.matchedHardFilters.push(filterName);
    return;
  }

  if (result === false) {
    evaluation.rejectedBy.push(filterName);
    return;
  }

  if (missingNote) {
    evaluation.notes.push(missingNote);
  }
}

function createEmptyEvaluation(): CriteriaEvaluation {
  return {
    decision: "review",
    matchedHardFilters: [],
    rejectedBy: [],
    notes: []
  };
}

function evaluateMrtAccessibility(card: Pick<CandidateCard, "mrtWalkMins" | "mrtDistanceMeters">) {
  if (typeof card.mrtWalkMins === "number") {
    return card.mrtWalkMins <= PROPERTYGURU_HARD_FILTERS.maxMrtWalkMins;
  }

  if (typeof card.mrtDistanceMeters === "number") {
    return card.mrtDistanceMeters <= PROPERTYGURU_HARD_FILTERS.maxMrtDistanceMeters;
  }

  return undefined;
}

export function evaluateCandidateCard(card: CandidateCard): CriteriaEvaluation {
  const evaluation = createEmptyEvaluation();
  const district = normalizeDistrictToken(card.district);
  const hostname = getSourceHostname(card.sourceUrl);

  pushHardFilterResult(
    evaluation,
    "source_site",
    hostname ? hostname === PROPERTYGURU_HARD_FILTERS.sourceSite : undefined,
    "missing source site"
  );
  pushHardFilterResult(
    evaluation,
    "price",
    typeof card.price === "number" ? card.price <= PROPERTYGURU_HARD_FILTERS.maxPriceSgd : undefined,
    "missing price on result card"
  );
  pushHardFilterResult(
    evaluation,
    "bedrooms",
    typeof card.bedrooms === "number" ? card.bedrooms >= PROPERTYGURU_HARD_FILTERS.minBedrooms : undefined,
    "missing bedroom count on result card"
  );
  pushHardFilterResult(
    evaluation,
    "size_sqft",
    typeof card.sizeSqft === "number" ? card.sizeSqft >= PROPERTYGURU_HARD_FILTERS.minSizeSqft : undefined,
    "missing size on result card"
  );
  pushHardFilterResult(
    evaluation,
    "district",
    district ? PROPERTYGURU_HARD_FILTERS.allowedDistricts.has(district) : undefined,
    "missing district on result card"
  );
  pushHardFilterResult(
    evaluation,
    "mrt_accessibility",
    evaluateMrtAccessibility(card),
    "missing MRT distance or walk time on result card"
  );

  if (evaluation.rejectedBy.length > 0) {
    evaluation.decision = "reject";
  } else if (evaluation.notes.length === 0) {
    evaluation.decision = "accept";
  }

  return evaluation;
}

export function evaluateListingAgainstCriteria(
  listing: Listing,
  detailPayload?: PropertyGuruDetailPayload
): CriteriaEvaluation & { preferenceMatches: string[] } {
  const evaluation = createEmptyEvaluation();
  const preferenceMatches: string[] = [];
  const district = normalizeDistrictToken(listing.district);
  const hostname = getSourceHostname(listing.sourceUrl);
  const currentYear = new Date().getFullYear();
  const tenure = normalizeText(listing.tenure).toLowerCase();
  const floorLevel = normalizeText(detailPayload?.floorLevel).toLowerCase();
  const furnishing = normalizeText(detailPayload?.furnishing).toLowerCase();
  const listedDate = normalizeText(detailPayload?.listedDate).toLowerCase();
  const mrtStation = normalizeText(listing.mrtStation).toLowerCase();

  pushHardFilterResult(
    evaluation,
    "source_site",
    hostname ? hostname === PROPERTYGURU_HARD_FILTERS.sourceSite : undefined,
    "missing source site"
  );
  pushHardFilterResult(
    evaluation,
    "price",
    listing.price > 0 ? listing.price <= PROPERTYGURU_HARD_FILTERS.maxPriceSgd : undefined,
    "missing normalized price"
  );
  pushHardFilterResult(
    evaluation,
    "bedrooms",
    listing.bedrooms > 0 ? listing.bedrooms >= PROPERTYGURU_HARD_FILTERS.minBedrooms : undefined,
    "missing normalized bedrooms"
  );
  pushHardFilterResult(
    evaluation,
    "size_sqft",
    listing.sizeSqft > 0 ? listing.sizeSqft >= PROPERTYGURU_HARD_FILTERS.minSizeSqft : undefined,
    "missing normalized size"
  );
  pushHardFilterResult(
    evaluation,
    "district",
    district ? PROPERTYGURU_HARD_FILTERS.allowedDistricts.has(district) : undefined,
    "missing normalized district"
  );
  pushHardFilterResult(
    evaluation,
    "mrt_accessibility",
    listing.mrtWalkMins > 0 ? listing.mrtWalkMins <= PROPERTYGURU_HARD_FILTERS.maxMrtWalkMins : undefined,
    "missing normalized MRT walk time"
  );
  pushHardFilterResult(
    evaluation,
    "ips_drive_mins",
    listing.ipsDriveMins > 0 ? listing.ipsDriveMins < PROPERTYGURU_HARD_FILTERS.maxIpsDriveMins : undefined,
    "missing IPS drive time"
  );

  if (tenure === "freehold" || tenure === "99-year") {
    preferenceMatches.push(`tenure:${tenure}`);
  }

  if (listing.topYear > 0 && listing.topYear <= currentYear) {
    preferenceMatches.push("completion:completed");
  }

  if (floorLevel.includes("mid") || floorLevel.includes("high")) {
    preferenceMatches.push(`floor_level:${floorLevel}`);
  }

  if (furnishing.includes("partially") || furnishing.includes("unfurnished")) {
    preferenceMatches.push(`furnishing:${furnishing}`);
  }

  if (listedDate.includes("recent") || listedDate.includes("day") || listedDate.includes("week")) {
    preferenceMatches.push(`listed_date:${listedDate}`);
  }

  if (PREFERRED_MRT_STATIONS.some((station) => mrtStation.includes(station))) {
    preferenceMatches.push(`preferred_mrt:${mrtStation}`);
  }

  if (evaluation.rejectedBy.length > 0) {
    evaluation.decision = "reject";
  } else if (evaluation.notes.length === 0) {
    evaluation.decision = "accept";
  }

  return {
    ...evaluation,
    preferenceMatches
  };
}

export function buildCriteriaSummary() {
  return {
    sourceSite: PROPERTYGURU_HARD_FILTERS.sourceSite,
    maxPriceSgd: PROPERTYGURU_HARD_FILTERS.maxPriceSgd,
    minBedrooms: PROPERTYGURU_HARD_FILTERS.minBedrooms,
    minSizeSqft: PROPERTYGURU_HARD_FILTERS.minSizeSqft,
    allowedDistricts: [...PROPERTYGURU_HARD_FILTERS.allowedDistricts],
    maxMrtWalkMins: PROPERTYGURU_HARD_FILTERS.maxMrtWalkMins,
    maxMrtDistanceMeters: PROPERTYGURU_HARD_FILTERS.maxMrtDistanceMeters,
    maxIpsDriveMinsExclusive: PROPERTYGURU_HARD_FILTERS.maxIpsDriveMins,
    preferredMrtStations: [...PREFERRED_MRT_STATIONS]
  };
}
