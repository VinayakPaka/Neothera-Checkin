# Neothera Assignment Note

## What I chose

I chose the `customer-side adherence` problem first.

My reasoning was that Neothera's downstream pattern detection only becomes useful if users log consistently enough for the data to mean something. So I focused on reducing the friction of daily logging instead of building analytics on top of incomplete inputs.

## Intervention

I designed a `multimodal AI daily check-in`.

Instead of asking users to fill a structured form every day, the product lets them log naturally:

- quick text
- meal photo
- voice note
- optional skin selfie

The system then converts that raw input into a structured acne log covering:

- food
- skincare
- skin symptoms
- lifestyle signals
- adherence status

The user only needs to review and confirm it.

## What I prioritized

I prioritized the shortest path from `reminder` to `confirmed log`.

The product includes:

- a branded landing page and auth entry flow
- a home screen with reminder and progress context
- a `same as yesterday` shortcut for repeated days
- multimodal capture
- AI parsing into structured fields
- one-tap confirmation
- saved history and a lightweight pattern teaser

I intentionally did not build a full analytics suite, treatment dashboard, or diagnosis engine because the assignment asked for one high-leverage intervention inside the tracking flow.

## Tech stack

I used:

- `Next.js` for a fast full-stack product surface
- `Supabase` for persistence and media storage
- `OpenAI` for transcription and multimodal parsing

I also added demo-safe fallbacks so the flow still works even when external keys are missing during review.

## How this evolves into production

The next step would be to connect this flow to:

- WhatsApp or push reminders
- user-level authentication
- richer image and voice parsing
- better confidence handling and correction loops
- trigger detection across repeated logs
- internal tools for dermat consults and CX teams

In production, the same adherence flow becomes the data engine for Neothera's longer-term pattern detection and personalized treatment support.
