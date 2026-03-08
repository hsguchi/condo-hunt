"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import { SHORTLIST_FILTER_ALL } from "@/lib/mock-ui-state";
import {
  formatCompactCurrency,
  getFilteredShortlistedListings,
  getShortlistedListings
} from "@/lib/mock-selectors";
import type { Listing } from "@/types/models";

const shortlistFilters = [
  { label: "All Homes", value: SHORTLIST_FILTER_ALL },
  { label: "Under $2.5M", value: "Under $2.5M" },
  { label: "Freehold", value: "Freehold" },
  { label: "3 Bedroom", value: "3 Bedroom" }
];

const shortlistGradients = [
  "linear-gradient(135deg, #7dd3fc 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #60a5fa 0%, #64748b 100%)",
  "linear-gradient(135deg, #9bd8c8 0%, #6b7280 100%)",
  "linear-gradient(135deg, #c4b5fd 0%, #312e81 100%)"
];

function getShortlistGradient(index: number) {
  return shortlistGradients[index % shortlistGradients.length];
}

function getShortlistFilterLabel(filterValue: string) {
  return (
    shortlistFilters.find((filter) => filter.value === filterValue)?.label ?? "this shortlist view"
  );
}

function getListingMeta(listing: Listing) {
  return `${listing.address}, ${listing.district}`;
}

export function ShortlistScreen() {
  const { isHydrated, state, actions } = useMockUiState();
  const shortlistedListings = getShortlistedListings(state);
  const filteredShortlistedListings = getFilteredShortlistedListings(state);
  const activeFilter = state.activeShortlistFilter || SHORTLIST_FILTER_ALL;
  const activeFilterLabel = getShortlistFilterLabel(activeFilter);

  return (
    <section className="screen">
      <header className="topbar">
        <div className="brand-row">
          <span className="brand-badge">
            <Icon name="home" />
          </span>
          <div className="brand-copy">
            <strong>Rapid Fire</strong>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Reset shortlist filter"
          onClick={() => actions.setShortlistFilter(SHORTLIST_FILTER_ALL)}
          disabled={activeFilter === SHORTLIST_FILTER_ALL}
        >
          <Icon name="tune" />
        </button>
      </header>

      <section>
        <h1 className="title-md">Shortlist</h1>
        <p className="muted" aria-live="polite">
          {isHydrated
            ? `${shortlistedListings.length} ${
                shortlistedListings.length === 1 ? "property" : "properties"
              } saved`
            : "Syncing saved homes"}
        </p>
      </section>

      <div className="filter-row filter-row--scroll" aria-label="Shortlist filters">
        {shortlistFilters.map((filter) => {
          const isActive = filter.value === activeFilter;

          return (
            <button
              key={filter.value}
              type="button"
              className={`filter-pill${isActive ? " filter-pill--active" : ""}`}
              aria-pressed={isActive}
              onClick={() => actions.setShortlistFilter(filter.value)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isHydrated ? (
        shortlistedListings.length > 0 ? (
          filteredShortlistedListings.length > 0 ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                {activeFilter === SHORTLIST_FILTER_ALL
                  ? `${filteredShortlistedListings.length} saved homes ready to review`
                  : `${filteredShortlistedListings.length} matches ${activeFilterLabel.toLowerCase()}`}
              </p>
              <section className="short-grid short-grid--visual">
                {filteredShortlistedListings.map((listing, index) => (
                  <article
                    className="short-card short-card--tight"
                    key={listing.id}
                    style={{ position: "relative" }}
                  >
                    <button
                      className="short-card__close"
                      type="button"
                      aria-label={`Remove ${listing.projectName} from shortlist`}
                      onClick={() => actions.setListingShortlisted(listing.id, false)}
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        zIndex: 1,
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "inherit",
                        cursor: "pointer",
                        lineHeight: 1
                      }}
                    >
                      x
                    </button>
                    <Link
                      href={`/property/${listing.id}`}
                      scroll={false}
                      aria-label={`Open ${listing.projectName}`}
                      style={{
                        color: "inherit",
                        textDecoration: "none",
                        display: "grid",
                        gap: 8
                      }}
                    >
                      <div
                        className="short-card__visual"
                        style={{
                          background: getShortlistGradient(index)
                        }}
                      >
                        <span className="short-card__badge">
                          {formatCompactCurrency(listing.price)}
                        </span>
                      </div>

                      <div>
                        <strong>{listing.projectName}</strong>
                        <p className="muted short-card__meta">{getListingMeta(listing)}</p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8
                        }}
                      >
                        <span className="contact-badge">{listing.bedrooms} Bed</span>
                        <span className="contact-badge">{listing.sizeSqft} sqft</span>
                        <span className="contact-badge">{listing.tenure}</span>
                      </div>
                    </Link>
                  </article>
                ))}
              </section>
            </>
          ) : (
            <section className="empty-card" style={{ display: "grid", gap: 12, padding: 20 }}>
              <div>
                <h2 className="title-sm">No homes match {activeFilterLabel.toLowerCase()}</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  Reset the filter to review every saved property again.
                </p>
              </div>
              <button
                className="inline-button"
                type="button"
                onClick={() => actions.setShortlistFilter(SHORTLIST_FILTER_ALL)}
              >
                Show all saved homes
              </button>
            </section>
          )
        ) : (
          <section className="empty-card" style={{ display: "grid", gap: 12, padding: 20 }}>
            <div>
              <h2 className="title-sm">Your shortlist is empty</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Save a listing to start comparing homes and contacting agents.
              </p>
            </div>
            <Link className="primary-cta" href="/listings" scroll={false}>
              Browse listings
            </Link>
          </section>
        )
      ) : (
        <section className="empty-card" style={{ padding: 20 }}>
          <p className="muted">Loading saved homes...</p>
        </section>
      )}

      <div className="contact-all contact-all--raised">
        <Link className="primary-cta" href="/contacts?bulk=1" scroll={false}>
          <Icon name="message" />
          Contact All Agents
        </Link>
      </div>
    </section>
  );
}
