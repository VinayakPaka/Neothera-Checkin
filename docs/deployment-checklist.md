# Deployment Checklist

## Supabase

1. Create a new Supabase project
2. Run [supabase/schema.sql](../supabase/schema.sql)
3. Create a public storage bucket named `habit-media`
4. Copy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## OpenAI

1. Create an API key
2. Add:
   - `OPENAI_API_KEY`
   - optional `OPENAI_PARSER_MODEL`
   - optional `OPENAI_TRANSCRIBE_MODEL`

## Vercel

1. Import this repo or folder into Vercel
2. Set the environment variables from `.env.example`
3. Deploy
4. Test:
   - reminder update
   - text log
   - voice log
   - photo log
   - summary confirmation
   - history persistence

## Demo path if keys are missing

The app still works with heuristic parsing and in-memory data, but real persistence and uploads require Supabase and OpenAI to be configured.
