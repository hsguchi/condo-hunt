"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/listings", label: "Listings" },
  { href: "/contacts", label: "Contact Hub" },
  { href: "/shortlist", label: "Shortlist" }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand-mark">CH</div>
      <div className="brand-copy">
        <h1>Condo Hunt</h1>
        <p>Track launches, shortlist homes, and contact agents without losing context.</p>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} className="nav-link" data-active={isActive}>
              <span>{item.label}</span>
              <span aria-hidden="true">+</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
