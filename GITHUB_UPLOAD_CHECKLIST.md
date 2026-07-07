# GitHub Upload Checklist

1. Upload the contents of this folder to a new GitHub repository.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Import the GitHub repository into Vercel as a Next.js project.
5. Add the environment variables from `.env.example` in Vercel Project Settings.
6. Deploy.

## Required Vercel Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `KALSHI_BASE_URL`
- `KALSHI_LOOKBACK_SECONDS`
- `ALERT_MIN_SCORE`
- `ALERT_MIN_CONTRACTS`
- `ALERT_COOLDOWN_MINUTES`

## Optional Email Variables

- `RESEND_API_KEY`
- `ALERT_EMAIL_FROM`
- `ALERT_EMAIL_TO`

Without the optional email variables, the terminal still collects and displays alerts, but email delivery is skipped.
