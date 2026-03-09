import { sampleAgents, sampleListings } from "@/lib/sample-data";
import type { ContactStatus, MockUiState, MockListingFilters } from "@/lib/mock-ui-state";
import type { Agent, Listing } from "@/types/models";

export interface DerivedContactEntry {
  agentId: string;
  agentName: string;
  phone: string;
  agency: string;
  notes: string;
  badge: string;
  status: ContactStatus;
  listingIds: string[];
  listingNames: string[];
  listingCount: number;
}

export interface DashboardSummary {
  trackedCount: number;
  shortlistedCount: number;
  viewedCount: number;
  averageShortlistPrice: number | null;
  averageShortlistPsf: number | null;
  pendingContacts: number;
  contactedContacts: number;
  scheduledContacts: number;
}

export interface DashboardScatterPoint {
  id: string;
  label: string;
  left: string;
  bottom: string;
}

export interface ValueDeal {
  id: string;
  name: string;
  meta: string;
  price: string;
}

const contactPriority: Record<ContactStatus, number> = {
  pending: 0,
  scheduled: 1,
  contacted: 2
};

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return normalizeToken(value).replace(/[^a-z0-9]+/g, "");
}

function isAllValue(value?: string | null) {
  if (typeof value !== "string") {
    return true;
  }

  const normalized = slugify(value);
  return normalized === "" || normalized === "all" || normalized.startsWith("all");
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseNumericThreshold(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = normalizeToken(value);
  const millionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*m/);

  if (millionMatch) {
    return Number(millionMatch[1]) * 1_000_000;
  }

  const thousandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*k/);

  if (thousandMatch) {
    return Number(thousandMatch[1]) * 1_000;
  }

  const numericMatch = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!numericMatch) {
    return null;
  }

  const parsedValue = Number(numericMatch[1]);

  if (normalized.includes("under") || normalized.includes("budget") || normalized.includes("$")) {
    return parsedValue < 10 ? parsedValue * 1_000_000 : parsedValue * 1_000;
  }

  return parsedValue;
}

function parseBedrooms(value?: string) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function matchesBudget(listing: Listing, value?: string) {
  const threshold = parseNumericThreshold(value);
  return threshold === null ? true : listing.price <= threshold;
}

function matchesTenure(listing: Listing, value?: string) {
  if (!value || isAllValue(value)) {
    return true;
  }

  const listingTenure = slugify(listing.tenure);
  const requestedTenure = slugify(value);

  return listingTenure.includes(requestedTenure) || requestedTenure.includes(listingTenure);
}

function matchesBedrooms(listing: Listing, value?: string) {
  const bedrooms = parseBedrooms(value);
  return bedrooms === null ? true : listing.bedrooms === bedrooms;
}

function matchesDistrict(listing: Listing, value?: string) {
  if (!value || isAllValue(value)) {
    return true;
  }

  const requestedDistrict = slugify(value);
  const listingDistrict = slugify(listing.district);
  const listingAddress = slugify(`${listing.address} ${listing.projectName}`);

  return (
    listingDistrict.includes(requestedDistrict) ||
    requestedDistrict.includes(listingDistrict) ||
    listingAddress.includes(requestedDistrict)
  );
}

function matchesListingFilters(listing: Listing, filters: MockListingFilters) {
  return (
    matchesBudget(listing, filters.budget) &&
    matchesTenure(listing, filters.tenure) &&
    matchesBedrooms(listing, filters.bedrooms) &&
    matchesDistrict(listing, filters.district)
  );
}

function matchesShortlistFilter(listing: Listing, filterValue: string, shortlistedListings: Listing[]) {
  if (isAllValue(filterValue)) {
    return true;
  }

  const normalizedValue = normalizeToken(filterValue);
  const budgetThreshold = parseNumericThreshold(filterValue);

  if (budgetThreshold !== null) {
    return listing.price <= budgetThreshold;
  }

  if (normalizedValue.includes("freehold") || normalizedValue.includes("99")) {
    return matchesTenure(listing, filterValue);
  }

  if (normalizedValue.includes("ready") || normalizedValue.includes("top")) {
    return listing.topYear <= new Date().getFullYear() + 2;
  }

  if (normalizedValue.includes("yield")) {
    const averageShortlistPsf = average(shortlistedListings.map((entry) => entry.psf));
    return averageShortlistPsf === null ? true : listing.psf <= averageShortlistPsf;
  }

  const bedrooms = parseBedrooms(filterValue);

  if (bedrooms !== null) {
    return listing.bedrooms === bedrooms;
  }

  return matchesDistrict(listing, filterValue) || matchesTenure(listing, filterValue);
}

function formatPercentDelta(value: number, benchmark: number | null) {
  if (benchmark === null || benchmark === 0) {
    return "vs avg";
  }

  const delta = ((value - benchmark) / benchmark) * 100;
  const roundedDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  return `${roundedDelta} vs avg`;
}

function resolveAgentForListing(listing: Listing, agents: Agent[]) {
  return agents.find(
    (agent) => agent.phone === listing.agentPhone || agent.agentName === listing.agentName
  );
}

export function formatCompactCurrency(amount: number | null) {
  if (amount === null) {
    return "--";
  }

  if (amount >= 1_000_000) {
    const precision = amount >= 10_000_000 ? 1 : 2;
    const compactAmount = amount / 1_000_000;
    const roundedAmount = Math.round((compactAmount + Number.EPSILON) * 10 ** precision) / 10 ** precision;
    const compactValue = roundedAmount.toFixed(precision);
    return `$${compactValue.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}M`;
  }

  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }

  return `$${amount.toFixed(0)}`;
}

export function formatCompactNumber(value: number) {
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return value.toString();
}

export function getListingById(listingId: string, listings: Listing[] = sampleListings) {
  return listings.find((listing) => listing.id === listingId);
}

export function getTrackedListings(state: MockUiState, listings: Listing[] = sampleListings) {
  const dismissedIds = new Set(state.dismissedIds);
  return listings.filter((listing) => !dismissedIds.has(listing.id));
}

export function getTrackedListingById(
  state: MockUiState,
  listingId: string,
  listings: Listing[] = sampleListings
) {
  return getTrackedListings(state, listings).find((listing) => listing.id === listingId);
}

export function isListingShortlisted(state: MockUiState, listingId: string) {
  return state.shortlistedIds.includes(listingId);
}

export function isListingDismissed(state: MockUiState, listingId: string) {
  return state.dismissedIds.includes(listingId);
}

export function getVisibleListings(state: MockUiState, listings: Listing[] = sampleListings) {
  return getTrackedListings(state, listings).filter((listing) =>
    matchesListingFilters(listing, state.activeListingFilters)
  );
}

export function getShortlistedListings(state: MockUiState, listings: Listing[] = sampleListings) {
  const shortlistedIds = new Set(state.shortlistedIds);
  return getTrackedListings(state, listings).filter((listing) => shortlistedIds.has(listing.id));
}

export function getFilteredShortlistedListings(
  state: MockUiState,
  listings: Listing[] = sampleListings
) {
  const shortlistedListings = getShortlistedListings(state, listings);

  return shortlistedListings.filter((listing) =>
    matchesShortlistFilter(listing, state.activeShortlistFilter, shortlistedListings)
  );
}

export function getAgentIdForListing(listing: Listing, agents: Agent[] = sampleAgents) {
  return resolveAgentForListing(listing, agents)?.id ?? listing.agentPhone;
}

export function getDerivedContacts(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  agents: Agent[] = sampleAgents
) {
  const contactsByAgentId = new Map<string, DerivedContactEntry>();

  for (const listing of getShortlistedListings(state, listings)) {
    const matchingAgent = resolveAgentForListing(listing, agents);
    const agentId = matchingAgent?.id ?? listing.agentPhone;
    const status =
      state.contactStatusByAgentId[agentId] ??
      (matchingAgent?.contacted ? "contacted" : "pending");
    const existingEntry = contactsByAgentId.get(agentId);

    if (existingEntry) {
      existingEntry.listingIds.push(listing.id);
      existingEntry.listingNames.push(listing.projectName);
      existingEntry.listingCount += 1;
      continue;
    }

    contactsByAgentId.set(agentId, {
      agentId,
      agentName: matchingAgent?.agentName ?? listing.agentName,
      phone: matchingAgent?.phone ?? listing.agentPhone,
      agency: matchingAgent?.agency ?? "Independent",
      notes: matchingAgent?.notes ?? listing.notes,
      badge: (matchingAgent?.agentName ?? listing.agentName).charAt(0).toUpperCase(),
      status,
      listingIds: [listing.id],
      listingNames: [listing.projectName],
      listingCount: 1
    });
  }

  return [...contactsByAgentId.values()].sort((left, right) => {
    return (
      contactPriority[left.status] - contactPriority[right.status] ||
      right.listingCount - left.listingCount ||
      left.agentName.localeCompare(right.agentName)
    );
  });
}

export function getContactStatusCounts(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  agents: Agent[] = sampleAgents
) {
  return getDerivedContacts(state, listings, agents).reduce(
    (counts, entry) => {
      counts[entry.status] += 1;
      return counts;
    },
    {
      pending: 0,
      contacted: 0,
      scheduled: 0
    }
  );
}

export function getDashboardSummary(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  agents: Agent[] = sampleAgents
): DashboardSummary {
  const trackedListings = getTrackedListings(state, listings);
  const shortlistedListings = getShortlistedListings(state, listings);
  const contactCounts = getContactStatusCounts(state, listings, agents);

  return {
    trackedCount: trackedListings.length,
    shortlistedCount: shortlistedListings.length,
    viewedCount: trackedListings.filter((listing) => listing.status === "viewed").length,
    averageShortlistPrice: average(shortlistedListings.map((listing) => listing.price)),
    averageShortlistPsf: average(shortlistedListings.map((listing) => listing.psf)),
    pendingContacts: contactCounts.pending,
    contactedContacts: contactCounts.contacted,
    scheduledContacts: contactCounts.scheduled
  };
}

export function getPendingContactAgents(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  agents: Agent[] = sampleAgents,
  limit = 2
) {
  return getDerivedContacts(state, listings, agents)
    .filter((entry) => entry.status === "pending")
    .slice(0, limit);
}

export function getTopValueDeals(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  limit = 3
): ValueDeal[] {
  const trackedListings = getTrackedListings(state, listings);
  const benchmarkPsf = average(trackedListings.map((listing) => listing.psf));

  return [...trackedListings]
    .sort((left, right) => left.psf - right.psf || left.price - right.price)
    .slice(0, limit)
    .map((listing) => ({
      id: listing.id,
      name: listing.projectName,
      meta: `${listing.district}  •  ${formatPercentDelta(listing.psf, benchmarkPsf)}`,
      price: formatCompactCurrency(listing.price)
    }));
}

export function getDashboardScatterPoints(
  state: MockUiState,
  listings: Listing[] = sampleListings,
  limit = 5
): DashboardScatterPoint[] {
  const trackedListings = getTrackedListings(state, listings).slice(0, limit);

  if (trackedListings.length === 0) {
    return [];
  }

  const prices = trackedListings.map((listing) => listing.price);
  const sizes = trackedListings.map((listing) => listing.sizeSqft);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  return trackedListings.map((listing, index) => {
    const horizontalRatio =
      maxSize === minSize
        ? index / Math.max(trackedListings.length - 1, 1)
        : (listing.sizeSqft - minSize) / (maxSize - minSize);
    const verticalRatio =
      maxPrice === minPrice
        ? index / Math.max(trackedListings.length - 1, 1)
        : (listing.price - minPrice) / (maxPrice - minPrice);

    return {
      id: listing.id,
      label: listing.projectName,
      left: `${(16 + horizontalRatio * 62).toFixed(0)}%`,
      bottom: `${(28 + verticalRatio * 44).toFixed(0)}%`
    };
  });
}



