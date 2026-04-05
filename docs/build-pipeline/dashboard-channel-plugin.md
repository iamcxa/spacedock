---
id: 007
title: Dashboard as Channel Plugin — Interactive Workflow Control
status: pr-review
source: brainstorming session
started: 2026-04-05T01:22:00Z
completed:
verdict:
score: 0.95
worktree: .worktrees/ensign-dashboard-channel-plugin
issue:
pr: '#32'
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires features 001-006 completed** — dashboard server (Bun), persistent daemon, real-time WebSocket feed, observability
- Claude Code v2.1.80+ with channels support
- Bun runtime + @modelcontextprotocol/sdk

## Brainstorming Spec

APPROACH:     Turn the Spacedock dashboard into a Claude Code channel plugin. The dashboard MCP server declares `claude/channel` + `claude/channel/permission` capabilities, enabling bidirectional communication between the browser UI and the FO's Claude Code session. Gate approvals, workflow commands, and permission prompts flow through the dashboard instead of requiring terminal access.
ALTERNATIVE:  Keep dashboard read-only, use Telegram/Discord for interactive control (rejected: fragmented UX — captain would need to switch between dashboard for viewing and chat app for interacting)
GUARDRAILS:   Gate approval via channel must have the same guardrails as CLI (NEVER self-approve). Sender allowlist required. Permission relay must show the same information as terminal dialog. Dashboard channel does NOT replace terminal — both remain active, first response wins.
RATIONALE:    This is the "war room" vision fully realized — a single browser UI where the captain sees all workflows, agent activity, and can approve gates, respond to permission prompts, and send commands to the FO. Channels provide the official bidirectional protocol that was missing from features 001-003.

## Architecture

### Three communication mechanisms:

**1. Inbound (Browser → FO session):**
```
Browser click "Approve Gate" 
  → Dashboard HTTP POST /api/channel/send
  → Channel server calls mcp.notification({ method: 'notifications/claude/channel', params: { content: 'approve', meta: { type: 'gate_approval', entity: '...', stage: '...' } } })
  → FO session receives <channel source="spacedock-dashboard" type="gate_approval" ...>approve</channel>
```

**2. Outbound (FO session → Browser):**
```
FO calls reply tool with gate result / status update
  → Channel server's CallToolRequestSchema handler
  → WebSocket broadcast to browser
  → Browser renders in activity feed / notification
```

**3. Permission relay (Claude Code → Browser → Claude Code):**
```
Claude Code needs tool approval (e.g., git push)
  → permission_request notification to channel server
  → WebSocket push to browser: "Claude wants to run Bash: git push. Approve?"
  → Captain clicks Approve in browser
  → Channel server sends permission notification back: { behavior: 'allow' }
  → Tool executes
```

## Acceptance Criteria

- Dashboard registers as channel plugin via `claude/channel` + `claude/channel/permission` capabilities
- Gate approval buttons in UI actually work — clicking "Approve" sends approval through channel to FO session
- Permission prompts appear in dashboard UI with approve/reject buttons
- FO replies (gate results, status updates) render in dashboard activity feed
- Sender allowlist: only configured/paired users can send commands
- Terminal and dashboard both remain active — first response wins
- `--channels plugin:spacedock-dashboard` enables interactive mode
- Dashboard works as read-only viewer when not launched with `--channels` (backward compatible)
- Works alongside Telegram/Discord channels (captain can respond from any connected channel)
