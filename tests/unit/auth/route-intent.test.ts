import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_ROUTE_INTENT_STORAGE_KEY,
  clearStoredRouteIntent,
  getRouteIntentFromRequest,
  getRouteIntentLabel,
  normalizeRouteIntent,
  persistRouteIntent,
  readStoredRouteIntent,
  resolveRouteIntent,
} from "@/lib/auth/route-intent";

describe("route-intent helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("accepts only protected same-origin destinations", () => {
    expect(normalizeRouteIntent("/contacts?status=pending", "http://localhost")).toBe(
      "/contacts?status=pending",
    );
    expect(
      normalizeRouteIntent("http://localhost/property/12?source=listings", "http://localhost"),
    ).toBe("/property/12?source=listings");
    expect(normalizeRouteIntent("/", "http://localhost")).toBeNull();
    expect(normalizeRouteIntent("/settings", "http://localhost")).toBeNull();
    expect(
      normalizeRouteIntent("https://malicious.example/dashboard", "http://localhost"),
    ).toBeNull();
  });

  it("prefers a valid next param and otherwise falls back to the referer", () => {
    expect(
      getRouteIntentFromRequest({
        nextParam: "/shortlist?filter=ready",
        referer: "http://localhost/contacts",
        requestOrigin: "http://localhost",
      }),
    ).toBe("/shortlist?filter=ready");

    expect(
      getRouteIntentFromRequest({
        nextParam: "/",
        referer: "http://localhost/contacts?status=pending",
        requestOrigin: "http://localhost",
      }),
    ).toBe("/contacts?status=pending");
  });

  it("persists normalized route intent and clears stale values", () => {
    expect(persistRouteIntent("/dashboard")).toBe("/dashboard");
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBe("/dashboard");
    expect(readStoredRouteIntent()).toBe("/dashboard");

    window.sessionStorage.setItem(AUTH_ROUTE_INTENT_STORAGE_KEY, "/");
    expect(readStoredRouteIntent()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBeNull();

    expect(resolveRouteIntent([null, "/", "/property/18"], "http://localhost")).toBe("/property/18");

    clearStoredRouteIntent();
    expect(window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY)).toBeNull();
  });

  it("maps protected destinations to user-facing labels", () => {
    expect(getRouteIntentLabel("/dashboard")).toBe("Insights");
    expect(getRouteIntentLabel("/listings")).toBe("Discover");
    expect(getRouteIntentLabel("/shortlist")).toBe("Shortlist");
    expect(getRouteIntentLabel("/contacts")).toBe("Agents");
    expect(getRouteIntentLabel("/property/7")).toBe("the property details");
    expect(getRouteIntentLabel(null)).toBe("your workspace");
  });
});
