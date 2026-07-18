# Deployment

## Supabase

1. Create a project and run `database/migrations/0001_initial.sql` in the SQL editor or with the CLI.
2. In Auth URL Configuration, set the production site URL and add `https://<domain>/auth/confirm` as an allowed redirect.
3. Update the magic-link email template to pass `token_hash` and `type` to `/auth/confirm`.
4. Copy the project URL and publishable key to Vercel.

## OpenAI

1. Create a project-scoped API key. Adjust the trusted `app_config` rows in the database migration if the default $25 monthly ceiling or $0.25 request reservation should change.
2. Set `OPENAI_API_KEY` and pin `OPENAI_MODEL`.
3. Set the current input and output price variables so stored cost estimates are meaningful.
4. Run `npm run eval` against the pinned model before advertising quality metrics.

## Vercel

1. Import the repository and keep the Next.js defaults.
2. Add all variables from `.env.example` for Production and Preview as appropriate.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL.
4. Deploy, then verify `/api/health`, sign-in, one analysis, history, feedback, and Sentry delivery.

## Release gate

`npm run check` and both desktop/mobile Chromium flows must pass. Then run the 55-case evaluation and archive its model ID, date, metrics, and cost.
