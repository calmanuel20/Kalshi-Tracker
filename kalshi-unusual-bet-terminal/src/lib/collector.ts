import { fetchKalshiMarkets, fetchKalshiTrades, parseFixedPoint } from "./kalshi";
import { getListEnv, getNumberEnv } from "./env";
import { sendAlertEmail } from "./email";
import { groupTradesByTicker, scoreTrade } from "./scoring";
import { getSupabaseAdmin } from "./supabase";
import type {
  AlertRecord,
  CollectorRunResult,
  KalshiMarket,
  KalshiTrade,
  StoredMarket,
  StoredTrade
} from "./types";

const COLLECTOR_ID = "kalshi_public_rest";

function toUnixSeconds(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}

function toTradeRow(trade: KalshiTrade) {
  const createdTs = toUnixSeconds(trade.created_time);
  return {
    trade_id: trade.trade_id,
    ticker: trade.ticker,
    count_fp: parseFixedPoint(trade.count_fp) ?? 0,
    yes_price_dollars: parseFixedPoint(trade.yes_price_dollars),
    no_price_dollars: parseFixedPoint(trade.no_price_dollars),
    created_time: trade.created_time,
    created_ts: createdTs,
    is_block_trade: Boolean(trade.is_block_trade),
    raw: trade
  };
}

function toMarketRow(market: KalshiMarket) {
  return {
    ticker: market.ticker,
    event_ticker: market.event_ticker ?? null,
    title: market.title ?? null,
    subtitle: market.subtitle ?? null,
    category: market.category ?? null,
    status: market.status ?? null,
    yes_bid_dollars: parseFixedPoint(market.yes_bid_dollars),
    yes_ask_dollars: parseFixedPoint(market.yes_ask_dollars),
    no_bid_dollars: parseFixedPoint(market.no_bid_dollars),
    no_ask_dollars: parseFixedPoint(market.no_ask_dollars),
    last_price_dollars: parseFixedPoint(market.last_price_dollars),
    volume_fp: parseFixedPoint(market.volume_fp),
    volume_24h_fp: parseFixedPoint(market.volume_24h_fp),
    open_interest_fp: parseFixedPoint(market.open_interest_fp),
    liquidity_dollars: parseFixedPoint(market.liquidity_dollars),
    raw: market,
    updated_at: new Date().toISOString()
  };
}

function normalizeStoredTrade(row: StoredTrade): StoredTrade {
  return {
    ...row,
    count_fp: Number(row.count_fp),
    yes_price_dollars: row.yes_price_dollars === null ? null : Number(row.yes_price_dollars),
    no_price_dollars: row.no_price_dollars === null ? null : Number(row.no_price_dollars),
    created_ts: Number(row.created_ts),
    is_block_trade: Boolean(row.is_block_trade)
  };
}

async function getCollectorState(): Promise<{ last_processed_ts: number }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collector_state")
    .select("last_processed_ts")
    .eq("id", COLLECTOR_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { last_processed_ts: data?.last_processed_ts ?? 0 };
}

async function updateCollectorSuccess(lastProcessedTs: number) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("collector_state").upsert({
    id: COLLECTOR_ID,
    last_processed_ts: lastProcessedTs,
    last_success_at: new Date().toISOString(),
    current_error: null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw error;
  }
}

async function updateCollectorError(errorMessage: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("collector_state").upsert({
    id: COLLECTOR_ID,
    current_error: errorMessage,
    updated_at: new Date().toISOString()
  });
}

async function ensureMarkets(tickers: string[]) {
  const supabase = getSupabaseAdmin();
  const rows = [...new Set(tickers)].map((ticker) => ({
    ticker,
    raw: {},
    updated_at: new Date().toISOString()
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("markets").upsert(rows, { onConflict: "ticker" });
  if (error) {
    throw error;
  }
}

async function upsertMarkets(markets: KalshiMarket[]) {
  const supabase = getSupabaseAdmin();
  const rows = markets.map(toMarketRow);
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("markets").upsert(rows, { onConflict: "ticker" });
  if (error) {
    throw error;
  }
}

async function upsertTrades(trades: KalshiTrade[]): Promise<StoredTrade[]> {
  const supabase = getSupabaseAdmin();
  const rows = trades
    .map(toTradeRow)
    .filter((row) => row.trade_id && row.ticker && Number.isFinite(row.created_ts) && row.count_fp > 0);

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("trades")
    .upsert(rows, { onConflict: "trade_id", ignoreDuplicates: true })
    .select("trade_id,ticker,count_fp,yes_price_dollars,no_price_dollars,created_time,created_ts,is_block_trade");

  if (error) {
    throw error;
  }

  return ((data ?? []) as StoredTrade[]).map(normalizeStoredTrade);
}

async function fetchRecentTrades(tickers: string[], minCreatedTs: number): Promise<StoredTrade[]> {
  const supabase = getSupabaseAdmin();
  if (tickers.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("trades")
    .select("trade_id,ticker,count_fp,yes_price_dollars,no_price_dollars,created_time,created_ts,is_block_trade")
    .in("ticker", [...new Set(tickers)])
    .gte("created_ts", minCreatedTs)
    .order("created_ts", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as StoredTrade[]).map(normalizeStoredTrade);
}

async function hasRecentAlert(ticker: string, createdTs: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const cooldownMinutes = getNumberEnv("ALERT_COOLDOWN_MINUTES", 15);
  const cooldownStart = new Date((createdTs - cooldownMinutes * 60) * 1000).toISOString();

  const { data, error } = await supabase
    .from("alerts")
    .select("id")
    .eq("ticker", ticker)
    .gte("created_at", cooldownStart)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

async function createAlert(trade: StoredTrade, scoreResult: ReturnType<typeof scoreTrade>): Promise<AlertRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      ticker: trade.ticker,
      triggering_trade_ids: [trade.trade_id],
      score: scoreResult.score,
      reason: scoreResult.reason,
      severity: scoreResult.severity,
      baseline_snapshot: scoreResult.baseline,
      status: "open",
      notification_status: "pending",
      created_at: new Date(trade.created_ts * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .select("*,markets(*)")
    .single();

  if (error) {
    throw error;
  }

  return data as AlertRecord;
}

async function markNotification(alertId: string, status: string, errorMessage?: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("alerts")
    .update({
      notification_status: status,
      notification_error: errorMessage ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", alertId);

  if (error) {
    throw error;
  }
}

async function notifyIfNeeded(alert: AlertRecord): Promise<boolean> {
  if (alert.severity !== "high" && alert.severity !== "critical") {
    await markNotification(alert.id, "not_sent_low_severity");
    return false;
  }

  try {
    const result = await sendAlertEmail(alert);
    await markNotification(alert.id, result);
    return result === "sent";
  } catch (error) {
    await markNotification(alert.id, "failed", error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function runKalshiCollector(): Promise<CollectorRunResult> {
  try {
    const supabase = getSupabaseAdmin();
    const state = await getCollectorState();
    const nowTs = Math.floor(Date.now() / 1000);
    const lookbackSeconds = getNumberEnv("KALSHI_LOOKBACK_SECONDS", 300);
    const minTs = state.last_processed_ts > 0
      ? Math.max(0, state.last_processed_ts - 5)
      : nowTs - lookbackSeconds;
    const watchedTickers = getListEnv("WATCHED_TICKERS");
    const minScore = getNumberEnv("ALERT_MIN_SCORE", 45);
    const minContracts = getNumberEnv("ALERT_MIN_CONTRACTS", 100);

    const trades = await fetchKalshiTrades({ minTs, watchedTickers });
    const tickers = [...new Set(trades.map((trade) => trade.ticker))];

    await ensureMarkets(tickers);
    await upsertMarkets(await fetchKalshiMarkets(tickers));
    const insertedTrades = await upsertTrades(trades);

    const recentFloor = nowTs - 6 * 60 * 60;
    const recentTrades = await fetchRecentTrades(tickers, recentFloor);
    const grouped = groupTradesByTicker(recentTrades);
    const newTradesByTime = [...insertedTrades].sort((a, b) => a.created_ts - b.created_ts);

    let alertsCreated = 0;
    let emailsSent = 0;
    for (const trade of newTradesByTime) {
      const scoreResult = scoreTrade({
        tradeId: trade.trade_id,
        ticker: trade.ticker,
        count: Number(trade.count_fp),
        isBlockTrade: trade.is_block_trade,
        createdTs: trade.created_ts,
        recentTrades: grouped.get(trade.ticker) ?? [],
        minContracts
      });

      if (!scoreResult.shouldAlert || scoreResult.score < minScore) {
        continue;
      }

      if (await hasRecentAlert(trade.ticker, trade.created_ts)) {
        continue;
      }

      const alert = await createAlert(trade, scoreResult);
      alertsCreated += 1;
      if (await notifyIfNeeded(alert)) {
        emailsSent += 1;
      }
    }

    const maxProcessedTs = trades.reduce((max, trade) => {
      const createdTs = toUnixSeconds(trade.created_time);
      return Number.isFinite(createdTs) ? Math.max(max, createdTs) : max;
    }, state.last_processed_ts);

    await updateCollectorSuccess(maxProcessedTs);

    await supabase.from("collector_state").upsert({
      id: COLLECTOR_ID,
      updated_at: new Date().toISOString()
    });

    return {
      fetchedTrades: trades.length,
      insertedTrades: insertedTrades.length,
      alertsCreated,
      emailsSent,
      lastProcessedTs: maxProcessedTs
    };
  } catch (error) {
    await updateCollectorError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}
