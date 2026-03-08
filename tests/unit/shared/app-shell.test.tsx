import type { AnchorHTMLAttributes } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { MOCK_UI_STATE_STORAGE_KEY, createMockUiState } from "@/lib/mock-ui-state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname()
}));

function readStoredState() {
  const storedValue = window.localStorage.getItem(MOCK_UI_STATE_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  return JSON.parse(storedValue);
}

describe("AppShell", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/dashboard");
  });

  afterEach(() => {
    window.localStorage.clear();
    mockUsePathname.mockReset();
  });

  it("renders the fixed primary nav and records the last visited route in shared state", async () => {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(
        createMockUiState({
          shortlistedIds: ["1", "2"]
        })
      )
    );

    const { container } = render(
      <AppShell>
        <div>Insights body</div>
      </AppShell>
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/listings");
    expect(screen.getByRole("link", { name: "Shortlist" })).toHaveAttribute("href", "/shortlist");
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAttribute("href", "/contacts");
    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".bottom-nav__dot")).not.toBeNull();

    await waitFor(() =>
      expect(readStoredState()).toMatchObject({
        lastVisitedRoute: "/dashboard"
      })
    );
  });

  it("preserves the previous non-detail route while rendering property detail pages", async () => {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(
        createMockUiState({
          lastVisitedRoute: "/contacts"
        })
      )
    );

    mockUsePathname.mockReturnValue("/property/2");

    render(
      <AppShell>
        <div>Property detail body</div>
      </AppShell>
    );

    await waitFor(() =>
      expect(readStoredState()).toMatchObject({
        lastVisitedRoute: "/contacts"
      })
    );
  });
});
