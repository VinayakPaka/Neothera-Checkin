# Neothera Assignment — Thought Process Note

**Vinayak Paka** | April 2026
**Live prototype:** [neothera-checkin-koty.vercel.app/app](https://neothera-checkin-koty.vercel.app/app)
**Source code:** [github.com/VinayakPaka/Neothera-Checkin](https://github.com/VinayakPaka/Neothera-Checkin)

---

## Problem chosen: Customer-side adherence

I picked the adherence problem because Neothera's downstream pattern detection only becomes useful if users log consistently enough for the data to mean something. The highest-leverage move is to make daily logging feel effortless — not to build analytics on top of incomplete inputs.

## The intervention: AI-assisted daily check-in

Instead of asking users to fill a structured form every day, the prototype lets them log naturally — via a quick text message, a meal photo, a voice note, or a skin selfie — and the AI converts that into a structured acne log (food, skincare, skin symptoms, lifestyle signals) with one-tap confirmation. The entire flow takes under 30 seconds.

## What I prioritized

I optimized for the shortest path from **reminder → confirmed log**:

- **Branded landing page** with product framing and clear CTA
- **Auth flow** (Supabase SSR) — real login/signup with session-aware route protection
- **Multimodal capture** — text, voice recording, meal photos (multi-image), skin selfies (multi-image) with inline previews
- **AI parsing** — OpenAI converts raw inputs into structured fields with a confidence score
- **One-tap confirmation** — user reviews the AI summary and confirms in a single click
- **"Same as yesterday" shortcut** — for days when nothing changed, reducing logging to literally one tap
- **History timeline** with saved entries, streaks, and a lightweight pattern teaser
- **Browser push notifications** — real-time reminders at the user's preferred time, no email dependency
- **Demo-safe fallbacks** — the flow works even without API keys, so the prototype is always reviewable

## Tech stack and reasoning

| Choice | Why |
|--------|-----|
| **Next.js 15 (App Router)** | Full-stack in one codebase — SSR pages, API routes, and middleware all in one place. Fast to ship. |
| **Supabase** | Postgres + Auth + Storage in one service. SSR cookie-based auth keeps sessions secure without client-side token juggling. |
| **OpenAI (GPT-4.1-mini + GPT-4o-mini-transcribe)** | Handles both voice transcription and structured parsing from natural language. Cheap and fast enough for real-time use. |
| **Web Push (VAPID)** | Free, instant browser notifications — no SMS/email cost, no third-party dependency. Users opt in with one click. |

I chose this stack because every piece is production-grade but takes minutes to wire up. No over-engineering — just the fastest path to a working, deployable product.

## How this evolves into production

This prototype is intentionally scoped to one feature, but it's built on real infrastructure. The natural next steps:

1. **WhatsApp / mobile push** — extend reminders beyond browser notifications for mobile-first users
2. **Richer image parsing** — use vision models to detect food items from meal photos and assess skin condition from selfies
3. **Trigger detection** — correlate repeated logs across days (e.g., dairy on Day N → flare on Day N+1) to surface actionable patterns
4. **Correction learning** — track what users edit after AI parsing to improve accuracy over time
5. **Internal tools** — give dermatologists and CX teams a view into user logs for consults and program support

The same adherence flow becomes the data engine for Neothera's longer-term pattern detection and personalized treatment — better logging today means better insights tomorrow.
