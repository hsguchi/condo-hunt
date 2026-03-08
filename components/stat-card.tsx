import type { DashboardMetric } from "@/types/models";

export function StatCard({ label, value, hint }: DashboardMetric) {
  return (
    <article className="hero-card stat-card">
      <p className="eyebrow">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="meta">{hint}</p>
    </article>
  );
}
