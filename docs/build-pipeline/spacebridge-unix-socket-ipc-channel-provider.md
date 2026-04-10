---
id: 051
title: "Unix socket IPC + ChannelProvider client/server"
status: draft
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [050]
note: "Also depends on PR1 merged into clkao/spacedock (ChannelProvider interface extraction)"
---

## Problem

The bridge shim (spawned per Claude Code session) must communicate with the long-lived bridge daemon over a local transport. The ChannelProvider interface (defined in engine PR1) is the wire contract: events flow outbound from engine to bridge, and actions (comments, permission responses, entity edits) flow inbound from bridge to engine. The shim needs a unix socket client that implements ChannelProvider by forwarding calls to the daemon, and the daemon needs the corresponding server endpoint.

## Scope

- Implement unix socket server in the bridge daemon (listens on `~/.spacedock/spacebridge.sock`)
- Implement unix socket client in the bridge shim
- Define IPC message framing protocol (length-prefixed JSON or similar)
- Implement bridge-side `ChannelProvider` that wraps unix socket RPC calls to daemon
- Handle connection lifecycle: connect, reconnect on transient failure, graceful disconnect
- Implement `CoordinationClient` stub over the same socket (prepare the wire for entity 056)
- Basic integration test: shim connects to daemon, publishes event, daemon receives and acknowledges

## Acceptance Criteria

- [ ] Daemon listens on unix socket at `~/.spacedock/spacebridge.sock`
- [ ] Shim connects to daemon via unix socket and performs handshake
- [ ] ChannelProvider implementation forwards `publishEvent` calls over IPC to daemon
- [ ] Daemon forwards inbound actions (comments, permissions) over IPC to correct shim
- [ ] Connection handles daemon restart gracefully (shim reconnects)
- [ ] IPC message framing is documented and versioned
- [ ] Integration tests pass: event round-trip, action round-trip, reconnect scenario

## References

- Design doc §4.2 (Auto-fork implementation sketch): socket path and connection flow
- Design doc §5.1 (Role-aware CoordinationClient API): interface that will use this transport
- Design doc §5.3 (Bridge implementation — unix socket RPC): RPC design over unix socket
- Design doc §7.1 (PR1 — ChannelProvider interface extraction): upstream interface this implements
