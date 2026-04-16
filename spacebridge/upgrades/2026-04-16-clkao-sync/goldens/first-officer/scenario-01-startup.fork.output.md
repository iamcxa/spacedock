# Golden Output — scenario-01-startup — FORK

**Captured**: 2026-04-16
**Run mode**: dry-run characterization via general-purpose agent
**Spec loaded**: `sandbox/ours/{SKILL.md, shared-core.md}`
**Tokens consumed**: 51,826 (tool_uses: 2, duration: 53.0s)

## Turn-by-turn behavior (fork)

**Turn 1 — Workflow discovery**
- `git rev-parse --show-toplevel` → `/tmp/poc-fo-sandbox`
- Walk 4-source cascade: sources 1 (explicit), 3 (user-scoped), 4 (plugin-manifest) don't match; source 2 (project-local scan with `commissioned-by: spacedock@...`) finds `build-pipeline/README.md`

**Turn 2 — README extraction + mod scan + dashboard check**
- Extract mission, entity labels, stages (`profiles` / `defaults` / `states`), per-stage properties incl. `dispatch`
- Dual mod scan: `mods/*.md` (library) + `build-pipeline/_mods/*.md` (workflow) — both empty
- Dashboard port check → file missing → **blocking captain prompt** ("Dashboard is not running...")

**Turn 3 — Orphan check + `status --next`**
- `status --where "worktree !="` for orphans → none
- `status --next` returns PROFILE + DISPATCH columns
- 001 (draft/ready): if DISPATCH=(FO inline) → Brainstorm Triage (5-criterion + captain A/B/C gate)
- 002 (plan/ready): dispatch per `dispatch:` property (default simple → plan ensign)

## Fork-specific MUST invariants (14)

Categorized for union negotiation (C stage):

| # | Invariant | Primitive dependency | Upstream replaces? |
|---|---|---|---|
| 1 | 4-source workflow discovery cascade | filesystem scan | ⚠ partial (upstream uses `status --discover`) |
| 2 | Library+workflow mod dual scan with override | filesystem | ❌ (captain C: keep fork, PR upstream) |
| 3 | Dashboard port check + captain prompt | shasum + curl | ❌ fork-only |
| 4 | Event Emission at 6 lifecycle points | HTTP POST to dashboard | ❌ fork-only |
| 5 | `effective_stages()` recomputed every dispatch | entity frontmatter + README profiles | ❌ fork-only |
| 6 | Brainstorm Triage inline for `(FO inline)` | status `--next` PROFILE/DISPATCH cols | ❌ fork-enhanced primitive |
| 7 | Channel Awareness 5-rule cascade | channel message context | ❌ fork-only |
| 8 | Dispatch-mode selection from `dispatch:` property | README stage defs | ❌ fork-only |
| 9 | Pre-Ship Confidence Gate before terminal | confidence-gate skill | ❌ fork-only |
| 10 | Merge hook `## Confidence Assessment` <90% block | merge hook + frontmatter read | ❌ fork-only |
| 11 | Pending Knowledge Captures processing at completion | knowledge-capture skill | ❌ fork-only |
| 12 | Single-Entity Mode adapter-governed team creation | runtime adapter | ⚠ upstream 152b0e41 fix adds non-interactive guard |
| 13 | Scaffolding/Issue filing guardrail | git pre-commit | ⚠ upstream restructured as "Issue Filing" only |
| 14 | Status Viewer via `{spacedock_plugin_dir}` | commission plugin dir resolver | ✅ matches upstream |

## Deviations from upstream scenario-01

Fork startup uses `status --next` (3-call sequence: README → mods → orphans → next), upstream uses `status --boot` (single call with MODS/NEXT_ID/ORPHANS/PR_STATE/DISPATCHABLE sections).
