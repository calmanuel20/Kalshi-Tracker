import type { KalshiMarket, KalshiTrade } from "./types";
import { getEnv } from "./env";

const DEFAULT_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";

type KalshiTradesResponse = {
  trades: KalshiTrade[];
  cursor: string;
};

type KalshiMarketsResponse = {
  markets: KalshiMarket[];
  cursor: string;
};

function kalshiBaseUrl(): string {
  return getEnv("KALSHI_BASE_URL", DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function kalshiGet<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${kalshiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (response.status === 429) {
    throw new Error("Kalshi rate limit returned 429. Retry with backoff on the next cron run.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kalshi request failed ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchKalshiTrades(options: {
  minTs: number;
  maxPages?: number;
  limit?: number;
  watchedTickers?: string[];
}): Promise<KalshiTrade[]> {
  const maxPages = options.maxPages ?? 5;
  const limit = options.limit ?? 1000;
  const trades: KalshiTrade[] = [];
  let cursor = "";

  for (let page = 0; page < maxPages; page += 1) {
    const response = await kalshiGet<KalshiTradesResponse>("/markets/trades", {
      limit,
      min_ts: options.minTs,
      cursor
    });

    for (const trade of response.trades ?? []) {
      if (!options.watchedTickers?.length || options.watchedTickers.includes(trade.ticker)) {
        trades.push(trade);
      }
    }

    cursor = response.cursor;
    if (!cursor) {
      break;
    }
  }

  return trades;
}

export async function fetchKalshiMarkets(tickers: string[]): Promise<KalshiMarket[]> {
  const uniqueTickers = [...new Set(tickers)].filter(Boolean);
  if (uniqueTickers.length === 0) {
    return [];
  }

  const markets: KalshiMarket[] = [];
  for (let i = 0; i < uniqueTickers.length; i += 100) {
    const batch = uniqueTickers.slice(i, i + 100);
    const response = await kalshiGet<KalshiMarketsResponse>("/markets", {
      limit: 1000,
      tickers: batch.join(",")
    });
    markets.push(...(response.markets ?? []));
  }

  return markets;
}

export function parseFixedPoint(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
