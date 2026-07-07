import { afterEach, describe, expect, it } from "vitest";
import { sendAlertEmail } from "./email";
import { demoAlerts } from "./demo";

describe("sendAlertEmail", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_EMAIL_FROM;
    delete process.env.ALERT_EMAIL_TO;
  });

  it("skips sending when email configuration is absent", async () => {
    await expect(sendAlertEmail(demoAlerts[0])).resolves.toBe("skipped_no_config");
  });
});
