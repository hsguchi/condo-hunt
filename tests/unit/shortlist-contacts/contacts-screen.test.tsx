import type { AnchorHTMLAttributes } from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactsScreen } from "@/components/contacts/contacts-screen";
import { mockClipboard, renderWithMockUiState } from "./test-utils";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("ContactsScreen", () => {
  beforeEach(() => {
    mockClipboard();
  });

  it("filters derived contacts and applies per-contact quick actions", async () => {
    const user = userEvent.setup();
    const { writeText } = mockClipboard();

    renderWithMockUiState(<ContactsScreen />, {
      route: "/contacts",
      seed: {
        shortlistedIds: ["1", "2", "3"]
      }
    });

    expect(await screen.findByText("2 agents across 3 shortlisted homes")).toBeInTheDocument();

    const statusFilters = screen.getByLabelText("Contact status filters");
    expect(within(statusFilters).getByRole("button", { name: /Pending/i })).toHaveTextContent(
      "1"
    );
    expect(within(statusFilters).getByRole("button", { name: /Contacted/i })).toHaveTextContent(
      "1"
    );

    await user.click(within(statusFilters).getByRole("button", { name: /Pending/i }));

    expect(screen.getByText("Sarah Lim")).toBeInTheDocument();
    expect(screen.queryByText("John Tan")).not.toBeInTheDocument();

    const sarahCard = screen.getByText("Sarah Lim").closest("article");
    expect(sarahCard).not.toBeNull();

    const sarahActions = within(sarahCard!);
    expect(sarahActions.getByRole("link", { name: "WhatsApp Sarah Lim" })).toHaveAttribute(
      "href",
      "https://wa.me/6587654321"
    );
    expect(sarahActions.getByRole("link", { name: "Call Sarah Lim" })).toHaveAttribute(
      "href",
      "tel:+6587654321"
    );

    await user.click(
      sarahActions.getByRole("button", { name: "Copy Sarah Lim phone number" })
    );

    expect(writeText).toHaveBeenCalledWith("+6587654321");
    expect(await sarahActions.findByRole("status")).toHaveTextContent("Number copied");

    await user.click(sarahActions.getByRole("button", { name: "Scheduled" }));

    expect(await screen.findByText("No pending contacts right now")).toBeInTheDocument();
    expect(within(statusFilters).getByRole("button", { name: /Pending/i })).toHaveTextContent(
      "0"
    );
    expect(within(statusFilters).getByRole("button", { name: /Scheduled/i })).toHaveTextContent(
      "1"
    );
  });

  it("opens the bulk surface from the shortlist CTA route and updates visible contacts in bulk", async () => {
    const user = userEvent.setup();
    const { writeText } = mockClipboard();

    renderWithMockUiState(<ContactsScreen />, {
      route: "/contacts?bulk=1",
      seed: {
        shortlistedIds: ["1", "2"]
      }
    });

    expect(await screen.findByLabelText("Bulk contact actions")).toBeInTheDocument();

    const bulkActions = screen.getByLabelText("Bulk contact actions");
    expect(within(bulkActions).getByText("2 contacts in view")).toBeInTheDocument();

    await user.click(within(bulkActions).getByRole("button", { name: "Copy visible numbers" }));

    expect(writeText).toHaveBeenCalledWith("+6587654321\n+6591234567");
    expect(await within(bulkActions).findByRole("status")).toHaveTextContent(
      "Visible numbers copied"
    );

    await user.click(
      within(bulkActions).getByRole("button", { name: "Mark visible scheduled" })
    );

    const statusFilters = screen.getByLabelText("Contact status filters");
    expect(within(statusFilters).getByRole("button", { name: /Pending/i })).toHaveTextContent(
      "0"
    );
    expect(within(statusFilters).getByRole("button", { name: /Contacted/i })).toHaveTextContent(
      "0"
    );
    expect(within(statusFilters).getByRole("button", { name: /Scheduled/i })).toHaveTextContent(
      "2"
    );
  });
});
