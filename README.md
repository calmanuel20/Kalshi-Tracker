# Kalshi Unusual Bet Terminal

A single-operator monitoring website for unusual Kalshi trade activity. V1 uses public Kalshi REST market data only, stores trades and alerts in Supabase, and presents a dense black/white/green terminal dashboard.

## Setup

1. Install Node.js 20+.
2. Install dependencies with `npm install`.
3. Create a Supabase project and run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local` and fill in Supabase values.
5. Optional: add Resend values for email notifications.
6. Run locally with `npm run dev`.

## Cron

Vercel runs `/api/cron/kalshi-poll` every minute from `vercel.json`. Set `CRON_SECRET` in Vercel so the route only accepts scheduled calls.

## Public API sources

- Kalshi market data quick start: https://docs.kalshi.com/getting_started/quick_start_market_data
- Kalshi trades endpoint: https://docs.kalshi.com/api-reference/market/get-trades
- Kalshi rate limits: https://docs.kalshi.com/getting_started/rate_limits

This app is read-only and informational. It does not place orders and does not provide trading advice.
