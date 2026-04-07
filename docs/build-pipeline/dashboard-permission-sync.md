---
id: 014
title: Dashboard Permission Sync — Auto-resolve Permission Requests Answered in CLI
status: quality
source: UI testing feedback
started: 2026-04-07T14:24:24Z
completed:
verdict:
score: 0.8
worktree: .worktrees/auto-researcher-dashboard-permission-sync
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 007 completed (channel plugin, bidirectional communication)
- Feature 003 completed (real-time activity feed)

## Brainstorming Spec

APPROACH:     When a permission request (PreToolUse approval) is answered in the Claude Code CLI, the dashboard feed should auto-update the corresponding permission card to reflect the resolved state. The card transitions from active (Approve/Reject buttons) to resolved (greyed out, showing "✅ Approved" or "❌ Rejected" badge). The card stays in the feed timeline for history but is no longer interactive. Implementation: listen for tool_result or permission_decision SSE events, match back to the original permission card by request ID, and update the card state.
ALTERNATIVE:  Remove permission cards entirely once resolved (rejected: breaks timeline continuity — captain loses the audit trail of what was approved during the session)
GUARDRAILS:   Must handle race conditions — captain might click dashboard Approve while CLI also approves. Must handle reconnection — if dashboard reconnects after permission was already resolved, the replayed event stream should show the correct resolved state. Must not break existing dashboard Approve/Reject functionality (dashboard approval should still work when captain prefers to use the UI).
RATIONALE:    Captain observed during UI testing that permission requests already approved in the CLI terminal still show as pending in the dashboard feed with active Approve/Reject buttons. This creates confusion — it looks like action is still needed when the request is already handled. The fix maintains timeline completeness while eliminating the false "action needed" signal.

## Acceptance Criteria

- Permission cards auto-update to resolved state when answered in CLI
- Resolved cards show status badge (✅ Approved / ❌ Rejected) instead of active buttons
- Resolved cards remain in feed timeline (not removed) with reduced visual prominence
- Works correctly on WebSocket reconnection (replayed events show correct state)
- Dashboard Approve/Reject buttons still functional when used directly
- No duplicate approvals when both CLI and dashboard respond
