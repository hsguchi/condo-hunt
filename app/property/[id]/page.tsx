import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { sampleListings } from "@/lib/sample-data";

export default async function PropertyDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = sampleListings.find((entry) => entry.id === id);

  if (!listing) {
    notFound();
  }

  return (
    <section className="screen">
      <section className="detail-hero">
        <div className="topbar-tight">
          <Link href="/listings" className="icon-button" aria-label="Back to listings">
            <Icon name="arrow-left" />
          </Link>
          <button className="icon-button" type="button" aria-label="Save property">
            <Icon name="heart" />
          </button>
        </div>
        <div className="gallery-strip" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="detail-body">
        <article className="detail-section">
          <div className="card-head">
            <div>
              <h1 className="title-md">{listing.projectName}</h1>
              <p className="listing-location">
                <Icon name="map" /> {listing.address}
              </p>
            </div>
            <span className="pill">{listing.tenure}</span>
          </div>
          <p className="property-subline" style={{ marginTop: 12 }}>
            Price <strong>${listing.price.toLocaleString()}</strong>
          </p>
        </article>

        <section className="metrics-grid">
          <article className="metric-box">
            <p className="small-label">Yield</p>
            <strong>3.2%</strong>
          </article>
          <article className="metric-box">
            <p className="small-label">TOP</p>
            <strong>{listing.topYear}</strong>
          </article>
          <article className="metric-box">
            <p className="small-label">Size</p>
            <strong>{listing.sizeSqft} sqft</strong>
          </article>
          <article className="metric-box">
            <p className="small-label">Floor</p>
            <strong>High</strong>
          </article>
        </section>

        <article className="detail-section">
          <h3 className="title-sm">About this unit</h3>
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
            A bright, efficient layout with generous glazing, strong natural light, and enough
            flexibility for modern family living. The unit is positioned to capture breeze and city
            views while staying practical for daily commutes.
          </p>
        </article>

        <article className="detail-section">
          <h3 className="title-sm">Map preview</h3>
          <div className="map-preview" style={{ marginTop: 14 }} />
        </article>

        <article className="detail-section">
          <div className="agent-row">
            <div className="agent-ident">
              <div className="agent-portrait" />
              <div>
                <strong>{listing.agentName}</strong>
                <p className="detail-copy">{listing.agentPhone}</p>
              </div>
            </div>
            <a className="list-action" href={`tel:${listing.agentPhone}`}>
              <Icon name="phone" />
            </a>
          </div>
          <div className="inline-actions" style={{ marginTop: 16 }}>
            <a className="primary-cta" href={`https://wa.me/${listing.agentPhone.replace(/[^\d]/g, "")}`}>
              <Icon name="message" /> WhatsApp Agent
            </a>
            <button className="inline-button" type="button">
              <Icon name="copy" /> Copy
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}
