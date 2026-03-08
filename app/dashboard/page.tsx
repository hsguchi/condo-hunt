import { Icon } from "@/components/icon";
import { sampleListings } from "@/lib/sample-data";

const topDeals = [
  { name: "The Interlace", meta: "D04  •  +4.2% vs avg", price: "$1.2M" },
  { name: "D'Leedon", meta: "D10  •  -2.1% vs avg", price: "$1.5M" },
  { name: "Sky Habitat", meta: "D20  •  +1.5% vs avg", price: "$1.35M" }
];

export default function DashboardPage() {
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
        <span className="avatar">AL</span>
      </header>

      <section className="hero-card">
        <div className="greeting-row">
          <div>
            <p className="kicker">Good Morning</p>
            <h1 className="title-xl">Alex.</h1>
            <p className="muted">Here is your property pulse for today.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Focus mode">
            <Icon name="spark" />
          </button>
        </div>

        <div className="stats-row" style={{ marginTop: 24 }}>
          <article className="stats-tile">
            <span className="metric-caption">Viewed</span>
            <strong className="metric-value">42</strong>
          </article>
          <article className="stats-tile stats-tile--active">
            <span className="metric-caption">Saved</span>
            <strong className="metric-value">8</strong>
          </article>
          <article className="stats-tile">
            <span className="metric-caption">Avg</span>
            <strong className="metric-value">$1.8M</strong>
          </article>
        </div>
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Market Position</p>
            <h2 className="title-sm">Best value pockets today</h2>
          </div>
          <span className="pill">Analysis</span>
        </div>
        <div className="scatter-plot">
          <span className="scatter-dot" style={{ left: "16%", bottom: "28%" }} />
          <span className="scatter-dot" style={{ left: "38%", bottom: "46%" }} />
          <span className="scatter-dot" style={{ left: "52%", bottom: "36%" }} />
          <span className="scatter-dot" style={{ left: "66%", bottom: "60%" }} />
          <span className="scatter-dot" style={{ left: "78%", bottom: "72%" }} />
        </div>
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Top 3 Value Deals</p>
            <h2 className="title-sm">High-conviction candidates</h2>
          </div>
          <a className="small-link" href="/shortlist">
            View All
          </a>
        </div>
        <div className="deals-list" style={{ marginTop: 16 }}>
          {topDeals.map((deal, index) => (
            <article className="deal-item" key={deal.name}>
              <div className="deal-visual" style={{ opacity: 1 - index * 0.15 }} />
              <div className="deal-copy">
                <strong>{deal.name}</strong>
                <div className="deal-meta">{deal.meta}</div>
              </div>
              <strong>{deal.price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="hero-card chart-card">
        <div className="card-head">
          <div>
            <p className="small-label">Next Best Step</p>
            <h2 className="title-sm">Contact the most responsive agents</h2>
          </div>
          <a className="small-link" href="/contacts">
            Open Hub
          </a>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          {sampleListings[0].agentName} and {sampleListings[1].agentName} currently hold the fastest
          response times across your shortlist.
        </p>
      </section>
    </section>
  );
}
