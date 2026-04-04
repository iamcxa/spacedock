---
id: 005
title: Observability Integration (PostHog/Sentry/Langfuse)
status: explore
source: brainstorming session
started:
completed:
verdict:
score: 0.7
worktree: .worktrees/ensign-observability-integration
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires feature B (004 Dashboard Persistent Daemon)** — stable server process needed before adding external tracking
- Can be developed in parallel with feature A (003 Real-time Agent Activity Feed)

## Brainstorming Spec

APPROACH:     Integrate external observability tools into the Spacedock dashboard and FO lifecycle to track agent behavior, performance, and errors. PostHog for product analytics (which workflows are used, stage completion rates), Sentry for error tracking (agent crashes, server errors), Langfuse for LLM tracing (agent token usage, latency, prompt quality).
ALTERNATIVE:  Build custom observability from scratch (rejected: reinventing mature tooling, maintenance burden). Log-only approach (rejected: no structured querying, no dashboards, no alerting).
GUARDRAILS:   Observability is opt-in — dashboard works without any external service configured. API keys stored in environment variables, never in committed files. Telemetry must not block or slow down the main workflow. Privacy: no entity content sent to external services — only metadata (stage names, durations, counts, error types).
RATIONALE:    As Spacedock scales to multiple projects and longer-running workflows, visibility into agent performance and reliability becomes critical. External tools provide dashboards, alerting, and historical analysis that would be expensive to build from scratch.

## Acceptance Criteria

- Configuration via environment variables (opt-in, no API keys in code)
- PostHog integration: track workflow events (entity dispatched, stage completed, gate approved/rejected)
- Sentry integration: capture server errors, agent crash reports, unhandled exceptions
- Langfuse integration: trace agent LLM calls with token usage, latency, and prompt metadata
- Dashboard UI shows observability status (connected/disconnected per service)
- All integrations are no-op when not configured (zero impact on existing functionality)
- Privacy: only metadata sent externally, never entity body content or file contents
