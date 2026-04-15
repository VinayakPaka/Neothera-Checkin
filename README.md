# Neothera Daily Check-In

A production-intent prototype for the Neothera AI Product Builder assignment.

## What this solves

This prototype tackles the `customer-side adherence` problem:

- users forget to log
- manual forms feel tedious
- unstructured logging makes pattern detection harder later

The product intervention is a `multimodal AI check-in`:

- quick chat input
- meal photo upload (multi-image)
- voice note capture
- optional skin selfie (multi-image)
- AI parsing into a structured acne log
- one-tap confirmation
- saved history, streaks, and reminder preferences
- browser push notifications for reminders
- branded landing page
- auth entry flow with login and signup

## Stack

- `Next.js 15 App Router`
- `Supabase` for Postgres + Storage + SSR Auth
- `OpenAI` for speech-to-text and structured parsing
- `Web Push` for browser notifications
- `Resend` for email reminders (optional)

## Local setup

1. Copy `.env.example` to `.env`
2. Fill in the required keys (see `.env.example` for descriptions)
3. Run the SQL in [supabase/schema.sql](./supabase/schema.sql) against your Supabase project
4. Create a public storage bucket named `habit-media` in Supabase
5. `npm install`
6. `npm run dev`

If external keys are missing the app falls back to demo parsing, in-memory data, and a demo auth redirect so the full flow remains reviewable.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Set **all** environment variables from `.env.example` in the Vercel dashboard
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g. `https://neothera-checkin.vercel.app`)
5. Deploy — Vercel auto-detects Next.js
6. The `vercel.json` cron runs `/api/cron/reminders` every minute (requires Vercel Pro for cron jobs, or use an external scheduler like cron-job.org for the Hobby plan)

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Landing page |
| GET | `/auth` | Login / signup |
| GET | `/app` | Main check-in (protected) |
| GET | `/profile` | User profile |
| GET | `/api/dashboard` | Dashboard data |
| POST | `/api/parse` | AI parse input |
| POST | `/api/entries` | Save daily entry |
| POST | `/api/preferences` | Update preferences |
| POST | `/api/preferences/test-reminder` | Send test push notification |
| POST | `/api/cron/reminders` | Cron: send due reminders |
| GET | `/api/notifications/vapid-public-key` | VAPID public key |
| POST | `/api/notifications/subscribe` | Save push subscription |
| POST | `/api/notifications/unsubscribe` | Remove push subscription |

## Suggested demo flow

1. Open the landing page and show the product framing
2. Go to `Sign up`
3. Create an account or use the demo auth fallback
4. Start today's check-in inside `/app`
5. Type a quick note or record a voice note
6. Click `Convert into today's log`
7. Show the AI summary screen and confirm it
8. Open history and point out the saved timeline + pattern teaser

## Submission framing

`I chose the adherence problem first because better data quality starts with easier logging. The prototype reduces friction by letting users send natural inputs instead of filling forms, then turns them into a structured log with one-tap confirmation. I also stored the data in a real backend so the same flow can later power trigger detection and internal pattern analysis.`
