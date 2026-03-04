import Link from "next/link";

export default function WelcomePage() {
  return (
    <section className="auth-shell">
      <div className="auth-card auth-center">
        <p className="auth-kicker">WELCOME TO SONICFORGE</p>
        <h1>Premium Mobile Shopping Experience</h1>
        <p>Browse top products, track orders, manage addresses, and checkout securely in a mobile-first flow.</p>
        <div className="auth-actions">
          <Link href="/login" className="auth-primary">Sign In</Link>
          <Link href="/register" className="auth-secondary">Create Account</Link>
        </div>
      </div>
    </section>
  );
}
