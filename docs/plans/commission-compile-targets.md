---
title: Commission compile targets (claude-code, codex, portable)
id: 036
status: backlog
source: CL
started:
completed:
verdict:
score: 0.70
worktree:
---

Treat commission as a compiler with a `--target` parameter. The pipeline definition (stages, quality criteria, entity schema) is source code. Commission compiles it into platform-specific orchestration files.

### Targets

| Target | Generates | Orchestration |
|--------|-----------|---------------|
| **claude-code** (default) | `.claude/agents/first-officer.md`, lieutenant agent files | Agent/TeamCreate/SendMessage, worktrees, team dispatch |
| **codex** | `AGENTS.md`, solo operator prompt | shell_command/apply_patch, sequential loop, workspace-write sandbox |
| **portable** | README + status script only | No orchestration — human or any agent operates manually |

### What's shared across targets (the "source")

- README with stages frontmatter (schema, state machine)
- Status script (bash, platform-agnostic)
- Entity template and schema
- Stage prose definitions (inputs/outputs/good/bad)

### What differs per target (the "binary")

- Agent file format and location (`.claude/agents/` vs `AGENTS.md` vs none)
- Dispatch mechanism (Agent tool vs sequential loop vs manual)
- Communication model (TeamCreate/SendMessage vs direct output vs none)
- Lieutenant agent format (Claude Code agent files vs Codex scoped AGENTS.md vs instruction docs)

### Evidence

- `references/codex-tools.md` already contains a solo operator prompt — this is effectively a hand-compiled Codex target
- The first-officer template is the Claude Code target
- A portable target is just the PTP format without any orchestration layer

### Scope

- Add `--target` parameter to commission skill (default: claude-code)
- Factor out shared generation (README, status, entities) from target-specific generation (agent files)
- Implement codex target using the solo operator pattern from codex-compatibility research
- Implement portable target (trivial — just skip agent file generation)
