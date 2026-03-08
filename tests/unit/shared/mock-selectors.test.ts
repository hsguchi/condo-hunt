import {
  formatCompactCurrency,
  getDashboardScatterPoints,
  getDashboardSummary,
  getDerivedContacts,
  getFilteredShortlistedListings,
  getPendingContactAgents,
  getTopValueDeals,
  getVisibleListings
} from "@/lib/mock-selectors";
import { createMockUiState } from "@/lib/mock-ui-state";
import { describe, expect, it } from "vitest";

describe("mock selectors", () => {
  it("filters visible listings from the shared state", () => {
    const state = createMockUiState({
      dismissedIds: ["3"],
      activeListingFilters: {
        budget: "$2.6M",
        tenure: "freehold",
        bedrooms: "2 bedrooms",
        district: "meyer"
      }
    });

    expect(getVisibleListings(state).map((listing) => listing.id)).toEqual(["1"]);
  });

  it("filters shortlisted listings using the shared shortlist filter", () => {
    const state = createMockUiState({
      shortlistedIds: ["1", "2", "3"],
      activeShortlistFilter: "Under $3M"
    });

    expect(getFilteredShortlistedListings(state).map((listing) => listing.id)).toEqual(["1", "3"]);
  });

  it("derives grouped contacts and sorts pending ahead of scheduled", () => {
    const state = createMockUiState({
      shortlistedIds: ["1", "2", "3"],
      contactStatusByAgentId: {
        "1": "scheduled",
        "2": "pending"
      }
    });

    const contacts = getDerivedContacts(state);

    expect(contacts.map((entry) => entry.agentName)).toEqual(["Sarah Lim", "John Tan"]);
    expect(contacts[0]).toMatchObject({
      agentId: "2",
      status: "pending",
      listingCount: 1
    });
    expect(contacts[1]).toMatchObject({
      agentId: "1",
      status: "scheduled",
      listingCount: 2,
      listingIds: ["1", "3"]
    });
  });

  it("derives dashboard summary counts from tracked listings and contacts", () => {
    const state = createMockUiState({
      shortlistedIds: ["1", "2", "3"],
      contactStatusByAgentId: {
        "1": "scheduled",
        "2": "pending"
      }
    });

    const summary = getDashboardSummary(state);

    expect(summary.trackedCount).toBe(3);
    expect(summary.shortlistedCount).toBe(3);
    expect(summary.viewedCount).toBe(1);
    expect(summary.averageShortlistPrice).toBeCloseTo(2_843_333.33, 2);
    expect(summary.averageShortlistPsf).toBeCloseTo(2_664.33, 2);
    expect(summary.pendingContacts).toBe(1);
    expect(summary.scheduledContacts).toBe(1);
    expect(summary.contactedContacts).toBe(0);
  });

  it("returns only pending contacts for the dashboard follow-up queue", () => {
    const state = createMockUiState({
      shortlistedIds: ["1", "2", "3"],
      contactStatusByAgentId: {
        "1": "scheduled",
        "2": "pending"
      }
    });

    expect(getPendingContactAgents(state).map((entry) => entry.agentName)).toEqual(["Sarah Lim"]);
  });

  it("formats compact currency without trailing zero noise", () => {
    expect(formatCompactCurrency(1_000_000)).toBe("$1M");
    expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
    expect(formatCompactCurrency(2_480_000)).toBe("$2.48M");
    expect(formatCompactCurrency(null)).toBe("--");
  });

  it("keeps value deals and scatter points deterministic from tracked listings", () => {
    const state = createMockUiState({
      dismissedIds: ["1", "3"]
    });

    expect(getTopValueDeals(state)).toMatchObject([
      {
        id: "2",
        name: "The Continuum",
        price: "$3.19M"
      }
    ]);
    expect(getDashboardScatterPoints(state)).toEqual([
      {
        id: "2",
        label: "The Continuum",
        left: "16%",
        bottom: "28%"
      }
    ]);
  });
});
