import { describe, expect, it } from "vitest";
import { scoreTrade } from "./scoring";
import type { StoredTrade } from "./types";

function trade(overrides: Partial<StoredTrade>): StoredTrade {
  return {
    trade_id: overrides.trade_id ?? crypto.randomUUID(),
    ticker: overrides.ticker ?? "KXTEST",
    count_fp: overrides.count_fp ?? 100,
    yes_price_dollars: 0.5,
    no_price_dollars: 0.5,
    created_time: new Date((overrides.created_ts ?? 1000) * 1000).toISOString(),
    created_ts: overrides.created_ts ?? 1000,
    is_block_trade: overrides.is_block_trade ?? false
  };
}

describe("scoreTrade", () => {
  it("does not alert during warmup for ordinary trade size", () => {
    const result = scoreTrade({
      tradeId: "new",
      ticker: "KXTEST",
      count: 120,
      isBlockTrade: false,
      createdTs: 5000,
      recentTrades: [trade({ count_fp: 80, created_ts: 4900 })],
      minContracts: 100
    });

    expect(result.shouldAlert).toBe(false);
    expect(result.score).toBeLessThan(45);
  });

  it("alerts on a large trade versus market baseline", () => {
    const recentTrades = Array.from({ length: 40 }, (_, index) =>
      trade({ count_fp: 100 + (index % 4) * 20, created_ts: 1000 + index * 60 })
    );

    const result = scoreTrade({
      tradeId: "large",
      ticker: "KXTEST",
      count: 1200,
      isBlockTrade: false,
      createdTs: 5000,
      recentTrades,
      minContracts: 100
    });

    expect(result.shouldAlert).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.reason).toContain("contracts");
  });

  it("alerts on block trades even with limited samples", () => {
    const result = scoreTrade({
      tradeId: "block",
      ticker: "KXTEST",
      count: 350,
      isBlockTrade: true,
      createdTs: 5000,
      recentTrades: [],
      minContracts: 100
    });

    expect(result.shouldAlert).toBe(true);
    expect(result.reason).toContain("block trade");
  });

  it("includes volume burst reasoning when five-minute flow expands", () => {
    const recentTrades = Array.from({ length: 40 }, (_, index) =>
      trade({ count_fp: 50, created_ts: 1000 + index * 80 })
    );
    recentTrades.push(trade({ count_fp: 700, created_ts: 4960 }));
    recentTrades.push(trade({ count_fp: 700, created_ts: 4980 }));

    const result = scoreTrade({
      tradeId: "burst",
      ticker: "KXTEST",
      count: 800,
      isBlockTrade: false,
      createdTs: 5000,
      recentTrades,
      minContracts: 100
    });

    expect(result.shouldAlert).toBe(true);
    expect(result.reason).toContain("volume burst");
  });
});
