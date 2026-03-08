"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import type { ContactStatus } from "@/lib/mock-ui-state";
import { getContactStatusCounts, getDerivedContacts } from "@/lib/mock-selectors";

type ContactFilter = "all" | ContactStatus;

const contactStatuses: ContactStatus[] = ["pending", "contacted", "scheduled"];

const contactStatusCopy: Record<ContactStatus, string> = {
  pending: "Pending",
  contacted: "Contacted",
  scheduled: "Scheduled"
};

const activeContactBadgeStyles: Record<ContactStatus, { background: string; color: string }> = {
  pending: {
    background: "rgba(59, 130, 246, 0.16)",
    color: "#1d4ed8"
  },
  contacted: {
    background: "rgba(15, 23, 42, 0.12)",
    color: "#0f172a"
  },
  scheduled: {
    background: "rgba(16, 185, 129, 0.18)",
    color: "#047857"
  }
};

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getContactStatusLabel(status: ContactStatus) {
  return contactStatusCopy[status];
}

export function ContactsScreen() {
  const { isHydrated, state, actions } = useMockUiState();
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const contacts = getDerivedContacts(state);
  const counts = getContactStatusCounts(state);
  const visibleContacts =
    contactFilter === "all"
      ? contacts
      : contacts.filter((contact) => contact.status === contactFilter);
  const visiblePhoneBundle = visibleContacts.map((contact) => contact.phone).join("\n");
  const bulkActionIsOpen = state.uiFlags.contactAllSheetOpen;

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("bulk") === "1") {
      actions.setUiFlag("contactAllSheetOpen", true);
    }
  }, [actions, isHydrated]);

  useEffect(() => {
    if (!state.copiedValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      actions.setCopiedValue(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [state.copiedValue]);

  async function handleCopy(value: string) {
    try {
      await copyText(value);
    } catch {
      // Visible feedback still comes from copiedValue even if the browser blocks clipboard access.
    } finally {
      actions.setCopiedValue(value);
    }
  }

  function handleBulkStatusChange(status: ContactStatus) {
    visibleContacts.forEach((contact) => {
      actions.setContactStatus(contact.agentId, status);
    });
  }

  return (
    <section className="screen">
      <header className="topbar-tight">
        <Link href="/shortlist" scroll={false} className="icon-button" aria-label="Back">
          <Icon name="arrow-left" />
        </Link>
        <button
          className="icon-button"
          type="button"
          aria-label={contactFilter === "all" ? "Contacts filter already reset" : "Reset contact filter"}
          onClick={() => setContactFilter("all")}
          disabled={contactFilter === "all"}
        >
          <Icon name="tune" />
        </button>
      </header>

      <section>
        <h1 className="title-md">Contact Hub</h1>
        <p className="muted" aria-live="polite">
          {isHydrated
            ? `${contacts.length} ${contacts.length === 1 ? "agent" : "agents"} across ${contacts.reduce(
                (total, contact) => total + contact.listingCount,
                0
              )} shortlisted homes`
            : "Syncing shortlisted connections"}
        </p>
      </section>

      <div className="card-head">
        <div>
          <p className="small-label">Bulk actions</p>
          <h2 className="title-sm">Contact queue</h2>
        </div>
        <button
          className="small-link"
          type="button"
          onClick={() => actions.setUiFlag("contactAllSheetOpen", !bulkActionIsOpen)}
          style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
        >
          {bulkActionIsOpen ? "Hide" : "Open"}
        </button>
      </div>

      {bulkActionIsOpen ? (
        <section
          className="detail-section"
          aria-label="Bulk contact actions"
          style={{ display: "grid", gap: 14 }}
        >
          <div>
            <p className="small-label">
              {contactFilter === "all"
                ? `${visibleContacts.length} contacts in view`
                : `${visibleContacts.length} ${contactFilter} contacts in view`}
            </p>
            <h3 className="title-sm">Work the current queue</h3>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              className="primary-cta"
              type="button"
              onClick={() => handleCopy(visiblePhoneBundle)}
              disabled={!visibleContacts.length}
            >
              <Icon name="copy" />
              Copy visible numbers
            </button>
            <button
              className="inline-button"
              type="button"
              onClick={() => handleBulkStatusChange("contacted")}
              disabled={!visibleContacts.length}
            >
              Mark visible contacted
            </button>
            <button
              className="inline-button"
              type="button"
              onClick={() => handleBulkStatusChange("scheduled")}
              disabled={!visibleContacts.length}
            >
              Mark visible scheduled
            </button>
          </div>

          {state.copiedValue === visiblePhoneBundle && visiblePhoneBundle ? (
            <span className="match-status" role="status">
              Visible numbers copied
            </span>
          ) : null}

          {visibleContacts.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {visibleContacts.map((contact) => (
                <div
                  key={contact.agentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12
                  }}
                >
                  <div>
                    <strong>{contact.agentName}</strong>
                    <p className="muted" style={{ marginTop: 4 }}>
                      {contact.phone}
                    </p>
                  </div>
                  <a
                    className="list-action"
                    href={`https://wa.me/${contact.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${contact.agentName}`}
                  >
                    <Icon name="message" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No contacts match the current filter yet.</p>
          )}
        </section>
      ) : null}

      <section className="summary-grid summary-grid--simple" aria-label="Contact status filters">
        {contactStatuses.map((status) => {
          const isActive = contactFilter === status;

          return (
            <button
              key={status}
              type="button"
              className={`summary-chip${isActive ? " summary-chip--active" : ""}`}
              aria-pressed={isActive}
              onClick={() => setContactFilter((currentFilter) => (currentFilter === status ? "all" : status))}
              style={{
                border: 0,
                font: "inherit",
                width: "100%",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              <div>
                <span className="summary-chip__label">{getContactStatusLabel(status)}</span>
                <strong>{counts[status]}</strong>
              </div>
            </button>
          );
        })}
      </section>

      <div className="card-head">
        <div>
          <p className="small-label">Recent matches</p>
          <h2 className="title-sm">
            {contactFilter === "all"
              ? "Most relevant contacts"
              : `${getContactStatusLabel(contactFilter)} contacts`}
          </h2>
        </div>
        <button
          className="small-link"
          type="button"
          onClick={() => setContactFilter("all")}
          disabled={contactFilter === "all"}
          style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
        >
          View all
        </button>
      </div>

      {isHydrated ? (
        visibleContacts.length > 0 ? (
          <section className="screen" style={{ gap: 12 }}>
            {visibleContacts.map((contact, index) => {
              const whatsappHref = `https://wa.me/${contact.phone.replace(/[^\d]/g, "")}`;
              const copiedThisContact = state.copiedValue === contact.phone;

              return (
                <article
                  className="contact-card contact-card--tight"
                  key={contact.agentId}
                  style={{ alignItems: "stretch" }}
                >
                  <div
                    className="contact-thumb contact-thumb--stack"
                    data-badge={contact.badge}
                    style={{ opacity: 1 - index * 0.08 }}
                  />

                  <div
                    className="contact-main"
                    style={{ display: "grid", gap: 12, alignContent: "start" }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12
                        }}
                      >
                        <div>
                          <strong>{contact.agentName}</strong>
                          <p className="contact-role">
                            {contact.phone} · {contact.listingCount} {contact.listingCount === 1 ? "home" : "homes"}
                          </p>
                        </div>
                        <span
                          className="match-status"
                          style={activeContactBadgeStyles[contact.status]}
                        >
                          {getContactStatusLabel(contact.status)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 8
                        }}
                      >
                        <span className="contact-badge">{contact.agency}</span>
                        {copiedThisContact ? (
                          <span className="match-status" role="status">
                            Number copied
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {contact.listingIds.map((listingId, listingIndex) => (
                        <Link
                          key={listingId}
                          href={`/property/${listingId}`}
                          scroll={false}
                          className="contact-badge"
                          style={{ textDecoration: "none" }}
                        >
                          {contact.listingNames[listingIndex]}
                        </Link>
                      ))}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <a
                          className="list-action"
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp ${contact.agentName}`}
                        >
                          <Icon name="message" />
                        </a>
                        <a
                          className="list-action"
                          href={`tel:${contact.phone}`}
                          aria-label={`Call ${contact.agentName}`}
                        >
                          <Icon name="phone" />
                        </a>
                        <button
                          className="list-action"
                          type="button"
                          onClick={() => handleCopy(contact.phone)}
                          aria-label={`Copy ${contact.agentName} phone number`}
                        >
                          <Icon name="copy" />
                        </button>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {contactStatuses.map((status) => {
                          const isActive = status === contact.status;

                          return (
                            <button
                              key={status}
                              className="contact-badge"
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => actions.setContactStatus(contact.agentId, status)}
                              style={
                                isActive
                                  ? {
                                      ...activeContactBadgeStyles[status],
                                      border: 0,
                                      cursor: "pointer",
                                      font: "inherit"
                                    }
                                  : { border: 0, cursor: "pointer", font: "inherit" }
                              }
                            >
                              {getContactStatusLabel(status)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-card" style={{ display: "grid", gap: 12, padding: 20 }}>
            <div>
              <h2 className="title-sm">
                {contactFilter === "all"
                  ? "No shortlisted agents yet"
                  : `No ${contactFilter} contacts right now`}
              </h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {contactFilter === "all"
                  ? "Save a property to bring its agent into Contact Hub."
                  : "Switch filters or shortlist another home to expand this queue."}
              </p>
            </div>
            <Link className="primary-cta" href="/shortlist" scroll={false}>
              Review shortlist
            </Link>
          </section>
        )
      ) : (
        <section className="empty-card" style={{ padding: 20 }}>
          <p className="muted">Loading shortlisted contacts...</p>
        </section>
      )}
    </section>
  );
}
