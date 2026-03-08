import Link from "next/link";
import { Icon } from "@/components/icon";
import { sampleListings } from "@/lib/sample-data";

const listing = sampleListings[0];

export default function ListingsPage() {
  return (
    <section className="screen">
      <header className="topbar">
        <div>
          <p className="kicker">Good Morning</p>
          <h1 className="title-md listing-brand">RapidFire</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Filter listings">
          <Icon name="tune" />
        </button>
      </header>

      <section className="listing-stack">
        <div className="listing-shadow-card" aria-hidden="true" />
        <article className="listing-card listing-card--tight">
          <div className="listing-hero listing-hero--minimal">
            <span className="status-chip status-chip--listing">New Listing</span>
            <span className="price-chip price-chip--psf">$1,450 psf</span>
          </div>

          <div className="listing-copy listing-copy--tight">
            <div className="listing-header-row">
              <div>
                <h1 className="listing-title listing-title--serif">The Interlace</h1>
                <p className="listing-location listing-location--soft">
                  <Icon name="map" /> District 4 • Depot Road
                </p>
              </div>
              <strong className="listing-price-lg">$1.2M</strong>
            </div>

            <div className="tag-row tag-row--tight">
              <span className="tag-chip">3 Bed</span>
              <span className="tag-chip">1,200 sqft</span>
              <span className="tag-chip tag-chip--active">Freehold</span>
            </div>

            <div className="listing-divider" />

            <div className="agent-row agent-row--tight">
              <div className="agent-ident">
                <div className="agent-portrait" />
                <div>
                  <strong>{listing.agentName}</strong>
                  <p className="detail-copy">Trusted seller</p>
                </div>
              </div>
              <div className="dot-menu" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </article>
      </section>

      <div className="floating-actions floating-actions--overlay">
        <button className="fab fab--reject" type="button" aria-label="Reject listing">
          x
        </button>
        <Link className="primary-cta primary-cta--caps" href={`/property/${listing.id}`}>
          <Icon name="message" /> WHATSAPP AGENT
        </Link>
        <button className="fab fab--heart" type="button" aria-label="Save listing">
          <Icon name="heart" />
        </button>
      </div>
    </section>
  );
}
