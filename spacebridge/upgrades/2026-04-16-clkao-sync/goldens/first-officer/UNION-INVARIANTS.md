# Union Invariants — scenario-01-startup — MERGED (target)

**Stage C of upgrade protocol**: negotiated union of A (upstream) + B (fork) MUST invariants.
**Produced**: 2026-04-16 from measured A + B goldens
**Captain decisions applied**: Mod Hook Convention = C (keep fork layered, propose upstream PR)

## How to read this doc

Each invariant is tagged:
- `[GAIN]` — upstream added this; merged version must have it (new capability)
- `[PRESERVE]` — fork-only; merged version must keep it (existing feature)
- `[RECONCILE]` — both sides wanted this differently; merged version reconciles
- `[DROP]` — fork had; upstream subsumed; merged version drops

## Union MUST invariants (fires for scenario-01)

### Discovery

1. `[RECONCILE]` Discover workflow via **upstream `status --discover` helper** as primary, then **fork source 2.4 (plugin-manifest with LOCAL.yaml readme_operations)** as fallback for grafted workflows if helper returns zero paths. Explicit user-path still wins over both.
   - Rationale: `status --discover` handles the common case leaner; plugin-manifest is fork's grafted-workflow feature that helper doesn't know about.
   - Execution: likely needs helper enhancement upstream (status --discover should learn plugin-manifest), interim: fork overlay checks plugin-manifest when helper returns empty.

2. `[DROP]` Fork's project-local filesystem scan (source 2 of 4-source cascade) — upstream `status --discover` replaces this cleanly.

3. `[DROP]` Fork's user-scoped `~/.claude/workflows/` scan (source 3) — upstream `status --discover` should cover; verify during migration execution.

### Single boot call

4. `[GAIN]` Run `status --boot` after discovery + README read. Parse MODS / NEXT_ID / ORPHANS / PR_STATE / DISPATCHABLE sections in one pass. Replaces fork's separate `--where` orphan scan + `--next` dispatch scan.

5. `[DROP]` Fork's `status --where "worktree !="` orphan check — `--boot`'s ORPHANS section subsumes.

### Mods

6. `[PRESERVE]` Library (`mods/*.md`) + workflow (`{workflow}/_mods/*.md`) dual scan with override semantics. Per captain decision C, keep fork layered; propose upstream PR separately.
   - Surface via `status --boot` MODS section if helper supports; else post-boot scan.
   - Must mark in migration as `fork_only_override` in section provenance.

### Dashboard (fork-only)

7. `[PRESERVE]` Dashboard port check at `~/.spacedock/dashboard/$(shasum | cut -c1-8)/channel_port` + blocking captain prompt when missing. No upstream dependency.

### Dispatch pipeline

8. `[PRESERVE]` `effective_stages()` recomputed per dispatch (fork Effective Stages section).

9. `[PRESERVE]` Brainstorm Triage inline handling when `DISPATCH=(FO inline)` + 5-criterion executability score + A/B/C captain gate + `score: N/5` frontmatter write via `status --set`.
   - **Reconciliation with upstream**: use upstream's `status --set` (write discipline) for score field write; fork's triage logic layers on top.

10. `[PRESERVE]` Dispatch mode selection from stage `dispatch:` property (simple / task-list-driven / troops-dispatch / debate-driven).
    - **Reconciliation with upstream**: upstream Dispatch section abstracts "runtime-specific dispatch mechanism". Fork modes become named options under that abstraction. Runtime adapter chooses concrete Agent() call.

### Lifecycle hooks (fork-only, dashboard-dependent)

11. `[PRESERVE]` Event Emission at 6 lifecycle points (dispatch/completion/gate/feedback/merge/idle), conditional on dashboard running; best-effort (suppress on failure).

12. `[PRESERVE]` Channel Awareness 5-rule cascade when captain sends channel message without naming entity.

### Completion and quality gates

13. `[PRESERVE]` Pre-Ship Confidence Gate (spacedock:confidence-gate mode=pre_ship_gate, 90% composite + 3-iter auto-fix) before terminal stage.

14. `[PRESERVE]` Merge hook Confidence Assessment read + block <90% (defense-in-depth).

15. `[PRESERVE]` Pending Knowledge Captures scan at completion + invoke knowledge-capture skill mode=apply.

### State management and guardrails

16. `[GAIN]` FO Write Scope guardrail (upstream 097): enumerate what FO may write on main; E2E rejection test for out-of-scope writes.

17. `[GAIN]` Worktree Ownership section (upstream split from State Management): explicit rules for worktree-vs-main frontmatter authority.

18. `[GAIN]` Probe and Ideation Discipline (upstream 9917c52b): "usage presence is not existence evidence" rule — check tool schema via ToolSearch before grep.

19. `[GAIN]` Non-interactive single-entity mode guard (upstream 152b0e41): don't enter single-entity mode in interactive sessions even if entity named.

20. `[RECONCILE]` Frontmatter writes via **upstream `status --set`** with `old -> new` diff output per field. Fork's direct Edit on frontmatter is dropped — `status --set` is mandatory (upstream guardrail).
    - Fork's Brainstorm Triage `score:` write uses `status --set` going forward.
    - Fork's Event Emission lifecycle data does NOT touch frontmatter, so this doesn't affect it.

21. `[GAIN]` Terminalization guards in `status --set`: refuses `status->archived` if `mod-block` set; refuses combined `mod-block` + terminal transition in single call.

### Communication

22. `[GAIN or DROP-if-redundant]` Feedback rejection captain-gate path (upstream 3fcd207a): explicit REJECTED handling with captain gate. Verify fork has equivalent; if not, GAIN.

23. `[PRESERVE]` Scaffolding guardrail: no commits to skills/, agents/, references/, plugin.json, commissioned READMEs without tracking artifact. Upstream restructured as "Issue Filing" section — naming align, behavior preserved.

## Invariants NOT firing in scenario-01 (but must be preserved in merged spec)

Numbers 7, 9-15, 18-22 don't all fire on fresh empty-entity startup. Scenario-01's MUST-check covers 1, 4, 6-8, 16-17, 19, 23. Additional scenarios needed for full coverage:
- **scenario-02-dispatch**: exercises 10, 11 (dispatch event), 12 (if channel message), 20 (status --set)
- **scenario-03-completion**: exercises 13, 14, 15, 21 (terminalization)

POC only committed to scenario-01 for cost measurement. Remaining scenarios are migration-execution-time work (reuse same harness).

## Merged scenario-01 MUST-check (pass criteria for stage E)

After migration (D), re-run characterize on merged shared-core. Must satisfy:

**Present (must appear in Turn 1-3 behavior description)**:
- `git rev-parse --show-toplevel` first
- `status --discover` (not project-local scan)
- Plugin-manifest fallback (if helper returns zero)
- README extracts mission/labels/stages (incl. profiles + dispatch property)
- `status --boot` single call for mods+orphans+next (not separate calls)
- Dual mod scan library+workflow (captain C decision)
- Dashboard port check → blocking captain prompt
- `effective_stages()` computation language present
- Brainstorm Triage inline handling mentioned for (FO inline) entities
- Dispatch mode selection from stage property
- FO Write Scope referenced
- Frontmatter writes via `status --set`
- Non-interactive single-entity guard referenced

**Absent (must NOT appear)**:
- Project-local filesystem scan (fork's old source 2)
- User-scoped `~/.claude/workflows/` scan (fork's old source 3)
- `status --where "worktree !="` standalone orphan check
- Direct Edit of entity frontmatter (must use `status --set`)

**Drift detection rule**: if merged output contains a fork-dropped primitive OR lacks an upstream-gained primitive, stage E fails → return to D for section re-author.
