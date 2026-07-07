import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchKalshiTrades } from "./kalshi";

describe("Kalshi REST client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KALSHI_BASE_URL;
  });

  it("paginates trades and filters watched tickers", async () => {
    process.env.KALSHI_BASE_URL = "https://example.test/trade-api/v2";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        trades: [
          { trade_id: "1", ticker: "A", count_fp: "10.00", created_time: "2026-07-07T00:00:00Z" },
          { trade_id: "2", ticker: "B", count_fp: "20.00", created_time: "2026-07-07T00:00:01Z" }
        ],
        cursor: "next"
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        trades: [
          { trade_id: "3", ticker: "A", count_fp: "30.00", created_time: "2026-07-07T00:00:02Z" }
        ],
        cursor: ""
      })));

    vi.stubGlobal("fetch", fetchMock);

    const trades = await fetchKalshiTrades({ minTs: 100, watchedTickers: ["A"] });

    expect(trades.map((entry) => entry.trade_id)).toEqual(["1", "3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces rate limits as retryable collector errors", async () => {
    process.env.KALSHI_BASE_URL = "https://example.test/trade-api/v2";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("too many", { status: 429 })));

    await expect(fetchKalshiTrades({ minTs: 100 })).rejects.toThrow("429");
  });
});
