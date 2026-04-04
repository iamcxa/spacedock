import { describe, test, expect, beforeEach, afterEach } from "bun:test";

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
    SENTRY_DSN: process.env.SENTRY_DSN,
  };
  delete process.env.POSTHOG_API_KEY;
  delete process.env.POSTHOG_HOST;
  delete process.env.SENTRY_DSN;
});

afterEach(() => {
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
});

describe("Telemetry Guard Logic", () => {
  test("init() with no env vars is no-op", async () => {
    const mod = await import("../../tools/dashboard/src/telemetry");
    mod.telemetryInit();
    expect(mod.posthogEnabled()).toBe(false);
    expect(mod.sentryEnabled()).toBe(false);
  });

  test("captureEvent() silently does nothing when PostHog is not configured", async () => {
    const mod = await import("../../tools/dashboard/src/telemetry");
    mod.telemetryInit();
    // Should not throw
    mod.captureEvent("test_event", { key: "value" });
  });

  test("captureException() silently does nothing when Sentry is not configured", async () => {
    const mod = await import("../../tools/dashboard/src/telemetry");
    mod.telemetryInit();
    // Should not throw
    mod.captureException(new Error("test"));
  });

  test("getPosthogJsConfig() returns null when not configured", async () => {
    const mod = await import("../../tools/dashboard/src/telemetry");
    expect(mod.getPosthogJsConfig()).toBeNull();
  });

  test("getPosthogJsConfig() returns config when POSTHOG_API_KEY is set", async () => {
    process.env.POSTHOG_API_KEY = "phc_test123";
    process.env.POSTHOG_HOST = "https://app.posthog.com";
    const mod = await import("../../tools/dashboard/src/telemetry");
    const config = mod.getPosthogJsConfig();
    expect(config).toEqual({
      apiKey: "phc_test123",
      host: "https://app.posthog.com",
    });
  });

  test("getPosthogJsConfig() uses default host when POSTHOG_HOST is not set", async () => {
    process.env.POSTHOG_API_KEY = "phc_test123";
    const mod = await import("../../tools/dashboard/src/telemetry");
    const config = mod.getPosthogJsConfig();
    expect(config).toEqual({
      apiKey: "phc_test123",
      host: "https://us.i.posthog.com",
    });
  });
});
