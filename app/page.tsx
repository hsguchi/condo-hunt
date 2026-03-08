import { LoginForm } from "@/components/login-form";
import { Icon } from "@/components/icon";

export default function LoginPage() {
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
        <button className="icon-button" type="button" aria-label="Info">
          i
        </button>
      </header>

      <div>
        <div className="welcome-orb">
          <Icon name="spark" />
        </div>
        <div className="login-copy">
          <h1 className="title-lg">Welcome Back</h1>
          <p className="muted">Log in to manage your properties efficiently</p>
        </div>
      </div>

      <div>
        <LoginForm />
      </div>

      <p className="footer-copy">
        Don&apos;t have an account? <a href="#">Create account</a>
      </p>
    </section>
  );
}
