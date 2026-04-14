# Neothera Daily Check-In

A production-intent prototype for the Neothera AI Product Builder assignment.

## What this solves

This prototype tackles the `customer-side adherence` problem:

- users forget to log
- manual forms feel tedious
- unstructured logging makes pattern detection harder later

The product intervention is a `multimodal AI check-in`:

- quick chat input
- meal photo upload
- voice note capture
- optional skin selfie
- AI parsing into a structured acne log
- one-tap confirmation
- saved history, streaks, and reminder preferences

## Stack

- `Next.js App Router`
- `Supabase` for Postgres + Storage
- `OpenAI` for speech-to-text and structured parsing

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Run the SQL in [supabase/schema.sql](./supabase/schema.sql)
4. Create a storage bucket named `habit-media`
5. Install dependencies with `npm install`
6. Start the app with `npm run dev`

If the external keys are missing, the app falls back to demo parsing and in-memory data so the flow remains reviewable.

## Core routes

- `GET /api/dashboard`
- `POST /api/parse`
- `POST /api/entries`
- `POST /api/preferences`

## Suggested demo flow

1. Open the home screen and show the reminder card
2. Click `Start today's check-in`
3. Type a quick note or record a voice note
4. Click `Convert into today's log`
5. Show the AI summary screen and confirm it
6. Open history and point out the saved timeline + pattern teaser

## Submission framing

`I chose the adherence problem first because better data quality starts with easier logging. The prototype reduces friction by letting users send natural inputs instead of filling forms, then turns them into a structured log with one-tap confirmation. I also stored the data in a real backend so the same flow can later power trigger detection and internal pattern analysis.`
