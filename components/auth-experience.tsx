"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase-browser";

type Mode = "login" | "signup";

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AuthExperienceProps = {
  initialMode: Mode;
};

export function AuthExperience({ initialMode }: AuthExperienceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    setError(null);
    router.replace(`/auth?mode=${nextMode}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      if (supabase && isBrowserSupabaseConfigured) {
        if (mode === "signup") {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName
              }
            }
          });

          if (signUpError) {
            throw signUpError;
          }

          setMessage("Account created. Check your inbox to verify your email, then continue.");
          if (signUpData.session) {
            await wait(900);
            router.push("/app");
          }
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        setMessage("Welcome back. Opening your check-in.");
        await wait(650);
        router.push("/app");
        return;
      }

      await wait(850);
      setMessage(mode === "signup" ? "Demo account created. Supabase auth can be wired here next." : "Demo login successful.");
      router.push("/app");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="landing-glow landing-glow-left" />
      <div className="landing-glow landing-glow-right" />

      <section className="auth-panel auth-story landing-reveal" style={{ ["--delay" as string]: "0.08s" }}>
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" />
          <span>
            <strong>Neothera</strong>
            <small>Inside-out skin support</small>
          </span>
        </Link>

        <div className="auth-story-copy">
          <p className="hero-badge">Editorial, calm, and high-trust</p>
          <h1>{mode === "signup" ? "Start a calmer tracking ritual." : "Welcome back to your daily check-in."}</h1>
          <p className="landing-subcopy">
            The onboarding is intentionally soft: one clean sign-in surface, one clear next step, and a tracker that
            feels closer to a skincare concierge than a dashboard.
          </p>
        </div>

        <div className="auth-preview-card floating-card">
          <div className="device-summary-head">
            <span className="eyebrow">What you unlock</span>
            <span className="status-pill subtle">Frictionless</span>
          </div>
          <div className="timeline-list compact">
            <div className="timeline-row">
              <span>1</span>
              <p>Log by voice, photo, text, or selfie.</p>
            </div>
            <div className="timeline-row">
              <span>2</span>
              <p>Let AI structure your day for review.</p>
            </div>
            <div className="timeline-row">
              <span>3</span>
              <p>Build consistency and unlock pattern signals.</p>
            </div>
          </div>
        </div>

        <div className="moments-cloud left">
          <span className="moment-pill">Voice notes</span>
          <span className="moment-pill">Meal photos</span>
          <span className="moment-pill">Same as yesterday</span>
          <span className="moment-pill">Pattern teasers</span>
        </div>
      </section>

      <section className="auth-panel auth-form-panel landing-reveal" style={{ ["--delay" as string]: "0.16s" }}>
        <div className="auth-tabs">
          <button
            className={mode === "signup" ? "step-chip active" : "step-chip"}
            type="button"
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
          <button
            className={mode === "login" ? "step-chip active" : "step-chip"}
            type="button"
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
        </div>

        <div className="auth-form-copy">
          <p className="eyebrow">{mode === "signup" ? "Create account" : "Log in"}</p>
          <h2>{mode === "signup" ? "Build your acne check-in flow." : "Pick up where you left off."}</h2>
          <p className="support-copy">
            {mode === "signup"
              ? "Create an account to start saving daily logs, reminder preferences, and future pattern insights."
              : "Log in to access your reminder, saved entries, and your latest check-in summary."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="editor-field">
              <span>Full name</span>
              <input
                className="text-input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Vinayak Paka"
                required
              />
            </label>
          ) : null}

          <label className="editor-field">
            <span>Email</span>
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="editor-field">
            <span>Password</span>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
          </label>

          {message ? <div className="banner success">{message}</div> : null}
          {error ? <div className="banner error">{error}</div> : null}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="support-copy">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button className="text-link-button" type="button" onClick={() => switchMode(mode === "signup" ? "login" : "signup")}>
              {mode === "signup" ? "Log in instead" : "Create an account"}
            </button>
          </p>
          <Link className="ghost-button" href="/app">
            Continue to prototype
          </Link>
        </div>
      </section>
    </main>
  );
}
