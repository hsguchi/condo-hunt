export const DEFAULT_USERNAME = "squarehero";
export const DEFAULT_PASSWORD = "hooga888";
export const SESSION_COOKIE_NAME = "condo_hunt_session";
export const SESSION_COOKIE_VALUE = "authenticated";

const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=86400; SameSite=Lax";

export const SESSION_COOKIE = `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}; ${SESSION_COOKIE_OPTIONS}`;
export const EXPIRED_SESSION_COOKIE = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;

export function isValidMockCredentials(username: string, password: string) {
  return username.trim() === DEFAULT_USERNAME && password === DEFAULT_PASSWORD;
}

export function createSessionCookieString() {
  return SESSION_COOKIE;
}

export function createExpiredSessionCookieString() {
  return EXPIRED_SESSION_COOKIE;
}
