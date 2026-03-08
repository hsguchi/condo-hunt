import type { ReactNode } from "react";

export interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <div className="main-panel">
      <section className="hero-card">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        {actions ? <div className="action-row">{actions}</div> : null}
      </section>
      {children}
    </div>
  );
}
