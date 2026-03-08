import type { AnchorHTMLAttributes } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { DashboardClient } from "@/components/providers/dashboard-client";
import { MockUiStateProvider } from "@/components/providers/mock-ui-state-provider";
import { MOCK_UI_STATE_STORAGE_KEY, createMockUiState } from "@/lib/mock-ui-state";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("DashboardClient", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders dashboard metrics and follow-up copy from the shared persisted state", async () => {
    window.localStorage.setItem(
      MOCK_UI_STATE_STORAGE_KEY,
      JSON.stringify(
        createMockUiState({
          shortlistedIds: ["2"],
          dismissedIds: ["1", "3"],
          contactStatusByAgentId: {
            "2": "scheduled"
          }
        })
      )
    );

    render(
      <MockUiStateProvider>
        <DashboardClient />
      </MockUiStateProvider>
    );

    await waitFor(() => expect(screen.getByText("1 tracked")).toBeInTheDocument());
    expect(screen.getAllByText("$3.19M")).toHaveLength(2);
    expect(
      screen.getByText(
        "1 districts remain active after dismissals, with shortlist PSF averaging 2600."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("The Continuum")).toBeInTheDocument();
    expect(screen.queryByText("Meyer Crest")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "All shortlisted agents are already in motion. Use Contact Hub to schedule the next viewing."
      )
    ).toBeInTheDocument();
  });
});
