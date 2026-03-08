"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import type { MockListingFilters } from "@/lib/mock-ui-state";
import {
  formatCompactCurrency,
  getVisibleListings,
  isListingShortlisted
} from "@/lib/mock-selectors";

const filterGroups: Array<{
  key: keyof MockListingFilters;
  label: string;
  allLabel: string;
  options: string[];
}> = [
  {
    key: "budget",
    label: "Budget",
    allLabel: "All budgets",
    options: ["Under $2.5M", "Under $3M", "Under $3.5M"]
  },
  {
    key: "tenure",
    label: "Tenure",
    allLabel: "All tenures",
    options: ["Freehold", "99-year"]
  },
  {
    key: "bedrooms",
    label: "Bedrooms",
    allLabel: "All bedroom mixes",
    options: ["2 bed", "3 bed"]
  },
  {
    key: "district",
    label: "Area",
    allLabel: "All areas",
    options: ["D15", "Meyer", "Thiam Siew", "Dunman"]
  }
];

const heroBackgroundById: Record<string, string> = {
  "1": "linear-gradient(160deg, #8fa9bb 0%, #566f8a 40%, #1d2c3e 100%)",
  "2": "linear-gradient(160deg, #d7c39f 0%, #9d7f55 42%, #3f3224 100%)",
  "3": "linear-gradient(160deg, #9fc8bf 0%, #54867d 42%, #1b3933 100%)"
};

function formatListingStatus(status: string) {
  switch (status) {
    case "new":
      return "New listing";
    case "shortlisted":
      return "Shortlisted";
    case "viewed":
      return "Viewed";
    case "viewing_booked":
      return "Viewing booked";
    case "negotiating":
      return "Negotiating";
    case "dropped":
      return "Dropped";
    default:
      return "Tracked";
  }
}

function formatFilterSummary(key: keyof MockListingFilters, value?: string) {
  const group = filterGroups.find((entry) => entry.key === key);

  if (!group) {
    return value ?? "";
  }

  return value ? `${group.label}: ${value}` : group.allLabel;
}

function toWhatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

export function ListingsBrowser() {
  const { state, actions } = useMockUiState();
  const visibleListings = getVisibleListings(state);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    if (visibleListings.length === 0) {
      setSelectedListingId(null);
      return;
    }

    if (!selectedListingId || !visibleListings.some((listing) => listing.id === selectedListingId)) {
      setSelectedListingId(visibleListings[0].id);
    }
  }, [selectedListingId, visibleListings]);

  const selectedListing =
    visibleListings.find((listing) => listing.id === selectedListingId) ?? visibleListings[0] ?? null;
  const selectedIsShortlisted = selectedListing
    ? isListingShortlisted(state, selectedListing.id)
    : false;
  const activeFilterCount = Object.values(state.activeListingFilters).filter(Boolean).length;

  const handleRejectListing = () => {
    if (!selectedListing) {
      return;
    }

    const nextListing =
      visibleListings.find((listing) => listing.id !== selectedListing.id) ?? null;

    setSelectedListingId(nextListing?.id ?? null);
    actions.dismissListing(selectedListing.id);
  };

  const handleToggleShortlist = () => {
    if (!selectedListing) {
      return;
    }

    actions.setListingShortlisted(selectedListing.id, !selectedIsShortlisted);
  };

  const handleToggleFilter = (
    key: keyof MockListingFilters,
    value: string,
    isActive: boolean
  ) => {
    actions.setListingFilter(key, isActive ? null : value);
  };

  const restoreDismissedListings = () => {
    state.dismissedIds.forEach((listingId) => actions.restoreListing(listingId));
  };

  return (
    <section className="screen">
      <header className="topbar">
        <div>
          <p className="kicker">Browsing Queue</p>
          <h1 className="title-md listing-brand">RapidFire Listings</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {visibleListings.length} live matches • {state.shortlistedIds.length} saved
          </p>
        </div>
        <button
          aria-controls="listing-filters"
          aria-expanded={state.uiFlags.filterSheetOpen}
          aria-label="Toggle listing filters"
          className="icon-button"
          onClick={() => actions.setUiFlag("filterSheetOpen", !state.uiFlags.filterSheetOpen)}
          type="button"
        >
          <Icon name="tune" />
        </button>
      </header>

      <div className="filter-row filter-row--scroll" style={{ display: "flex", gap: 8 }}>
        {filterGroups.map((group) => {
          const value = state.activeListingFilters[group.key];
          const isActive = Boolean(value);

          return (
            <button
              aria-pressed={isActive}
              className={`filter-pill${isActive ? " filter-pill--active" : ""}`}
              key={group.key}
              onClick={() =>
                isActive
                  ? actions.setListingFilter(group.key, null)
                  : actions.setUiFlag("filterSheetOpen", true)
              }
              type="button"
            >
              {formatFilterSummary(group.key, value)}
            </button>
          );
        })}
        {activeFilterCount > 0 ? (
          <button className="filter-pill" onClick={() => actions.clearListingFilters()} type="button">
            Clear all
          </button>
        ) : null}
      </div>

      {state.uiFlags.filterSheetOpen ? (
        <section className="detail-section" id="listing-filters">
          <div className="card-head">
            <div>
              <p className="small-label">Filter listings</p>
              <h2 className="title-sm">Refine your queue</h2>
            </div>
            <span className="pill">{activeFilterCount} active</span>
          </div>

          <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
            {filterGroups.map((group) => (
              <section key={group.key}>
                <p className="small-label" style={{ margin: 0 }}>
                  {group.label}
                </p>
                <div
                  className="tag-row"
                  style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
                >
                  <button
                    aria-pressed={!state.activeListingFilters[group.key]}
                    className={`filter-pill${!state.activeListingFilters[group.key] ? " filter-pill--active" : ""}`}
                    onClick={() => actions.setListingFilter(group.key, null)}
                    type="button"
                  >
                    {group.allLabel}
                  </button>
                  {group.options.map((option) => {
                    const isActive = state.activeListingFilters[group.key] === option;

                    return (
                      <button
                        aria-pressed={isActive}
                        className={`filter-pill${isActive ? " filter-pill--active" : ""}`}
                        key={option}
                        onClick={() => handleToggleFilter(group.key, option, isActive)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="inline-actions" style={{ marginTop: 18 }}>
            <button className="inline-button" onClick={() => actions.clearListingFilters()} type="button">
              Clear filters
            </button>
            <button
              className="inline-button"
              onClick={() => actions.setUiFlag("filterSheetOpen", false)}
              type="button"
            >
              Done
            </button>
          </div>
        </section>
      ) : null}

      {selectedListing ? (
        <>
          <section className="listing-stack">
            <div className="listing-shadow-card" aria-hidden="true" />
            <article className="listing-card listing-card--tight">
              <div
                className="listing-hero listing-hero--minimal"
                style={{
                  background:
                    heroBackgroundById[selectedListing.id] ??
                    "linear-gradient(160deg, #8fa9bb 0%, #566f8a 40%, #1d2c3e 100%)"
                }}
              >
                <span className="status-chip status-chip--listing">
                  {selectedIsShortlisted ? "Saved" : formatListingStatus(selectedListing.status)}
                </span>
                <span className="price-chip price-chip--psf">
                  ${selectedListing.psf.toLocaleString()} psf
                </span>
              </div>

              <div className="listing-copy listing-copy--tight">
                <div className="listing-header-row">
                  <div>
                    <h2 className="listing-title listing-title--serif">
                      {selectedListing.projectName}
                    </h2>
                    <p className="listing-location listing-location--soft">
                      <Icon name="map" /> {selectedListing.district} • {selectedListing.address}
                    </p>
                  </div>
                  <strong className="listing-price-lg">
                    {formatCompactCurrency(selectedListing.price)}
                  </strong>
                </div>

                <div className="tag-row tag-row--tight">
                  <span className="tag-chip">{selectedListing.bedrooms} Bed</span>
                  <span className="tag-chip">{selectedListing.bathrooms} Bath</span>
                  <span className="tag-chip">{selectedListing.sizeSqft} sqft</span>
                  <span className="tag-chip tag-chip--active">{selectedListing.tenure}</span>
                </div>

                <p className="detail-copy" style={{ marginTop: 2 }}>
                  {selectedListing.agentName} • {selectedListing.sourceSite} lead
                </p>
              </div>
            </article>
          </section>

          <div className="floating-actions floating-actions--overlay">
            <button
              aria-label={`Reject ${selectedListing.projectName}`}
              className="fab fab--reject"
              onClick={handleRejectListing}
              type="button"
            >
              x
            </button>
            <Link
              className="primary-cta primary-cta--caps"
              href={`/property/${selectedListing.id}`}
              onClick={() => {
                actions.setLastVisitedRoute("/listings");
                actions.setUiFlag("filterSheetOpen", false);
              }}
            >
              View details
            </Link>
            <button
              aria-label={
                selectedIsShortlisted
                  ? `Remove ${selectedListing.projectName} from shortlist`
                  : `Save ${selectedListing.projectName} to shortlist`
              }
              aria-pressed={selectedIsShortlisted}
              className="fab fab--heart"
              onClick={handleToggleShortlist}
              style={
                selectedIsShortlisted
                  ? {
                      background:
                        "linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)",
                      color: "white"
                    }
                  : undefined
              }
              type="button"
            >
              <Icon name="heart" />
            </button>
          </div>

          <p aria-live="polite" className="muted" role="status" style={{ margin: 0 }}>
            {selectedIsShortlisted
              ? `${selectedListing.projectName} is saved to your shortlist.`
              : "Save this property to keep it visible in Shortlist."}
          </p>

          <section className="detail-section">
            <div className="card-head">
              <div>
                <p className="small-label">Queue</p>
                <h2 className="title-sm">Browse other matches</h2>
              </div>
              <span className="pill">{visibleListings.length} visible</span>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {visibleListings.map((listing) => {
                const isActive = listing.id === selectedListing.id;
                const shortlisted = isListingShortlisted(state, listing.id);

                return (
                  <button
                    aria-pressed={isActive}
                    key={listing.id}
                    onClick={() => setSelectedListingId(listing.id)}
                    style={{
                      alignItems: "center",
                      background: isActive ? "rgba(37, 99, 235, 0.08)" : "rgba(255, 255, 255, 0.9)",
                      border: `1px solid ${isActive ? "rgba(37, 99, 235, 0.24)" : "rgba(148, 163, 184, 0.16)"}`,
                      borderRadius: 18,
                      color: "inherit",
                      cursor: "pointer",
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "1fr auto",
                      padding: "14px 16px",
                      textAlign: "left"
                    }}
                    type="button"
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>{listing.projectName}</strong>
                      <p className="muted" style={{ margin: "6px 0 0" }}>
                        {formatCompactCurrency(listing.price)} • {listing.bedrooms} bed • {listing.address}
                      </p>
                    </div>
                    <span className="pill" style={shortlisted ? undefined : { background: "rgba(15, 23, 42, 0.06)", color: "#64748b" }}>
                      {shortlisted ? "Saved" : formatListingStatus(listing.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="empty-card">
          <p className="small-label">Queue cleared</p>
          <h2 className="title-sm" style={{ marginTop: 8 }}>
            No listings match your current view
          </h2>
          <p className="muted" style={{ lineHeight: 1.6, margin: "10px 0 0" }}>
            Adjust your filters or restore hidden listings to continue browsing.
          </p>
          <div className="inline-actions" style={{ justifyContent: "center", marginTop: 18 }}>
            <button className="inline-button" onClick={() => actions.clearListingFilters()} type="button">
              Clear filters
            </button>
            {state.dismissedIds.length > 0 ? (
              <button className="inline-button" onClick={restoreDismissedListings} type="button">
                Restore hidden
              </button>
            ) : null}
          </div>
        </section>
      )}
    </section>
  );
}
