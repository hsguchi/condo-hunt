import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { Icon } from "@/components/icon";
import { getRouteIntentFromRequest, getRouteIntentLabel } from "@/lib/auth/route-intent";

interface LoginPageProps {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

function getRequestOrigin(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const headerStore = await headers();
  const initialRouteIntent = getRouteIntentFromRequest({
    nextParam: resolvedSearchParams.next,
    referer: headerStore.get("referer"),
    requestOrigin: getRequestOrigin(headerStore)
  });
  const subtitle = initialRouteIntent
    ? `Sign in to continue to ${getRouteIntentLabel(initialRouteIntent)}.`
    : "Log in to manage your properties efficiently";
  const footerCopy = initialRouteIntent
    ? `Mock access only. Use the demo credentials below to continue to ${getRouteIntentLabel(initialRouteIntent)}.`
    : "Mock access only. Use the demo credentials below to continue.";

  return (
    <section className="login-card">
      <header className="login-header">
        <div className="brand-row">
          <span className="brand-badge">
            <Icon name="home" />
          </span>
          <div className="brand-copy">
            <strong>Property Tracker</strong>
          </div>
        </div>
        <span className="icon-button" aria-label="Mock access only" title="Mock access only">
          M
        </span>
      </header>

      <div>
        <div className="welcome-orb">
          <Icon name="spark" />
        </div>
        <div className="login-copy">
          <h1 className="title-lg">Welcome Back</h1>
          <p className="muted">{subtitle}</p>
        </div>
      </div>

      <div>
        <LoginForm initialRouteIntent={initialRouteIntent} />
      </div>

      <p className="footer-copy">{footerCopy}</p>
    </section>
  );
}
