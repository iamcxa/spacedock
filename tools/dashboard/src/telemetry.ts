/**
 * Observability integration — opt-in PostHog analytics and Sentry error tracking.
 *
 * All SDK imports are gated behind environment variable checks. When the
 * corresponding env var is absent, helpers are silent no-ops. This module
 * is the ONLY place that imports posthog-node or @sentry/bun.
 *
 * Environment variables:
 *   POSTHOG_API_KEY  — PostHog project API key (enables analytics)
 *   POSTHOG_HOST     — PostHog instance URL (default: https://us.i.posthog.com)
 *   SENTRY_DSN       — Sentry DSN (enables error tracking)
 */

let _posthog: any = null;
let _sentry: any = null;

export function telemetryInit(): void {
  _posthog = null;
  _sentry = null;

  const apiKey = process.env.POSTHOG_API_KEY;
  if (apiKey) {
    try {
      const { PostHog } = require("posthog-node");
      _posthog = new PostHog(apiKey, {
        host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
        flushAt: 1,
        flushInterval: 0,
      });
    } catch (err) {
      console.error(`[telemetry] PostHog configured but SDK not available: ${err}`);
    }
  }

  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      const Sentry = require("@sentry/bun");
      Sentry.init({
        dsn,
        sendDefaultPii: false,
        tracesSampleRate: 0.0,
      });
      _sentry = Sentry;
    } catch (err) {
      console.error(`[telemetry] Sentry configured but SDK not available: ${err}`);
    }
  }
}

export function posthogEnabled(): boolean {
  return _posthog !== null;
}

export function sentryEnabled(): boolean {
  return _sentry !== null;
}

export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!_posthog) return;
  _posthog.capture({
    distinctId: "spacedock-server",
    event: eventName,
    properties: properties ?? {},
  });
}

export function captureException(err?: Error): void {
  if (!_sentry) return;
  _sentry.captureException(err);
}

export function getPosthogJsConfig(): { apiKey: string; host: string } | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
  };
}
