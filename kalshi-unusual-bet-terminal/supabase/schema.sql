create extension if not exists pgcrypto;

create table if not exists collector_state (
  id text primary key default 'kalshi_public_rest',
  last_processed_ts bigint not null default 0,
  last_success_at timestamptz,
  current_error text,
  updated_at timestamptz not null default now()
);

create table if not exists markets (
  ticker text primary key,
  event_ticker text,
  title text,
  subtitle text,
  category text,
  status text,
  yes_bid_dollars numeric,
  yes_ask_dollars numeric,
  no_bid_dollars numeric,
  no_ask_dollars numeric,
  last_price_dollars numeric,
  volume_fp numeric,
  volume_24h_fp numeric,
  open_interest_fp numeric,
  liquidity_dollars numeric,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists trades (
  trade_id text primary key,
  ticker text not null references markets(ticker) on delete cascade,
  count_fp numeric not null,
  yes_price_dollars numeric,
  no_price_dollars numeric,
  created_time timestamptz not null,
  created_ts bigint not null,
  is_block_trade boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists trades_ticker_created_ts_idx on trades(ticker, created_ts desc);
create index if not exists trades_created_ts_idx on trades(created_ts desc);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  ticker text not null references markets(ticker) on delete cascade,
  triggering_trade_ids text[] not null default '{}',
  score numeric not null,
  reason text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  baseline_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'snoozed')),
  snoozed_until timestamptz,
  notification_status text not null default 'pending',
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alerts_ticker_created_at_idx on alerts(ticker, created_at desc);
create index if not exists alerts_status_created_at_idx on alerts(status, created_at desc);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into collector_state (id)
values ('kalshi_public_rest')
on conflict (id) do nothing;
