import type { AlertRecord, StoredMarket, StoredTrade } from "./types";

export const demoMarket: StoredMarket = {
  ticker: "KXDEMO-26JUL07-YES",
  event_ticker: "KXDEMO",
  title: "Will the demo market close above the line?",
  subtitle: "Demo data",
  category: "demo",
  status: "open",
  yes_bid_dollars: 0.56,
  yes_ask_dollars: 0.59,
  no_bid_dollars: 0.41,
  no_ask_dollars: 0.44,
  last_price_dollars: 0.58,
  volume_fp: 18420,
  volume_24h_fp: 4210,
  open_interest_fp: 9800,
  liquidity_dollars: 12450
};

export const demoAlerts: AlertRecord[] = [
  {
    id: "demo-critical",
    ticker: demoMarket.ticker,
    triggering_trade_ids: ["TRD-DEMO-0001"],
    score: 91,
    reason: "2400 contracts is 4.6x recent p95 + 5m volume burst 6.2x baseline",
    severity: "critical",
    baseline_snapshot: {
      sampleSize: 86,
      meanSize: 155,
      p95Size: 520,
      fiveMinuteVolume: 3720,
      hourlyVolume: 7200,
      sizeRatio: 4.62,
      burstRatio: 6.2,
      minContracts: 100
    },
    status: "open",
    snoozed_until: null,
    notification_status: "skipped_no_config",
    notification_error: null,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    markets: demoMarket
  },
  {
    id: "demo-high",
    ticker: "KXPOLICY-26JUL07-YES",
    triggering_trade_ids: ["TRD-DEMO-0002"],
    score: 74,
    reason: "block trade + 900 contracts is 2.1x recent p95",
    severity: "high",
    baseline_snapshot: {
      sampleSize: 41,
      meanSize: 118,
      p95Size: 430,
      fiveMinuteVolume: 1240,
      hourlyVolume: 5400,
      sizeRatio: 2.09,
      burstRatio: 2.76,
      minContracts: 100
    },
    status: "open",
    snoozed_until: null,
    notification_status: "skipped_no_config",
    notification_error: null,
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    markets: {
      ...demoMarket,
      ticker: "KXPOLICY-26JUL07-YES",
      event_ticker: "KXPOLICY",
      title: "Will a policy event resolve before close?",
      volume_fp: 8930,
      open_interest_fp: 5100
    }
  }
];

export const demoTrades: StoredTrade[] = [
  {
    trade_id: "TRD-DEMO-0001",
    ticker: demoMarket.ticker,
    count_fp: 2400,
    yes_price_dollars: 0.58,
    no_price_dollars: 0.42,
    created_time: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    created_ts: Math.floor((Date.now() - 2 * 60 * 1000) / 1000),
    is_block_trade: false
  },
  {
    trade_id: "TRD-DEMO-0002",
    ticker: "KXPOLICY-26JUL07-YES",
    count_fp: 900,
    yes_price_dollars: 0.37,
    no_price_dollars: 0.63,
    created_time: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    created_ts: Math.floor((Date.now() - 11 * 60 * 1000) / 1000),
    is_block_trade: true
  }
];
