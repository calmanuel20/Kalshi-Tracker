import type { ScoreCandidate, ScoreResult, Severity, StoredTrade } from "./types";

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function severityForScore(score: number): Severity {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 65) {
    return "high";
  }
  if (score >= 45) {
    return "medium";
  }
  return "low";
}

function reasonParts(candidate: ScoreCandidate, sizeRatio: number, burstRatio: number): string[] {
  const reasons: string[] = [];
  if (candidate.count >= candidate.minContracts && sizeRatio >= 1.5) {
    reasons.push(`${candidate.count.toFixed(0)} contracts is ${sizeRatio.toFixed(1)}x recent p95`);
  }
  if (candidate.isBlockTrade) {
    reasons.push("block trade");
  }
  if (burstRatio >= 3) {
    reasons.push(`5m volume burst ${burstRatio.toFixed(1)}x baseline`);
  }
  return reasons;
}

export function scoreTrade(candidate: ScoreCandidate): ScoreResult {
  const lookback = candidate.recentTrades.filter((trade) => trade.created_ts < candidate.createdTs);
  const counts = lookback.map((trade) => trade.count_fp).filter((count) => count > 0);
  const sampleSize = counts.length;
  const meanSize = sampleSize > 0 ? counts.reduce((sum, count) => sum + count, 0) / sampleSize : 0;
  const p95Size = percentile(counts, 95);
  const baselineSize = Math.max(p95Size, meanSize * 2, candidate.minContracts);
  const sizeRatio = candidate.count / Math.max(baselineSize, 1);

  const fiveMinuteFloor = candidate.createdTs - 5 * 60;
  const hourFloor = candidate.createdTs - 60 * 60;
  const fiveMinuteVolume = lookback
    .filter((trade) => trade.created_ts >= fiveMinuteFloor)
    .reduce((sum, trade) => sum + trade.count_fp, 0) + candidate.count;
  const hourlyVolume = lookback
    .filter((trade) => trade.created_ts >= hourFloor)
    .reduce((sum, trade) => sum + trade.count_fp, 0);
  const expectedFiveMinuteVolume = Math.max((hourlyVolume / 60) * 5, candidate.minContracts);
  const burstRatio = fiveMinuteVolume / Math.max(expectedFiveMinuteVolume, 1);

  let score = 0;
  if (candidate.count >= candidate.minContracts && sizeRatio >= 1.5) {
    score += Math.min(60, 22 * sizeRatio);
  }
  if (candidate.isBlockTrade) {
    score += 35;
  }
  if (burstRatio >= 3 && fiveMinuteVolume >= candidate.minContracts * 2) {
    score += Math.min(35, 8 * burstRatio);
  }
  if (sampleSize < 10 && !candidate.isBlockTrade && candidate.count < candidate.minContracts * 3) {
    score = Math.min(score, 30);
  }

  score = Math.round(Math.min(score, 100));
  const severity = severityForScore(score);
  const reasons = reasonParts(candidate, sizeRatio, burstRatio);

  return {
    shouldAlert: score >= 45 && reasons.length > 0,
    score,
    severity,
    reason: reasons.length > 0 ? reasons.join(" + ") : "within normal range",
    baseline: {
      sampleSize,
      meanSize,
      p95Size,
      fiveMinuteVolume,
      hourlyVolume,
      sizeRatio,
      burstRatio,
      minContracts: candidate.minContracts
    }
  };
}

export function groupTradesByTicker(trades: StoredTrade[]): Map<string, StoredTrade[]> {
  const grouped = new Map<string, StoredTrade[]>();
  for (const trade of trades) {
    const existing = grouped.get(trade.ticker) ?? [];
    existing.push(trade);
    grouped.set(trade.ticker, existing);
  }

  for (const entries of grouped.values()) {
    entries.sort((a, b) => a.created_ts - b.created_ts);
  }

  return grouped;
}
