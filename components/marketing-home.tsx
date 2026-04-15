import Link from "next/link";
import { ProgressiveImage } from "@/components/progressive-image";

const featureCards = [
  {
    title: "Natural inputs, not forms",
    copy: "Users log with a quick note, a meal photo, a voice memo, or an optional skin selfie instead of filling a tedious tracker."
  },
  {
    title: "AI turns it structured",
    copy: "Food, skincare, symptoms, sleep, stress, and adherence are extracted into a clean daily log ready for one-tap confirmation."
  },
  {
    title: "Consistency compounds",
    copy: "The product reinforces streaks, saved history, and pattern teasers so the value of logging becomes visible quickly."
  }
];

const steps = [
  "Gentle reminder arrives at the right time.",
  "User logs via text, photo, voice, or selfie.",
  "AI summarizes the day into a structured acne entry.",
  "User confirms once and the day is complete."
];

const moments = [
  "Same as yesterday",
  "Voice-to-log",
  "Photo + caption parsing",
  "Skin change memory",
  "Pattern teasers"
];

const skincareImages = [
  {
    src: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1400&q=80",
    alt: "Minimal skincare bottles on a neutral editorial setup"
  },
  {
    src: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1400&q=80",
    alt: "Skincare serum bottle with soft natural lighting"
  },
  {
    src: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1400&q=80",
    alt: "Self-care scene with skincare product and calm tone"
  }
];

export function MarketingHome() {
  return (
    <main className="landing-shell">
      <div className="landing-glow landing-glow-left" />
      <div className="landing-glow landing-glow-right" />

      <header className="landing-nav landing-reveal" style={{ ["--delay" as string]: "0.05s" }}>
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" />
          <span>
            <strong>Neothera</strong>
            <small>Daily check-ins for calmer skin</small>
          </span>
        </Link>
        <nav className="landing-nav-links">
          <a href="#product">Product</a>
          <a href="#flow">Flow</a>
          <a href="#value">Value</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="ghost-button" href="/auth?mode=login">
            Log in
          </Link>
          <Link className="primary-button" href="/auth?mode=signup">
            Start free
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy landing-reveal" style={{ ["--delay" as string]: "0.12s" }}>
          <p className="hero-badge">Inside-out skincare, without the friction</p>
          <h1>Clearer skin starts with a check-in you actually finish.</h1>
          <p className="landing-subcopy">
            Neothera turns meal photos, voice notes, short chat messages, and skin selfies into structured acne logs so
            users can track their day in seconds, not with another form.
          </p>
          <div className="landing-cta-row">
            <Link className="primary-button" href="/auth?mode=signup">
              Create account
            </Link>
            <Link className="secondary-button" href="/app">
              Open live prototype
            </Link>
          </div>
          <div className="landing-proof-row">
            <article>
              <strong>30 sec</strong>
              <span>to finish a daily log</span>
            </article>
            <article>
              <strong>4 inputs</strong>
              <span>photo, voice, text, selfie</span>
            </article>
            <article>
              <strong>1 tap</strong>
              <span>to confirm the day</span>
            </article>
          </div>
        </div>

        <div className="landing-device landing-reveal" style={{ ["--delay" as string]: "0.22s" }}>
          <div className="device-shell">
            <div className="device-topbar">
              <span className="device-dot" />
              <span className="device-title">Tonight&apos;s check-in</span>
            </div>
            <div className="device-card floating-card">
              <p className="eyebrow">Reminder</p>
              <h3>Log today in under 30 seconds</h3>
              <p>One quick capture. One AI pass. One confirm tap.</p>
            </div>
            <div className="device-grid">
              <article className="device-chip-card delayed-float">
                <span>Meal photo</span>
                <small>Dairy + spicy dinner detected</small>
              </article>
              <article className="device-chip-card delayed-float">
                <span>Voice note</span>
                <small>Late sleep, mild redness</small>
              </article>
              <article className="device-chip-card delayed-float">
                <span>Quick chat</span>
                <small>Used cleanser and SPF</small>
              </article>
              <article className="device-chip-card delayed-float">
                <span>Skin selfie</span>
                <small>Jawline looked calmer</small>
              </article>
            </div>
            <div className="device-summary floating-card">
              <div className="device-summary-head">
                <span className="eyebrow">AI summary</span>
                <span className="status-pill subtle">94% confidence</span>
              </div>
              <p>Dairy, sunscreen, mild redness, 6.5h sleep. Ready to confirm.</p>
              <div className="tag-row">
                <span className="tag">dairy</span>
                <span className="tag soft">sunscreen</span>
                <span className="tag soft">redness</span>
              </div>
            </div>
            <div className="device-image-strip">
              {skincareImages.slice(0, 2).map((image, index) => (
                <figure className="device-image-card delayed-float" key={image.src} style={{ ["--delay" as string]: `${0.3 + index * 0.18}s` }}>
                  <ProgressiveImage src={image.src} alt={image.alt} />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section visual-gallery">
        <div className="section-heading landing-reveal" style={{ ["--delay" as string]: "0.08s" }}>
          <p className="eyebrow">Skincare-first experience</p>
          <h2>Built with the tone of a premium skincare brand, not a medical form.</h2>
        </div>
        <div className="gallery-grid">
          {skincareImages.map((image, index) => (
            <article className="gallery-card landing-reveal" key={image.src} style={{ ["--delay" as string]: `${0.14 + index * 0.08}s` }}>
              <ProgressiveImage src={image.src} alt={image.alt} />
              <div className="gallery-overlay">
                <span>{index === 0 ? "Evidence-rich daily capture" : index === 1 ? "Human, calm, and personal" : "Clinical structure, soft interface"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="product">
        <div className="section-heading landing-reveal" style={{ ["--delay" as string]: "0.12s" }}>
          <p className="eyebrow">Why this product exists</p>
          <h2>The tracker should feel like support, not homework.</h2>
        </div>
        <div className="feature-card-grid">
          {featureCards.map((card, index) => (
            <article
              className="landing-feature-card landing-reveal"
              key={card.title}
              style={{ ["--delay" as string]: `${0.16 + index * 0.07}s` }}
            >
              <span className="feature-index">0{index + 1}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section split" id="flow">
        <article className="editorial-card landing-reveal" style={{ ["--delay" as string]: "0.1s" }}>
          <p className="eyebrow">Flow</p>
          <h2>Designed for repeated, low-effort check-ins.</h2>
          <div className="timeline-list">
            {steps.map((step, index) => (
              <div className="timeline-row" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="editorial-card warm landing-reveal" style={{ ["--delay" as string]: "0.18s" }}>
          <p className="eyebrow">Built for adherence</p>
          <h2>Every repeated day should get easier than the last.</h2>
          <div className="moments-cloud">
            {moments.map((moment, index) => (
              <span className="moment-pill" key={moment} style={{ ["--delay" as string]: `${0.2 + index * 0.05}s` }}>
                {moment}
              </span>
            ))}
          </div>
          <p className="support-copy">
            The same experience that helps users remember their routine also creates cleaner data for later pattern
            detection.
          </p>
        </article>
      </section>

      <section className="landing-section final-cta" id="value">
        <div className="section-heading landing-reveal" style={{ ["--delay" as string]: "0.08s" }}>
          <p className="eyebrow">Get started</p>
          <h2>Bring the concierge layer to life with a daily log people will actually use.</h2>
          <p className="landing-subcopy compact">
            Start with a polished sign-up flow, step into the tracker, and keep the foundation ready for Supabase auth
            when you connect it.
          </p>
        </div>
        <div className="landing-cta-row center landing-reveal" style={{ ["--delay" as string]: "0.14s" }}>
          <Link className="primary-button" href="/auth?mode=signup">
            Sign up
          </Link>
          <Link className="ghost-button" href="/auth?mode=login">
            Already have an account
          </Link>
        </div>
      </section>
    </main>
  );
}
