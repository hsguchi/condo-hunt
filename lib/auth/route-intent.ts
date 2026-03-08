export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const AUTH_ROUTE_INTENT_STORAGE_KEY = "condo-hunt.auth.route-intent";

const protectedRoutePrefixes = ["/dashboard", "/listings", "/shortlist", "/contacts", "/property"];

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

export function isProtectedRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return protectedRoutePrefixes.some(
    (prefix) =>
      normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
  );
}

export function normalizeRouteIntent(rawValue?: string | null, requestOrigin?: string | null) {
  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    let candidateUrl: URL;

    if (trimmedValue.startsWith("/")) {
      candidateUrl = new URL(trimmedValue, requestOrigin ?? "https://condo-hunt.local");
    } else {
      candidateUrl = new URL(trimmedValue);

      if (requestOrigin && candidateUrl.origin !== requestOrigin) {
        return null;
      }

      if (!requestOrigin && candidateUrl.origin !== "null") {
        return null;
      }
    }

    const pathname = normalizePathname(candidateUrl.pathname);

    if (!isProtectedRoute(pathname)) {
      return null;
    }

    return `${pathname}${candidateUrl.search}${candidateUrl.hash}`;
  } catch {
    return null;
  }
}

export function resolveRouteIntent(
  candidates: Array<string | null | undefined>,
  requestOrigin?: string | null
) {
  for (const candidate of candidates) {
    const normalizedIntent = normalizeRouteIntent(candidate, requestOrigin);

    if (normalizedIntent) {
      return normalizedIntent;
    }
  }

  return null;
}

export function getRouteIntentFromRequest(options: {
  nextParam?: string | string[];
  referer?: string | null;
  requestOrigin?: string | null;
}) {
  const nextParamValue = Array.isArray(options.nextParam)
    ? options.nextParam[0]
    : options.nextParam;

  return resolveRouteIntent([nextParamValue, options.referer], options.requestOrigin);
}

export function getRouteIntentLabel(routeIntent?: string | null) {
  if (!routeIntent) {
    return "your workspace";
  }

  if (routeIntent.startsWith("/dashboard")) {
    return "Insights";
  }

  if (routeIntent.startsWith("/listings")) {
    return "Discover";
  }

  if (routeIntent.startsWith("/shortlist")) {
    return "Shortlist";
  }

  if (routeIntent.startsWith("/contacts")) {
    return "Agents";
  }

  if (routeIntent.startsWith("/property")) {
    return "the property details";
  }

  return "your requested page";
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readStoredRouteIntent() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const persistedValue = window.sessionStorage.getItem(AUTH_ROUTE_INTENT_STORAGE_KEY);
  const normalizedIntent = normalizeRouteIntent(persistedValue, window.location.origin);

  if (!normalizedIntent && persistedValue) {
    window.sessionStorage.removeItem(AUTH_ROUTE_INTENT_STORAGE_KEY);
  }

  return normalizedIntent;
}

export function persistRouteIntent(routeIntent?: string | null) {
  if (!canUseSessionStorage()) {
    return null;
  }

  const normalizedIntent = normalizeRouteIntent(routeIntent, window.location.origin);

  if (!normalizedIntent) {
    window.sessionStorage.removeItem(AUTH_ROUTE_INTENT_STORAGE_KEY);
    return null;
  }

  window.sessionStorage.setItem(AUTH_ROUTE_INTENT_STORAGE_KEY, normalizedIntent);

  return normalizedIntent;
}

export function clearStoredRouteIntent() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(AUTH_ROUTE_INTENT_STORAGE_KEY);
}
