"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

const DEFAULT_USERNAME = "squarehero";
const DEFAULT_PASSWORD = "hooga888";
const SESSION_COOKIE = "condo_hunt_session=authenticated; Path=/; Max-Age=86400; SameSite=Lax";

export function LoginForm() {
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      document.cookie = SESSION_COOKIE;
      setError("");
      window.location.assign("/dashboard");
      return;
    }

    document.cookie = "condo_hunt_session=; Path=/; Max-Age=0; SameSite=Lax";
    setError("Use the default login: squarehero / hooga888");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field-wrap">
          <span className="field-label">Username or Email</span>
          <span className="input-shell">
            <span className="input-icon">
              <Icon name="mail" />
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-label="Username or email"
              autoComplete="username"
            />
          </span>
        </label>

        <label className="field-wrap">
          <span className="field-head">
            <span className="field-label">Password</span>
            <span className="small-link">Forgot password?</span>
          </span>
          <span className="input-shell">
            <span className="input-icon">
              <Icon name="lock" />
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              aria-label="Password"
              autoComplete="current-password"
            />
          </span>
        </label>
      </div>

      <div className="checkbox-row">
        <span className="checkbox" aria-hidden="true" />
        <span className="small-label">Remember this device</span>
      </div>

      <div className="login-actions">
        <button className="primary-button" type="submit">
          Sign In
          <Icon name="arrow-left" style={{ transform: "rotate(180deg)" }} />
        </button>
      </div>

      <p className="helper-text">Default login: squarehero / hooga888</p>
      {error ? <p className="login-error">{error}</p> : null}

      <div className="divider">
        <span>OR CONTINUE WITH</span>
      </div>

      <div className="social-row">
        <button className="social-button" type="button">
          <Icon name="google" className="social-icon" />
          Google
        </button>
        <button className="social-button" type="button">
          <Icon name="apple" className="social-icon" />
          Apple
        </button>
      </div>
    </form>
  );
}
