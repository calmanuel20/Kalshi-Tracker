"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard";
import type { AlertRecord, AlertStatus, Severity, StoredMarket } from "@/lib/types";

type FilterStatus = AlertStatus | "all";
type FilterSeverity = Severity | "all";

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatNumber(value: number | string | null | undefined, digits = 0): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "--";
  }

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "--";
  }

  return parsed.toFixed(2);
}

function statusText(status: AlertStatus): string {
  if (status === "acknowledged") {
    return "ACK";
  }
  if (status === "snoozed") {
    return "SNZ";
  }
  return "OPEN";
}

function marketForAlert(alert: AlertRecord, markets: StoredMarket[]): StoredMarket | null {
  return alert.markets ?? markets.find((market) => market.ticker === alert.ticker) ?? null;
}

export function TerminalDashboard({ initialData }: { initialData: DashboardData }) {
  const [alerts, setAlerts] = useState(initialData.alerts);
  const [status, setStatus] = useState<FilterStatus>("open");
  const [severity, setSeverity] = useState<FilterSeverity>("all");
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(initialData.alerts[0]?.ticker ?? initialData.markets[0]?.ticker ?? "");
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return alerts.filter((alert) => {
      const statusMatch = status === "all" || alert.status === status;
      const severityMatch = severity === "all" || alert.severity === severity;
      const queryMatch = !needle || alert.ticker.toUpperCase().includes(needle) || alert.reason.toUpperCase().includes(needle);
      return statusMatch && severityMatch && queryMatch;
    });
  }, [alerts, status, severity, query]);

  const selectedMarket = useMemo(() => {
    return initialData.markets.find((market) => market.ticker === selectedTicker)
      ?? alerts.find((alert) => alert.ticker === selectedTicker)?.markets
      ?? null;
  }, [alerts, initialData.markets, selectedTicker]);

  const selectedAlerts = filteredAlerts.filter((alert) => alert.ticker === selectedTicker);
  const openCount = alerts.filter((alert) => alert.status === "open").length;
  const highCount = alerts.filter((alert) => alert.severity === "high" || alert.severity === "critical").length;
  const maxScore = alerts.reduce((max, alert) => Math.max(max, Number(alert.score)), 0);

  async function mutateAlert(id: string, action: "ack" | "snooze") {
    setBusyAlertId(id);
    try {
      const response = await fetch(`/api/alerts/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: action === "snooze" ? JSON.stringify({ minutes: 60 }) : undefined
      });

      if (!response.ok) {
        throw new Error(`Request failed ${response.status}`);
      }

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === id
            ? {
                ...alert,
                status: action === "ack" ? "acknowledged" : "snoozed",
                snoozed_until: action === "snooze" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : alert.snoozed_until
              }
            : alert
        )
      );
    } finally {
      setBusyAlertId(null);
    }
  }

  return (
    <main className="terminal-shell">
      <header className="terminal-header">
        <div>
          <div className="system-line">KALSHI PUBLIC REST / UNUSUAL BET MONITOR / READ ONLY</div>
          <h1>KALSHI ALERT TERMINAL</h1>
        </div>
        <div className="collector-state">
          <span>SUPABASE {initialData.configured ? "ONLINE" : "DEMO"}</span>
          <span>LAST POLL {formatTime(initialData.collectorState?.last_success_at)}</span>
          <span>ERR {initialData.collectorState?.current_error ? "YES" : "NO"}</span>
        </div>
      </header>

      <section className="command-bar" aria-label="alert filters">
        <label>
          STATUS
          <select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus)}>
            <option value="open">OPEN</option>
            <option value="all">ALL</option>
            <option value="acknowledged">ACK</option>
            <option value="snoozed">SNOOZED</option>
          </select>
        </label>
        <label>
          SEVERITY
          <select value={severity} onChange={(event) => setSeverity(event.target.value as FilterSeverity)}>
            <option value="all">ALL</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </label>
        <label className="query-box">
          FIND
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="TICKER OR REASON" />
        </label>
        <div className="notice">INFORMATIONAL ONLY / NOT TRADING ADVICE</div>
      </section>

      <section className="ticker-strip" aria-label="summary">
        <div><span>OPEN ALERTS</span><strong>{openCount}</strong></div>
        <div><span>HIGH SIGNALS</span><strong>{highCount}</strong></div>
        <div><span>MAX SCORE</span><strong>{maxScore}</strong></div>
        <div><span>TRADES LOADED</span><strong>{initialData.trades.length}</strong></div>
        <div><span>MARKETS</span><strong>{initialData.markets.length}</strong></div>
      </section>

      <div className="terminal-grid">
        <section className="pane alert-pane" aria-label="alert tape">
          <div className="pane-title">ALERT TAPE</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>SEV</th>
                  <th>SCORE</th>
                  <th>TICKER</th>
                  <th>SIZE</th>
                  <th>REASON</th>
                  <th>STATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={8}>NO MATCHING ALERTS</td>
                  </tr>
                ) : filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={alert.ticker === selectedTicker ? "selected-row" : ""}
                    onClick={() => setSelectedTicker(alert.ticker)}
                  >
                    <td>{formatTime(alert.created_at)}</td>
                    <td>{alert.severity.toUpperCase()}</td>
                    <td>{formatNumber(alert.score)}</td>
                    <td>{alert.ticker}</td>
                    <td>{formatNumber(alert.baseline_snapshot?.fiveMinuteVolume)}</td>
                    <td>{alert.reason}</td>
                    <td>{statusText(alert.status)}</td>
                    <td className="action-cell">
                      <button disabled={busyAlertId === alert.id} onClick={(event) => { event.stopPropagation(); mutateAlert(alert.id, "ack"); }}>
                        ACK
                      </button>
                      <button disabled={busyAlertId === alert.id} onClick={(event) => { event.stopPropagation(); mutateAlert(alert.id, "snooze"); }}>
                        SNZ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="pane detail-pane" aria-label="market detail">
          <div className="pane-title">MARKET DETAIL</div>
          {selectedMarket ? (
            <>
              <div className="detail-head">
                <span>{selectedMarket.ticker}</span>
                <span>{selectedMarket.status?.toUpperCase() ?? "UNKNOWN"}</span>
              </div>
              <div className="market-title">{selectedMarket.title ?? selectedMarket.subtitle ?? "UNTITLED MARKET"}</div>
              <dl className="quote-grid">
                <div><dt>YES BID</dt><dd>{formatPrice(selectedMarket.yes_bid_dollars)}</dd></div>
                <div><dt>YES ASK</dt><dd>{formatPrice(selectedMarket.yes_ask_dollars)}</dd></div>
                <div><dt>LAST</dt><dd>{formatPrice(selectedMarket.last_price_dollars)}</dd></div>
                <div><dt>24H VOL</dt><dd>{formatNumber(selectedMarket.volume_24h_fp)}</dd></div>
                <div><dt>OPEN INT</dt><dd>{formatNumber(selectedMarket.open_interest_fp)}</dd></div>
                <div><dt>LIQUID</dt><dd>{formatNumber(selectedMarket.liquidity_dollars)}</dd></div>
              </dl>
              <div className="pane-title sub">RECENT SIGNALS</div>
              <div className="signal-list">
                {selectedAlerts.length === 0 ? (
                  <div>NO ACTIVE SIGNALS FOR SELECTED MARKET</div>
                ) : selectedAlerts.map((alert) => (
                  <div key={alert.id}>
                    <span>{formatTime(alert.created_at)}</span>
                    <span>{alert.severity.toUpperCase()}</span>
                    <span>{formatNumber(alert.score)}</span>
                    <p>{alert.reason}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>SELECT AN ALERT ROW TO LOAD MARKET CONTEXT</div>
          )}
        </aside>
      </div>

      <section className="pane market-pane" aria-label="market board">
        <div className="pane-title">WATCHED MARKET BOARD</div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TICKER</th>
                <th>TITLE</th>
                <th>STATUS</th>
                <th>LAST</th>
                <th>YES BID</th>
                <th>YES ASK</th>
                <th>24H VOL</th>
                <th>OPEN INT</th>
              </tr>
            </thead>
            <tbody>
              {initialData.markets.length === 0 ? (
                <tr><td colSpan={8}>NO MARKETS LOADED YET</td></tr>
              ) : initialData.markets.map((market) => {
                const primaryAlert = alerts.find((alert) => alert.ticker === market.ticker);
                const hydratedMarket = primaryAlert ? marketForAlert(primaryAlert, initialData.markets) ?? market : market;
                return (
                  <tr key={market.ticker} onClick={() => setSelectedTicker(market.ticker)} className={market.ticker === selectedTicker ? "selected-row" : ""}>
                    <td>{market.ticker}</td>
                    <td>{hydratedMarket.title ?? hydratedMarket.subtitle ?? "--"}</td>
                    <td>{hydratedMarket.status?.toUpperCase() ?? "--"}</td>
                    <td>{formatPrice(hydratedMarket.last_price_dollars)}</td>
                    <td>{formatPrice(hydratedMarket.yes_bid_dollars)}</td>
                    <td>{formatPrice(hydratedMarket.yes_ask_dollars)}</td>
                    <td>{formatNumber(hydratedMarket.volume_24h_fp)}</td>
                    <td>{formatNumber(hydratedMarket.open_interest_fp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .terminal-shell {
          min-height: 100vh;
          padding: 14px;
          background:
            linear-gradient(rgba(0, 255, 102, 0.045) 1px, rgba(0, 0, 0, 0) 1px),
            var(--black);
          background-size: 100% 18px;
        }

        .terminal-header {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid var(--green);
          border-bottom: 0;
          padding: 12px;
        }

        .system-line,
        .collector-state,
        .notice,
        label,
        th,
        dt {
          color: var(--white);
        }

        h1 {
          margin: 4px 0 0;
          font-size: clamp(26px, 5vw, 54px);
          line-height: 0.95;
          letter-spacing: 0;
        }

        .collector-state {
          display: grid;
          align-content: center;
          gap: 6px;
          min-width: 260px;
          text-align: right;
        }

        .command-bar,
        .ticker-strip {
          display: grid;
          grid-template-columns: max-content max-content minmax(220px, 1fr) max-content;
          gap: 10px;
          align-items: end;
          border: 1px solid var(--green);
          padding: 10px 12px;
        }

        .command-bar label {
          display: grid;
          gap: 4px;
          font-size: 12px;
        }

        .query-box input {
          width: 100%;
        }

        select,
        input {
          min-height: 30px;
          padding: 4px 8px;
        }

        .ticker-strip {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          border-top: 0;
        }

        .ticker-strip div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-right: 1px solid var(--green);
          padding-right: 10px;
        }

        .ticker-strip div:last-child {
          border-right: 0;
        }

        .ticker-strip span {
          color: var(--white);
        }

        .ticker-strip strong {
          font-size: 22px;
          font-weight: 400;
        }

        .terminal-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          border-left: 1px solid var(--green);
          border-right: 1px solid var(--green);
        }

        .pane {
          border-bottom: 1px solid var(--green);
        }

        .alert-pane {
          border-right: 1px solid var(--green);
        }

        .detail-pane {
          min-height: 430px;
          padding: 10px;
        }

        .market-pane {
          border-left: 1px solid var(--green);
          border-right: 1px solid var(--green);
        }

        .pane-title {
          color: var(--black);
          background: var(--green);
          padding: 5px 8px;
          font-weight: 700;
        }

        .pane-title.sub {
          margin: 14px -10px 10px;
        }

        .table-scroll {
          overflow: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          line-height: 1.25;
        }

        th,
        td {
          border-bottom: 1px solid var(--green-dark);
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        td:nth-child(6) {
          white-space: normal;
          min-width: 300px;
        }

        tbody tr {
          cursor: pointer;
        }

        tbody tr:hover,
        .selected-row {
          background: var(--green-dark);
        }

        .action-cell {
          display: flex;
          gap: 5px;
        }

        .action-cell button {
          padding: 2px 6px;
          min-width: 42px;
        }

        .detail-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--white);
          border-bottom: 1px solid var(--green);
          padding-bottom: 8px;
        }

        .market-title {
          margin: 10px 0 12px;
          font-size: 18px;
          line-height: 1.25;
        }

        .quote-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          margin: 0;
          border: 1px solid var(--green);
        }

        .quote-grid div {
          padding: 8px;
          border-right: 1px solid var(--green);
          border-bottom: 1px solid var(--green);
        }

        .quote-grid div:nth-child(2n) {
          border-right: 0;
        }

        .quote-grid div:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        dt,
        dd {
          margin: 0;
        }

        dd {
          margin-top: 5px;
          font-size: 22px;
        }

        .signal-list {
          display: grid;
          gap: 8px;
          font-size: 12px;
        }

        .signal-list div {
          border-bottom: 1px solid var(--green-dark);
          padding-bottom: 8px;
        }

        .signal-list span {
          margin-right: 12px;
          color: var(--white);
        }

        .signal-list p {
          margin: 5px 0 0;
        }

        @media (max-width: 980px) {
          .terminal-header,
          .terminal-grid {
            grid-template-columns: 1fr;
            display: grid;
          }

          .collector-state {
            min-width: 0;
            text-align: left;
          }

          .command-bar {
            grid-template-columns: 1fr;
          }

          .ticker-strip {
            grid-template-columns: 1fr;
          }

          .ticker-strip div {
            border-right: 0;
            border-bottom: 1px solid var(--green);
            padding-bottom: 8px;
          }

          .ticker-strip div:last-child {
            border-bottom: 0;
          }

          .alert-pane {
            border-right: 0;
          }
        }
      `}</style>
    </main>
  );
}
