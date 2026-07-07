export type Severity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "snoozed";

export type KalshiTrade = {
  trade_id: string;
  ticker: string;
  count_fp: string;
  yes_price_dollars?: string | null;
  no_price_dollars?: string | null;
  created_time: string;
  is_block_trade?: boolean;
};

export type KalshiMarket = {
  ticker: string;
  event_ticker?: string | null;
  title?: string | null;
  subtitle?: string | null;
  category?: string | null;
  status?: string | null;
  yes_bid_dollars?: string | null;
  yes_ask_dollars?: string | null;
  no_bid_dollars?: string | null;
  no_ask_dollars?: string | null;
  last_price_dollars?: string | null;
  volume_fp?: string | null;
  volume_24h_fp?: string | null;
  open_interest_fp?: string | null;
  liquidity_dollars?: string | null;
};

export type StoredTrade = {
  trade_id: string;
  ticker: string;
  count_fp: number;
  yes_price_dollars: number | null;
  no_price_dollars: number | null;
  created_time: string;
  created_ts: number;
  is_block_trade: boolean;
};

export type StoredMarket = {
  ticker: string;
  event_ticker: string | null;
  title: string | null;
  subtitle: string | null;
  category: string | null;
  status: string | null;
  yes_bid_dollars: number | null;
  yes_ask_dollars: number | null;
  no_bid_dollars: number | null;
  no_ask_dollars: number | null;
  last_price_dollars: number | null;
  volume_fp: number | null;
  volume_24h_fp: number | null;
  open_interest_fp: number | null;
  liquidity_dollars: number | null;
};

export type AlertRecord = {
  id: string;
  ticker: string;
  triggering_trade_ids: string[];
  score: number;
  reason: string;
  severity: Severity;
  baseline_snapshot: AlertBaseline;
  status: AlertStatus;
  snoozed_until: string | null;
  notification_status: string;
  notification_error: string | null;
  created_at: string;
  updated_at: string;
  markets?: StoredMarket | null;
};

export type AlertBaseline = {
  sampleSize: number;
  meanSize: number;
  p95Size: number;
  fiveMinuteVolume: number;
  hourlyVolume: number;
  sizeRatio: number;
  burstRatio: number;
  minContracts: number;
};

export type ScoreCandidate = {
  tradeId: string;
  ticker: string;
  count: number;
  isBlockTrade: boolean;
  createdTs: number;
  recentTrades: StoredTrade[];
  minContracts: number;
};

export type ScoreResult = {
  shouldAlert: boolean;
  score: number;
  severity: Severity;
  reason: string;
  baseline: AlertBaseline;
};

export type CollectorRunResult = {
  fetchedTrades: number;
  insertedTrades: number;
  alertsCreated: number;
  emailsSent: number;
  lastProcessedTs: number;
};
