import { Resend } from "resend";
import type { AlertRecord } from "./types";
import { getListEnv } from "./env";

export async function sendAlertEmail(alert: AlertRecord): Promise<"sent" | "skipped_no_config"> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getListEnv("ALERT_EMAIL_TO");
  const from = process.env.ALERT_EMAIL_FROM;

  if (!apiKey || !from || recipients.length === 0) {
    return "skipped_no_config";
  }

  const resend = new Resend(apiKey);
  const marketTitle = alert.markets?.title ?? alert.ticker;

  await resend.emails.send({
    from,
    to: recipients,
    subject: `[${alert.severity.toUpperCase()}] Kalshi unusual bet: ${alert.ticker}`,
    text: [
      `Kalshi unusual bet alert`,
      ``,
      `Market: ${marketTitle}`,
      `Ticker: ${alert.ticker}`,
      `Score: ${alert.score}`,
      `Reason: ${alert.reason}`,
      `Trade IDs: ${alert.triggering_trade_ids.join(", ")}`,
      ``,
      `This is informational only and is not trading advice.`
    ].join("\n")
  });

  return "sent";
}
