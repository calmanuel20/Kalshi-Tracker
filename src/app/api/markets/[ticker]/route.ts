import { NextResponse } from "next/server";
import { demoAlerts, demoMarket, demoTrades } from "@/lib/demo";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;

  if (!hasSupabaseAdmin()) {
    return NextResponse.json({
      market: ticker === demoMarket.ticker ? demoMarket : null,
      trades: demoTrades.filter((trade) => trade.ticker === ticker),
      alerts: demoAlerts.filter((alert) => alert.ticker === ticker),
      configured: false
    });
  }

  const supabase = getSupabaseAdmin();
  const [marketResult, tradeResult, alertResult] = await Promise.all([
    supabase.from("markets").select("*").eq("ticker", ticker).maybeSingle(),
    supabase
      .from("trades")
      .select("trade_id,ticker,count_fp,yes_price_dollars,no_price_dollars,created_time,created_ts,is_block_trade")
      .eq("ticker", ticker)
      .order("created_ts", { ascending: false })
      .limit(100),
    supabase
      .from("alerts")
      .select("*")
      .eq("ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  if (marketResult.error) {
    return NextResponse.json({ error: marketResult.error.message }, { status: 500 });
  }
  if (tradeResult.error) {
    return NextResponse.json({ error: tradeResult.error.message }, { status: 500 });
  }
  if (alertResult.error) {
    return NextResponse.json({ error: alertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    market: marketResult.data,
    trades: tradeResult.data ?? [],
    alerts: alertResult.data ?? [],
    configured: true
  });
}
