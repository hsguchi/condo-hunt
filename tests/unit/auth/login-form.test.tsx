import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";
import {
  MockUiStateContext,
  type MockUiStateActions,
  type MockUiStateContextValue,
} from "@/components/providers/mock-ui-state-context";
import {
  createExpiredSessionCookieString,
  DEFAULT_PASSWORD,
  DEFAULT_USERNAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
} from "@/lib/auth/mock-session";
import { AUTH_ROUTE_INTENT_STORAGE_KEY } from "@/lib/auth/route-intent";
import { createMockUiState, type MockUiStateSeed } from "@/lib/mock-ui-state";

function createMockActions(): MockUiStateActions {
  return {
    resetState: vi.fn(),
    seedState: vi.fn(),
    setListingShortlisted: vi.fn(),
    dismissListing: vi.fn(),
    restoreListing: vi.fn(),
    setListingFilter: vi.fn(),
    replaceListingFilters: vi.fn(),
    clearListingFilters: vi.fn(),
    setShortlistFilter: vi.fn(),
    setContactStatus: vi.fn(),
    setCopiedValue: vi.fn(),
    setLastVisitedRoute: vi.fn(),
    setUiFlag: vi.fn(),
  };
}

function setDocumentReferrer(value = "") {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value,
  });
}

function renderLoginForm({
  initialRouteIntent = null,
  stateSeed,
}: {
  initialRouteIntent?: string | null;
  stateSeed?: MockUiStateSeed;
} = {}) {
  const contextValue: MockUiStateContextValue = {
    isHydrated: true,
    state: createMockUiState(stateSeed),
    actions: createMockActions(),
  };

  return render(
    <MockUiStateContext.Provider value={contextValue}>
      <LoginForm initialRouteIntent={initialRouteIntent} />
    </MockUiStateContext.Provider>,
  );
}

describe("LoginForm", () => {
  let assignSpy: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    vi.useFakeTimers();
    cleanup();
    window.sessionStorage.clear();
    document.cookie = createExpiredSessionCookieString();
    setDocumentReferrer("");

    originalLocation = window.location;
    assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignSpy,
        origin: originalLocation.origin,
      } as Location,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    document.cookie = createExpiredSessionCookieString();
    setDocumentReferrer("");
  });

  it("shows the preserved protected-route destination and neutralized recovery affordance", () => {
    renderLoginForm({
      stateSeed: {
        lastVisitedRoute: "/property/3",
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "After sign-in, you will return to the property details.",
    );
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBe("/property/3");
    expect(screen.getByText("Recovery disabled in mock mode")).toBeInTheDocument();
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
    expect(screen.getByTestId("login-status-region")).toHaveStyle("min-height: 2.75rem");
  });

  it("prefers a previously stored route intent over shared last-visited fallback", () => {
    window.sessionStorage.setItem(AUTH_ROUTE_INTENT_STORAGE_KEY, "/contacts?status=pending");

    renderLoginForm({
      stateSeed: {
        lastVisitedRoute: "/property/3",
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "After sign-in, you will return to Agents.",
    );
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBe(
      "/contacts?status=pending",
    );
  });

  it("rejects invalid credentials without leaving a valid session behind", async () => {
    document.cookie = `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`;

    renderLoginForm();

    fireEvent.change(screen.getByLabelText(/username or email/i), {
      target: { value: "wrong-user" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong-pass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    expect(screen.getByTestId("login-status-region")).toHaveAttribute("data-state", "pending");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      `Invalid credentials. Use the default login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`,
    );
    expect(document.cookie).not.toContain(`${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`);
    expect(assignSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-status-region")).toHaveAttribute("data-state", "invalid");
  });

  it("creates a session and redirects to the preserved destination after valid login", async () => {
    window.sessionStorage.setItem(AUTH_ROUTE_INTENT_STORAGE_KEY, "/shortlist?view=compact");

    renderLoginForm({
      initialRouteIntent: "/contacts",
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "After sign-in, you will return to Agents.",
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Signed in. Opening Agents...");
    expect(document.cookie).toContain(`${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`);
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("login-status-region")).toHaveAttribute("data-state", "success");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(240);
    });

    expect(assignSpy).toHaveBeenCalledWith("/contacts");
  });
});
