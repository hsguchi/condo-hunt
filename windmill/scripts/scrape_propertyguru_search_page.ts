import {
  type FirecrawlPropertyGuruSearchCardPayload,
  scrapePropertyGuruSearchResultCards
} from "../../lib/firecrawl";
import { normalizeCurrency, normalizeNumber } from "../../lib/normalizer";
import type { CandidateCard } from "../shared/etl-types";
import { PROPERTYGURU_SOURCE_SITE } from "../shared/propertyguru-criteria";

function assertPropertyGuruUrl(searchUrl: string) {
  const hostname = new URL(searchUrl).hostname.replace(/^www\./, "").toLowerCase();

  if (hostname !== PROPERTYGURU_SOURCE_SITE) {
    throw new Error(`Expected a ${PROPERTYGURU_SOURCE_SITE} URL but received ${hostname || "an invalid URL"}.`);
  }
}

function inferDistrictFromSearchUrl(searchUrl: string) {
  const districtMatch = searchUrl.match(/-d0?(\d{1,2})(?:$|[/?#-])/i);

  if (!districtMatch) {
    return undefined;
  }

  return `D${Number(districtMatch[1])}`;
}

function toAbsoluteUrl(candidateUrl: string | undefined, searchUrl: string) {
  if (!candidateUrl?.trim()) {
    return "";
  }

  try {
    return new URL(candidateUrl, searchUrl).toString();
  } catch {
    return "";
  }
}

function normalizeDistrict(value: string | undefined, searchUrl: string) {
  if (value?.trim()) {
    const directMatch = value.match(/(?:D|District\s*)(\d{1,2})/i);

    if (directMatch) {
      return `D${Number(directMatch[1])}`;
    }
  }

  return inferDistrictFromSearchUrl(searchUrl) ?? value?.trim() ?? undefined;
}

function normalizeInteger(value?: string | number) {
  const parsed = normalizeNumber(value);
  return parsed > 0 ? Math.round(parsed) : undefined;
}

function parseMrtWalkMins(value?: string) {
  if (!value) {
    return undefined;
  }

  const minuteMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)/i);

  if (!minuteMatch) {
    return undefined;
  }

  const parsed = Number.parseFloat(minuteMatch[1]);
  return Number.isNaN(parsed) ? undefined : Math.round(parsed);
}

function parseMrtDistanceMeters(value?: string) {
  if (!value) {
    return undefined;
  }

  const kmMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometre|kilometers|kilometres)\b/i);

  if (kmMatch) {
    const parsedKm = Number.parseFloat(kmMatch[1]);
    return Number.isNaN(parsedKm) ? undefined : Math.round(parsedKm * 1000);
  }

  const meterMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|meters)\b/i);

  if (!meterMatch) {
    return undefined;
  }

  const parsedMeters = Number.parseFloat(meterMatch[1]);
  return Number.isNaN(parsedMeters) ? undefined : Math.round(parsedMeters);
}

function normalizeCandidateCard(
  payload: FirecrawlPropertyGuruSearchCardPayload,
  searchUrl: string
): CandidateCard | null {
  const sourceUrl = toAbsoluteUrl(payload.sourceUrl, searchUrl);

  if (!sourceUrl) {
    return null;
  }

  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();

  if (hostname !== PROPERTYGURU_SOURCE_SITE) {
    return null;
  }

  const price = normalizeCurrency(payload.price);
  const bedrooms = normalizeInteger(payload.bedrooms);
  const sizeSqft = normalizeInteger(payload.sizeSqft);
  const mrtWalkMins = parseMrtWalkMins(payload.mrtWalk);
  const mrtDistanceMeters = parseMrtDistanceMeters(payload.mrtWalk);

  return {
    sourceUrl,
    projectName: payload.projectName?.trim() || undefined,
    price: price > 0 ? price : undefined,
    bedrooms,
    sizeSqft,
    district: normalizeDistrict(payload.district, searchUrl),
    mrtWalkMins,
    mrtDistanceMeters,
    listedDate: payload.listedDate?.trim() || undefined
  };
}

function dedupeCandidateCards(cards: CandidateCard[]) {
  const deduped = new Map<string, CandidateCard>();

  for (const card of cards) {
    if (!deduped.has(card.sourceUrl)) {
      deduped.set(card.sourceUrl, card);
      continue;
    }

    const existing = deduped.get(card.sourceUrl)!;
    deduped.set(card.sourceUrl, {
      ...existing,
      ...card,
      projectName: existing.projectName ?? card.projectName,
      price: existing.price ?? card.price,
      bedrooms: existing.bedrooms ?? card.bedrooms,
      sizeSqft: existing.sizeSqft ?? card.sizeSqft,
      district: existing.district ?? card.district,
      mrtWalkMins: existing.mrtWalkMins ?? card.mrtWalkMins,
      mrtDistanceMeters: existing.mrtDistanceMeters ?? card.mrtDistanceMeters,
      listedDate: existing.listedDate ?? card.listedDate
    });
  }

  return [...deduped.values()];
}

export async function main({
  searchUrl,
  mockCards = [],
  maxCards = 8,
  maxAgeMs = 43_200_000
}: {
  searchUrl: string;
  mockCards?: CandidateCard[];
  maxCards?: number;
  maxAgeMs?: number;
}): Promise<CandidateCard[]> {
  assertPropertyGuruUrl(searchUrl);

  if (mockCards.length > 0) {
    return dedupeCandidateCards(mockCards).slice(0, Math.max(maxCards, 0));
  }

  const extractedCards = await scrapePropertyGuruSearchResultCards(searchUrl, {
    maxCards,
    maxAgeMs
  });
  const normalizedCards = extractedCards
    .map((payload) => normalizeCandidateCard(payload, searchUrl))
    .filter((card): card is CandidateCard => card !== null);

  return dedupeCandidateCards(normalizedCards).slice(0, Math.max(maxCards, 0));
}
