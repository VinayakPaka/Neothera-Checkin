# Deployment Checklist

## 1. Supabase

1. Create a new Supabase project (or use existing)
2. Run [supabase/schema.sql](../supabase/schema.sql) in the SQL editor
3. Create a **public** storage bucket named `habit-media`
4. Copy these from Project Settings > API:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. OpenAI

1. Create an API key at platform.openai.com
2. Set `OPENAI_API_KEY`

## 3. Web Push (VAPID keys)

1. Generate keys: `npx web-push generate-vapid-keys`
2. Set:
   - `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

## 4. Resend (optional email reminders)

1. Create a Resend API key at resend.com
2. Verify a sender domain (or use `onboarding@resend.dev` for testing)
3. Set:
   - `RESEND_API_KEY`
   - `REMINDER_FROM_EMAIL`

## 5. Cron secret

1. Generate a random secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Set `REMINDER_CRON_SECRET`

## 6. Vercel deployment

1. Push the repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `.` (or the subfolder if monorepo)
5. Add **all** environment variables from `.env.example`:

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `OPENAI_API_KEY` | Yes | |
   | `SUPABASE_URL` | Yes | |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | |
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
   | `NEXT_PUBLIC_APP_URL` | Yes | Your Vercel domain |
   | `VAPID_SUBJECT` | Yes | |
   | `VAPID_PUBLIC_KEY` | Yes | |
   | `VAPID_PRIVATE_KEY` | Yes | |
   | `REMINDER_CRON_SECRET` | Yes | |
   | `REMINDER_TIMEZONE` | No | Defaults to `Asia/Kolkata` |
   | `RESEND_API_KEY` | No | Only if using email reminders |
   | `REMINDER_FROM_EMAIL` | No | Only if using email reminders |

6. Click **Deploy**

## 7. Post-deploy verification

- [ ] Landing page renders with images
- [ ] Signup / login works
- [ ] `/app` redirects unauthenticated users to `/auth`
- [ ] Text log + AI parsing works
- [ ] Voice note capture works
- [ ] Photo upload works
- [ ] Entry confirmation saves to Supabase
- [ ] History loads past entries
- [ ] Reminder time saves
- [ ] Browser push notifications work
- [ ] Cron endpoint responds (test with curl)
- [ ] Sign out works

## 8. Cron scheduling

`vercel.json` defines a cron that hits `/api/cron/reminders` every minute. This requires **Vercel Pro**. On the Hobby plan, use an external scheduler:

- [cron-job.org](https://cron-job.org) (free)
- GitHub Actions scheduled workflow
- Any service that can POST to your endpoint with `Authorization: Bearer <REMINDER_CRON_SECRET>`

## Fallback mode

If keys are missing the app still works with heuristic parsing and in-memory data, but real persistence, uploads, and notifications require Supabase, OpenAI, and VAPID keys.
