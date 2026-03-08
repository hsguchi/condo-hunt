import Link from "next/link";
import { Icon } from "@/components/icon";

const shortlist = [
  { name: "The Interlace", area: "Depot Road, D04", price: "$1.2M" },
  { name: "D'Leedon", area: "Tanjong Rhu", price: "$2.1M" },
  { name: "Sky Habitat", area: "Bishan, D20", price: "$950K" },
  { name: "Reflections", area: "Keppel Bay, D04", price: "$1.8M" },
  { name: "Marina Modern", area: "River Valley, D09", price: "$2.2M" },
  { name: "The Tembusu", area: "Kovan, D19", price: "$1.5M" }
];

export default function ShortlistPage() {
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
        <button className="icon-button" type="button" aria-label="Filter shortlist">
          <Icon name="tune" />
        </button>
      </header>

      <section>
        <h1 className="title-md">Shortlist</h1>
        <p className="muted">8 properties saved</p>
      </section>

      <div className="filter-row filter-row--scroll">
        <span className="filter-pill filter-pill--active">All Homes</span>
        <span className="filter-pill">Under $1.5M</span>
        <span className="filter-pill">High Yield</span>
      </div>

      <section className="short-grid short-grid--visual">
        {shortlist.map((item, index) => (
          <article className="short-card short-card--tight" key={item.name}>
            <div
              className="short-card__visual"
              style={{
                background:
                  index % 3 === 0
                    ? "linear-gradient(135deg, #7dd3fc 0%, #1d4ed8 100%)"
                    : index % 3 === 1
                      ? "linear-gradient(135deg, #60a5fa 0%, #64748b 100%)"
                      : "linear-gradient(135deg, #9bd8c8 0%, #6b7280 100%)"
              }}
            >
              <span className="short-card__close">x</span>
              <span className="short-card__badge">{item.price}</span>
            </div>
            <div>
              <strong>{item.name}</strong>
              <p className="muted short-card__meta">{item.area}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="contact-all contact-all--raised">
        <Link className="primary-cta" href="/contacts">
          Contact All Agents
        </Link>
      </div>
    </section>
  );
}
