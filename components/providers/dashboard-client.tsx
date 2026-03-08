"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import {
  formatCompactCurrency,
  formatCompactNumber,
  getDashboardScatterPoints,
  getDashboardSummary,
  getPendingContactAgents,
  getTopValueDeals,
  getTrackedListings
} from "@/lib/mock-selectors";

export function DashboardClient() {
  const { state } = useMockUiState();
  const summary = getDashboardSummary(state);
  const scatterPoints = getDashboardScatterPoints(state);
  const trackedListings = getTrackedListings(state);
  const topDeals = getTopValueDeals(state);
  const pendingAgents = getPendingContactAgents(state);
  const trackedDistrictCount = new Set(trackedListings.map((listing) => listing.district)).size;
  const nextAgent = pendingAgents[0];

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
        <Link className="icon-button" href="/listings" aria-label="Review listings">
          <Icon name="spark" />
        </Link>
      </header>

      <section className="hero-card">
        <div className="greeting-row">
          <div>
            <p className="kicker">Good Morning</p>
            <h1 className="title-xl">Alex.</h1>
            <p className="muted">Your dashboard is now reading from the shared mock state.</p>
          </div>
          <Link className="icon-button" href="/contacts" aria-label="Open contact hub">
            <Icon name="message" />
          </Link>
        </div>

        <div className="stats-row" style={{ marginTop: 24 }}>
          <article className="stats-tile" role="group" aria-label="Viewed properties">
            <span className="metric-caption">Viewed</span>
            <strong className="metric-value">{formatCompactNumber(summary.viewedCount)}</strong>
          </article>
          <article className="stats-tile stats-tile--active" role="group" aria-label="Saved properties">
            <span className="metric-caption">Saved</span>
            <strong className="metric-value">{formatCompactNumber(summary.shortlistedCount)}</strong>
          </article>
          <article className="stats-tile" role="group" aria-label="Average shortlist price">
            <span className="metric-caption">Avg</span>
            <strong className="metric-value">{formatCompactCurrency(summary.averageShortlistPrice)}</strong>
          </article>
        </div>
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Market Position</p>
            <h2 className="title-sm">Best value pockets today</h2>
          </div>
          <span className="pill">{formatCompactNumber(summary.trackedCount)} tracked</span>
        </div>
        <div className="scatter-plot" aria-label="Listing value scatter plot">
          {scatterPoints.map((point) => (
            <span
              className="scatter-dot"
              key={point.id}
              style={{ left: point.left, bottom: point.bottom }}
              title={point.label}
            />
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
          {trackedDistrictCount > 0
            ? `${trackedDistrictCount} districts remain active after dismissals, with shortlist PSF averaging ${summary.averageShortlistPsf ?? "--"}.`
            : "No active listings yet. Add a shortlist item to populate market coverage."}
        </p>
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Top 3 Value Deals</p>
            <h2 className="title-sm">High-conviction candidates</h2>
          </div>
          <Link className="small-link" href="/shortlist">
            View All
          </Link>
        </div>
        {topDeals.length > 0 ? (
          <div className="deals-list" style={{ marginTop: 16 }}>
            {topDeals.map((deal, index) => (
              <article className="deal-item" key={deal.id}>
                <div className="deal-visual" style={{ opacity: 1 - index * 0.15 }} />
                <div className="deal-copy">
                  <strong>{deal.name}</strong>
                  <div className="deal-meta">{deal.meta}</div>
                </div>
                <strong>{deal.price}</strong>
              </article>
            ))}
          </div>
        ) : (
          <article className="empty-card" style={{ marginTop: 16 }}>
            <strong>No active deals yet</strong>
            <p className="muted" style={{ marginTop: 8 }}>
              Restore a dismissed listing or add a shortlist item to bring this panel to life.
            </p>
          </article>
        )}
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Next Best Step</p>
            <h2 className="title-sm">Contact the most responsive agents</h2>
          </div>
          <Link className="small-link" href="/contacts">
            Open Hub
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
          {nextAgent
            ? `${nextAgent.agentName} still needs attention for ${nextAgent.listingCount} shortlisted ${nextAgent.listingCount === 1 ? "home" : "homes"}.`
            : summary.shortlistedCount > 0
              ? "All shortlisted agents are already in motion. Use Contact Hub to schedule the next viewing."
              : "Start by shortlisting a few properties so the outreach queue can populate here."}
        </p>
      </section>
    </section>
  );
}
