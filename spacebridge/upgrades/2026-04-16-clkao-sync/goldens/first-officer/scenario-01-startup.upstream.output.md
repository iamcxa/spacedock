# Golden Output — scenario-01-startup — UPSTREAM

**Captured**: 2026-04-16
**Run mode**: dry-run characterization via general-purpose agent
**Spec loaded**: `sandbox/upstream/{SKILL.md, shared-core.md}`
**Tokens consumed**: 47,407 (tool_uses: 2, duration: 28.8s)

## Turn-by-turn behavior (upstream)

**Turn 1 — Project root discovery**
- Action: run `git rev-parse --show-toplevel`
- Interpretation: anchor working directory (no cd into worktrees)

**Turn 2 — Workflow directory discovery**
- Action: run `{spacedock_plugin_dir}/skills/commission/bin/status --discover`
- Read resolved `build-pipeline/README.md` to extract mission, entity labels, stage ordering, stage properties

**Turn 3 — Single-call boot**
- Action: run `status --workflow-dir <dir> --boot`
- Parse MODS / NEXT_ID / ORPHANS / PR_STATE / DISPATCHABLE sections
- Run startup mod hooks
- Present first dispatchable entity to captain with stage proposal

## MUST invariants (fork-authored) vs upstream behavior

| Invariant (from fork-side spec) | Upstream | Note |
|---|---|---|
| Run `git rev-parse --show-toplevel` first | ✅ | Matches |
| Project-local filesystem scan for workflow | ❌ | Upstream uses `status --discover` helper |
| Read workflow README | ✅ | Matches |
| Scan mods in `mods/` (library) + `{workflow}/_mods/` | ❌ | Upstream: only `{workflow}/_mods/`, no library path |
| Run startup hooks before dispatch | ✅ | Matches |
| Invoke `status --next` for dispatchable | ⚠️ | Upstream uses `status --boot` (includes DISPATCHABLE) |
| Present first entity to captain | ✅ | Matches |

## Critical behavioral shifts detected

1. **New `status --boot` primitive**: consolidates discovery/orphan/PR/next into single call.
2. **`status --discover` replaces filesystem scan**: helper-based workflow discovery, no more `.git`/`node_modules` exclusion logic.
3. **Mod hooks simplified**: no library-level `mods/` directory — only `{workflow}/_mods/`.

These are NOT additive changes. They're semantic replacements. Our fork's `Event Emission`, `Effective Stages`, etc. sections are overlays on top of a **fundamentally reshaped startup contract**. Naive overlay would produce incoherent instructions (e.g., fork says "scan `mods/`" while upstream core says that path doesn't exist).
