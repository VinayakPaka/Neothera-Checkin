import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="profile-shell">
      <section className="profile-panel">
        <header className="profile-header">
          <p className="eyebrow">Account</p>
          <h1>Your profile</h1>
          <p className="support-copy">Manage your account session and check the identity currently linked to your logs.</p>
        </header>

        <article className="profile-card">
          <div className="profile-row">
            <span>Name</span>
            <strong>{user.fullName ?? "User"}</strong>
          </div>
          <div className="profile-row">
            <span>Email</span>
            <strong>{user.email ?? "Email unavailable"}</strong>
          </div>
          <div className="profile-row">
            <span>User ID</span>
            <strong className="mono">{user.id}</strong>
          </div>
        </article>

        <div className="profile-actions">
          <Link className="secondary-button" href="/app">
            Back to tracker
          </Link>
          <Link className="ghost-button" href="/">
            Home
          </Link>
          <form action="/auth/signout" method="post">
            <button className="primary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
