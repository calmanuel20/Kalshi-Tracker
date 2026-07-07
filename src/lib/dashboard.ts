import { demoAlerts, demoMarket, demoTrades } from "./demo";
import { hasSupabaseAdmin, getSupabaseAdmin } from "./supabase";
import type { AlertRecord, StoredMarket, StoredTrade } from "./types";

export type DashboardData = {
  alerts: AlertRecord[];
  trades: StoredTrade[];
  markets: StoredMarket[];
  collectorState: {
    last_processed_ts: number;
    last_success_at: string | null;
    current_error: string | null;
  } | null;
  configured: boolean;
};

function normalizeAlert(alert: AlertRecord): AlertRecord {
  return {
    ...alert,
    score: Number(alert.score),
    baseline_snapshot: {
      ...alert.baseline_snapshot,
      sampleSize: Number(alert.baseline_snapshot?.sampleSize ?? 0),
      meanSize: Number(alert.baseline_snapshot?.meanSize ?? 0),
      p95Size: Number(alert.baseline_snapshot?.p95Size ?? 0),
      fiveMinuteVolume: Number(alert.baseline_snapshot?.fiveMinuteVolume ?? 0),
      hourlyVolume: Number(alert.baseline_snapshot?.hourlyVolume ?? 0),
      sizeRatio: Number(alert.baseline_snapshot?.sizeRatio ?? 0),
      burstRatio: Number(alert.baseline_snapshot?.burstRatio ?? 0),
      minContracts: Number(alert.baseline_snapshot?.minContracts ?? 0)
    }
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseAdmin()) {
    return {
      alerts: demoAlerts,
      trades: demoTrades,
      markets: [demoMarket],
      collectorState: null,
      configured: false
    };
  }

  const supabase = getSupabaseAdmin();
  const [alertsResult, tradesResult, marketsResult, stateResult] = await Promise.all([
    supabase
      .from("alerts")
      .select("*,markets(*)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("trades")
      .select("trade_id,ticker,count_fp,yes_price_dollars,no_price_dollars,created_time,created_ts,is_block_trade")
      .order("created_ts", { ascending: false })
      .limit(80),
    supabase
      .from("markets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("collector_state")
      .select("last_processed_ts,last_success_at,current_error")
      .eq("id", "kalshi_public_rest")
      .maybeSingle()
  ]);

  if (alertsResult.error) {
    throw alertsResult.error;
  }
  if (tradesResult.error) {
    throw tradesResult.error;
  }
  if (marketsResult.error) {
    throw marketsResult.error;
  }
  if (stateResult.error) {
    throw stateResult.error;
  }

  return {
    alerts: ((alertsResult.data ?? []) as AlertRecord[]).map(normalizeAlert),
    trades: (tradesResult.data ?? []) as StoredTrade[],
    markets: (marketsResult.data ?? []) as StoredMarket[],
    collectorState: stateResult.data ?? null,
    configured: true
  };
}
