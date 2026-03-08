"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";

interface AppShellProps {
  children: ReactNode;
}

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/listings", label: "Discover", icon: "home" },
  { href: "/shortlist", label: "Shortlist", icon: "heart" },
  { href: "/contacts", label: "Agents", icon: "message" },
  { href: "/dashboard", label: "Insights", icon: "profile" }
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/";

  return (
    <div className="app-root">
      <div className="phone-shell-shell">
        <div className={`phone-shell${isLogin ? " phone-shell--login" : ""}`}>
          <div className={`phone-content${isLogin ? " phone-content--login" : ""}`}>{children}</div>
        </div>

        {!isLogin ? (
          <nav className="bottom-nav" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  className="bottom-nav__item"
                  data-active={isActive}
                >
                  <span className="bottom-nav__icon-wrap">
                    <Icon name={item.icon} className="bottom-nav__icon" />
                    {item.href === "/contacts" ? <span className="bottom-nav__dot" /> : null}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
