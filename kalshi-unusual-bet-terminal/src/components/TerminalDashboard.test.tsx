// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoAlerts, demoMarket, demoTrades } from "@/lib/demo";
import { TerminalDashboard } from "./TerminalDashboard";

describe("TerminalDashboard", () => {
  it("renders the terminal dashboard without a landing page", () => {
    render(
      <TerminalDashboard
        initialData={{
          alerts: demoAlerts,
          trades: demoTrades,
          markets: [demoMarket],
          collectorState: null,
          configured: false
        }}
      />
    );

    expect(screen.getByText("KALSHI ALERT TERMINAL")).toBeInTheDocument();
    expect(screen.getByText("ALERT TAPE")).toBeInTheDocument();
    expect(screen.getByText("MARKET DETAIL")).toBeInTheDocument();
    expect(screen.getByText("INFORMATIONAL ONLY / NOT TRADING ADVICE")).toBeInTheDocument();
  });
});
