"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import {
  formatCompactCurrency,
  getListingById,
  getTrackedListingById,
  isListingDismissed,
  isListingShortlisted
} from "@/lib/mock-selectors";

interface PropertyDetailViewProps {
  listingId: string;
}

const detailHeroBackgroundById: Record<string, string> = {
  "1": "linear-gradient(160deg, #8fa9bb 0%, #566f8a 40%, #1d2c3e 100%)",
  "2": "linear-gradient(160deg, #d7c39f 0%, #9d7f55 42%, #3f3224 100%)",
  "3": "linear-gradient(160deg, #9fc8bf 0%, #54867d 42%, #1b3933 100%)"
};

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";

  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function toWhatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

export function PropertyDetailView({ listingId }: PropertyDetailViewProps) {
  const router = useRouter();
  const { state, actions } = useMockUiState();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const listing = getTrackedListingById(state, listingId) ?? getListingById(listingId);

  useEffect(() => {
    if (!listing || state.copiedValue !== listing.agentPhone) {
      return;
    }

    const timeout = window.setTimeout(() => actions.setCopiedValue(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [actions, listing, state.copiedValue]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyFeedback(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  if (!listing) {
    return null;
  }

  const shortlisted = isListingShortlisted(state, listing.id);
  const dismissed = isListingDismissed(state, listing.id);
  const whatsappHref = toWhatsappHref(listing.agentPhone);
  const backRoute = state.lastVisitedRoute ?? "/listings";
  const copySucceeded = state.copiedValue === listing.agentPhone;

  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      document.referrer.startsWith(window.location.origin) &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push(backRoute);
  };

  const handleToggleShortlist = () => {
    actions.setListingShortlisted(listing.id, !shortlisted);
  };

  const handleCopyPhone = async () => {
    try {
      await copyText(listing.agentPhone);
      actions.setCopiedValue(listing.agentPhone);
      setCopyFeedback(null);
    } catch {
      setCopyFeedback("Copy failed");
    }
  };

  return (
    <section className="screen">
      <section
        className="detail-hero"
        style={{
          background:
            detailHeroBackgroundById[listing.id] ??
            "linear-gradient(160deg, #8fa9bb 0%, #566f8a 40%, #1d2c3e 100%)"
        }}
      >
        <div className="topbar-tight">
          <button
            aria-label="Back to previous screen"
            className="icon-button"
            onClick={handleBack}
            type="button"
          >
            <Icon name="arrow-left" />
          </button>
          <button
            aria-label={shortlisted ? "Remove property from shortlist" : "Save property to shortlist"}
            aria-pressed={shortlisted}
            className="icon-button"
            onClick={handleToggleShortlist}
            style={
              shortlisted
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
              <p className="listing-location" style={{ marginTop: 8 }}>
                <Icon name="map" /> {listing.address}, {listing.district}
              </p>
            </div>
            <span className="pill">{listing.tenure}</span>
          </div>

          <div className="tag-row" style={{ marginTop: 16 }}>
            <span className="tag-chip">{listing.bedrooms} Bed</span>
            <span className="tag-chip">{listing.bathrooms} Bath</span>
            <span className="tag-chip">{listing.sizeSqft} sqft</span>
            {shortlisted ? <span className="tag-chip tag-chip--active">Shortlisted</span> : null}
            {dismissed ? <span className="tag-chip">Hidden from listings queue</span> : null}
          </div>

          <p className="property-subline" style={{ marginTop: 14 }}>
            Price <strong>{formatCompactCurrency(listing.price)}</strong> •{" "}
            <strong>${listing.psf.toLocaleString()}</strong> psf
          </p>
        </article>

        <section className="metrics-grid">
          <article className="metric-box">
            <p className="small-label">MRT</p>
            <strong>{listing.mrtStation}</strong>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {listing.mrtWalkMins} min walk
            </p>
          </article>
          <article className="metric-box">
            <p className="small-label">IPS commute</p>
            <strong>{listing.ipsDriveMins} min</strong>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Estimated drive
            </p>
          </article>
          <article className="metric-box">
            <p className="small-label">TOP</p>
            <strong>{listing.topYear}</strong>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Completion year
            </p>
          </article>
          <article className="metric-box">
            <p className="small-label">Source</p>
            <strong>{listing.sourceSite}</strong>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {listing.listingId}
            </p>
          </article>
        </section>

        <article className="detail-section">
          <h2 className="title-sm">Why this listing stands out</h2>
          <p className="muted" style={{ lineHeight: 1.7, marginTop: 12 }}>
            {listing.notes} The current layout balances family living with commute convenience, and
            the psf remains easy to compare against the rest of your tracked queue.
          </p>
        </article>

        <article className="detail-section">
          <div className="card-head">
            <div>
              <p className="small-label">Map preview</p>
              <h2 className="title-sm">{listing.mrtStation} catchment</h2>
            </div>
            <span className="pill">{listing.mrtWalkMins} min MRT</span>
          </div>
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
            <a
              aria-label={`Call ${listing.agentName}`}
              className="list-action"
              href={`tel:${listing.agentPhone}`}
            >
              <Icon name="phone" />
            </a>
          </div>

          <p className="muted" style={{ lineHeight: 1.6, margin: "14px 0 0" }}>
            Reach out on WhatsApp for floor plans or call directly for launch availability.
          </p>

          <div className="inline-actions" style={{ marginTop: 16 }}>
            <a
              aria-label={`Open WhatsApp chat with ${listing.agentName}`}
              className="primary-cta"
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              <Icon name="message" /> WhatsApp
            </a>
            <button
              aria-label="Copy agent phone number"
              className="inline-button"
              onClick={handleCopyPhone}
              type="button"
            >
              <Icon name="copy" /> Copy
            </button>
          </div>

          <p aria-live="polite" className="muted" role="status" style={{ margin: "12px 0 0" }}>
            {copySucceeded ? "Phone number copied." : copyFeedback}
          </p>
        </article>
      </section>
    </section>
  );
}
