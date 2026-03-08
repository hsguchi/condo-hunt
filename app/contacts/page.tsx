import Link from "next/link";
import { Icon } from "@/components/icon";

const contacts = [
  {
    name: "Sarah Tan",
    role: "The Interlace",
    agency: "Priority",
    badge: "S"
  },
  {
    name: "David Lim",
    role: "Reflections at Keppel",
    agency: "Follow up",
    badge: "D"
  },
  {
    name: "Jessica Koh",
    role: "M Woods Residence",
    agency: "New",
    badge: "J"
  },
  {
    name: "Michael Chen",
    role: "Sky Habitat",
    agency: "Scheduled",
    badge: "M"
  }
];

export default function ContactsPage() {
  return (
    <section className="screen">
      <header className="topbar-tight">
        <Link href="/shortlist" scroll={false} className="icon-button" aria-label="Back">
          <Icon name="arrow-left" />
        </Link>
        <button className="icon-button" type="button" aria-label="Filter contacts">
          <Icon name="tune" />
        </button>
      </header>

      <section>
        <h1 className="title-md">Contact Hub</h1>
        <p className="muted">Your shortlisted connections</p>
      </section>

      <section className="summary-grid summary-grid--simple">
        <article className="summary-chip summary-chip--active">
          <div>
            <span className="summary-chip__label">Pending</span>
            <strong>4</strong>
          </div>
        </article>
        <article className="summary-chip">
          <div>
            <span className="summary-chip__label">Contacted</span>
            <strong>12</strong>
          </div>
        </article>
        <article className="summary-chip">
          <div>
            <span className="summary-chip__label">Scheduled</span>
            <strong>2</strong>
          </div>
        </article>
      </section>

      <div className="card-head">
        <div>
          <p className="small-label">Recent matches</p>
          <h2 className="title-sm">Most relevant contacts</h2>
        </div>
        <a className="small-link" href="#">
          View all
        </a>
      </div>

      <section className="screen" style={{ gap: 12 }}>
        {contacts.map((contact, index) => (
          <article className="contact-card contact-card--tight" key={contact.name}>
            <div className="contact-thumb contact-thumb--stack" data-badge={contact.badge} style={{ opacity: 1 - index * 0.08 }} />
            <div className="contact-main">
              <strong>{contact.name}</strong>
              <p className="contact-role">{contact.role}</p>
              <div className="contact-badges">
                <span className="contact-badge">{contact.agency}</span>
                <span className="match-status">Rapid reply</span>
              </div>
            </div>
            <a className="list-action" href={`https://wa.me/659123456${index}`}>
              <Icon name="message" />
            </a>
          </article>
        ))}
      </section>
    </section>
  );
}
