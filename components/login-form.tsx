"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMockUiState } from "@/components/providers/mock-ui-state-context";
import { Icon } from "@/components/icon";
import {
  createExpiredSessionCookieString,
  createSessionCookieString,
  DEFAULT_PASSWORD,
  DEFAULT_USERNAME,
  isValidMockCredentials
} from "@/lib/auth/mock-session";
import {
  clearStoredRouteIntent,
  DEFAULT_AUTH_REDIRECT,
  getRouteIntentLabel,
  normalizeRouteIntent,
  persistRouteIntent,
  readStoredRouteIntent,
  resolveRouteIntent
} from "@/lib/auth/route-intent";

interface LoginFormProps {
  initialRouteIntent?: string | null;
}

type SubmissionState = "idle" | "pending" | "success" | "invalid";

const PENDING_DELAY_MS = 400;
const SUCCESS_REDIRECT_DELAY_MS = 240;
const STATUS_REGION_MIN_HEIGHT = "2.75rem";

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export function LoginForm({ initialRouteIntent = null }: LoginFormProps) {
  const { state } = useMockUiState();
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [redirectTarget, setRedirectTarget] = useState<string | null>(initialRouteIntent);
  const isMountedRef = useRef(true);
  const statusMessageId = useId();
  const credentialHintId = useId();
  const recoveryHintId = useId();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextRedirectTarget = resolveRouteIntent(
      [
        initialRouteIntent,
        readStoredRouteIntent(),
        normalizeRouteIntent(document.referrer, window.location.origin),
        normalizeRouteIntent(state.lastVisitedRoute, window.location.origin)
      ],
      window.location.origin
    );

    setRedirectTarget(nextRedirectTarget);
    persistRouteIntent(nextRedirectTarget);
  }, [initialRouteIntent, state.lastVisitedRoute]);

  const destinationLabel = getRouteIntentLabel(redirectTarget);
  const isBusy = submissionState === "pending" || submissionState === "success";
  const hasInvalidCredentials = submissionState === "invalid";
  const statusMessage =
    submissionState === "pending"
      ? redirectTarget
        ? `Checking access to ${destinationLabel}...`
        : "Checking access..."
      : submissionState === "success"
        ? redirectTarget
          ? `Signed in. Opening ${destinationLabel}...`
          : "Signed in. Opening Insights..."
        : submissionState === "invalid"
          ? `Invalid credentials. Use the default login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`
          : redirectTarget
            ? `After sign-in, you will return to ${destinationLabel}.`
            : "Sign in with the default demo credentials below.";
  const statusClassName = hasInvalidCredentials ? "login-error" : "helper-text";
  const submitLabel =
    submissionState === "pending"
      ? "Signing In..."
      : submissionState === "success"
        ? "Redirecting..."
        : "Sign In";
  const describedBy = `${credentialHintId} ${recoveryHintId} ${statusMessageId}`;

  function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value);

    if (submissionState === "invalid") {
      setSubmissionState("idle");
    }
  }

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);

    if (submissionState === "invalid") {
      setSubmissionState("idle");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    document.cookie = createExpiredSessionCookieString();
    setSubmissionState("pending");

    await wait(PENDING_DELAY_MS);

    if (!isMountedRef.current) {
      return;
    }

    if (!isValidMockCredentials(username, password)) {
      document.cookie = createExpiredSessionCookieString();
      setSubmissionState("invalid");
      return;
    }

    const nextDestination =
      resolveRouteIntent(
        [
          redirectTarget,
          readStoredRouteIntent(),
          normalizeRouteIntent(state.lastVisitedRoute, window.location.origin)
        ],
        window.location.origin
      ) ?? DEFAULT_AUTH_REDIRECT;

    document.cookie = createSessionCookieString();
    clearStoredRouteIntent();
    setSubmissionState("success");

    await wait(SUCCESS_REDIRECT_DELAY_MS);

    if (!isMountedRef.current) {
      return;
    }

    window.location.assign(nextDestination);
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isBusy} data-state={submissionState}>
      <div className="form-grid">
        <label className="field-wrap">
          <span className="field-label">Username or Email</span>
          <span className="input-shell">
            <span className="input-icon">
              <Icon name="mail" />
            </span>
            <input
              value={username}
              onChange={handleUsernameChange}
              aria-label="Username or email"
              aria-describedby={describedBy}
              aria-invalid={hasInvalidCredentials}
              autoComplete="username"
              autoFocus
              disabled={isBusy}
              required
            />
          </span>
        </label>

        <label className="field-wrap">
          <span className="field-head">
            <span className="field-label">Password</span>
            <span className="small-label" id={recoveryHintId}>
              Recovery disabled in mock mode
            </span>
          </span>
          <span className="input-shell">
            <span className="input-icon">
              <Icon name="lock" />
            </span>
            <input
              value={password}
              onChange={handlePasswordChange}
              type="password"
              aria-label="Password"
              aria-describedby={describedBy}
              aria-invalid={hasInvalidCredentials}
              autoComplete="current-password"
              disabled={isBusy}
              required
            />
          </span>
        </label>
      </div>

      <div className="login-actions">
        <button className="primary-button" type="submit" disabled={isBusy} aria-disabled={isBusy}>
          {submitLabel}
          <Icon name="arrow-left" style={{ transform: "rotate(180deg)" }} />
        </button>
      </div>

      <p className="helper-text" id={credentialHintId}>
        Default login: {DEFAULT_USERNAME} / {DEFAULT_PASSWORD}
      </p>
      <div
        data-testid="login-status-region"
        aria-live={hasInvalidCredentials ? "assertive" : "polite"}
        aria-atomic="true"
        data-state={submissionState}
        style={{ minHeight: STATUS_REGION_MIN_HEIGHT }}
      >
        <p
          id={statusMessageId}
          className={statusClassName}
          role={hasInvalidCredentials ? "alert" : "status"}
          style={{ marginTop: 8 }}
        >
          {statusMessage}
        </p>
      </div>
      <p className="helper-text">
        Single demo account only. Social sign-in and account creation are unavailable in this mock flow.
      </p>
    </form>
  );
}
