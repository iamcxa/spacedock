# Competitive Analysis

Spacedock vs. alternative approaches to AI agent orchestration and workflow management. Reviewed March 2026.

## Projects Analyzed

| Project | What it is |
|---------|------------|
| [OpenClaw](https://github.com/openclaw) | Personal AI assistant gateway for messaging channels |
| [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) | Kanban UI for planning work and dispatching coding agents |
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | Terminal TUI managing multiple coding agent sessions |
| [Background Agents](https://github.com/ColeMurray/background-agents) | Cloud background coding agents (Cloudflare + Modal) |
| [Antfarm](https://github.com/snarktank/antfarm) | Multi-agent workflow runner on OpenClaw |

## Comparison Matrix

| Dimension | Spacedock | OpenClaw | Vibe Kanban | Claude Squad | Background Agents | Antfarm |
|---|---|---|---|---|---|---|
| Architecture | Plugin generates standalone files + agent | Gateway control plane + channel connectors | Rust backend + web UI + workspaces | Go TUI + tmux + git worktrees | Cloudflare control plane + Modal sandboxes | YAML workflows + SQLite + cron polling |
| State management | Markdown files with YAML frontmatter in git | Gateway session state | SQLite + git branches | Git worktrees (ephemeral sessions) | Durable Objects + git | SQLite + git + progress files |
| Human-in-the-loop | Declarative approval gates at stage boundaries | Chat commands on messaging channels | UI diff review + inline comments | TUI attach/review/checkout | Web/Slack/extension + multiplayer | Escalation on retry exhaustion |
| Persistence | Fully git-native (markdown files) | Gateway sessions | SQLite | Git branches (session state ephemeral) | Cloud databases + git | SQLite + git |
| Multi-agent | First officer dispatches ensigns; parallel via worktrees | Multi-agent routing (independent) | Independent workspaces | Independent sessions | Independent sessions | Sequential specialized agents |
| Portability | Self-contained; works without Spacedock after generation | Requires OpenClaw gateway | Requires Vibe Kanban app | Requires tmux + gh | Requires Cloudflare + Modal | Requires OpenClaw runtime |

## Spacedock's Position

No other tool combines:
1. Declarative workflow definition
2. Git-native markdown state
3. Automated multi-agent orchestration with a dispatcher pattern
4. Declarative approval gates
5. Self-contained portability (works without the tool after generation)

### Closest competitor: Antfarm

Both define multi-agent workflows with specialized roles. Key differences:
- Spacedock is git-native/plain-text/self-contained; Antfarm is YAML/SQLite/OpenClaw-dependent
- Spacedock has approval gates; Antfarm has retry+escalation
- Spacedock processes multiple work items through parallel stages; Antfarm processes one task through linear steps

### Gaps

**UI and visual feedback.** Every competitor except Claude Squad has some visual surface. Spacedock is terminal-and-markdown-only. Arguably a feature (simplicity, portability) but limits accessibility.

**Agent-agnosticism.** Vibe Kanban and Claude Squad support multiple coding agents. Spacedock is currently Claude Code-specific with experimental Codex support.

### What to learn from

- **Antfarm:** Pre-built workflow templates (feature-dev, security-audit, bug-fix) -- Spacedock could offer a catalog during commission
- **Claude Squad:** Staying minimal and focused is a competitive advantage
- **Vibe Kanban:** Better mechanisms for reviewing agent work at approval gates

### What not to copy

- OpenClaw's kitchen-sink approach -- complexity for complexity's sake
- Background Agents' cloud dependency -- contradicts local-first, self-contained philosophy
- Vibe Kanban's UI-dependent state -- markdown-as-state is a core differentiator
