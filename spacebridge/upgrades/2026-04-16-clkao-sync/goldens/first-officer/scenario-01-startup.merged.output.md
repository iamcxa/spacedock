# Golden Output — scenario-01-startup — MERGED

**Captured**: 2026-04-16
**Run mode**: dry-run characterization via general-purpose agent
**Spec loaded**: `.worktrees/upgrade-fo-shared-core/skills/first-officer/{SKILL.md, references/first-officer-shared-core.md}`
**Tokens consumed**: 53,887 (tool_uses: 2, duration: 32.4s)
**Verdict**: ✅ **PASS** — 22/22 invariants satisfied

## Turn-by-turn behavior (merged)

**Turn 1 — Root discovery**
- `git rev-parse --show-toplevel` → `/tmp/poc-fo-sandbox`

**Turn 2 — Workflow discovery (helper-first, fallback cascade)**
- `status --discover` returns zero paths → fall through cascade
- Project-local scan finds `build-pipeline/README.md` with `commissioned-by:` frontmatter
- Helper-first semantics preserved; fork cascade activates only on fallthrough

**Turn 3 — Single-call boot + dashboard + hooks**
- Read `build-pipeline/README.md` extracting mission/labels/profiles/dispatch-modes
- `status --boot` single call parses MODS/NEXT_ID/ORPHANS/PR_STATE/DISPATCHABLE
- Run startup mod hooks (none registered)
- Dashboard port check fails → blocking captain prompt (wait for response)

## Union Invariant Verification — 22/22 PASS

### GAINs from upstream (8/8 ✅)
1. `git rev-parse --show-toplevel` first
2. `status --discover` primary discovery
3. `status --boot` single call
4. `status --set` mandatory for frontmatter writes
5. FO Write Scope section present
6. Worktree Ownership section explicit
7. Probe and Ideation Discipline
8. Non-interactive Single-Entity Mode guard

### PRESERVEs from fork (11/11 ✅)
9. Plugin-manifest fallback for grafted workflows
10. Dashboard port check + blocking captain prompt
11. Event Emission at 6 lifecycle points (dispatch/completion/gate/feedback/merge/idle)
12. Effective Stages computation
13. Brainstorm Triage inline for (FO inline) entities
14. Channel Awareness 5-rule cascade
15. Layered mod scan (library `mods/` + workflow `_mods/` with override)
16. Pre-Ship Confidence Gate before terminal
17. Merge Confidence Assessment defense-in-depth (step 0)
18. Pending Knowledge Captures processing (completion step 6)
19. Dispatch modes (simple / task-list-driven / troops-dispatch / debate-driven)

### Required ABSENCES (3/3 ✅)
20. Fork's 4-source cascade NOT primary (only fallback after helper)
21. No standalone `status --where "worktree !="` orphan check at startup (uses `--boot` ORPHANS)
22. No direct `Edit` on frontmatter (explicitly forbidden in Status Viewer + FO Write Scope)

## Conclusion

Merged spec successfully unions upstream semantic upgrades with fork-specific feature preservation. Ready for commit and PR to iamcxa/main.

## Cost summary

| Stage | Tokens |
|-------|--------|
| A (upstream characterize) | 47,407 |
| B (fork characterize) | 51,826 |
| E (merged characterize) | 53,887 |
| **Total LLM characterize** | **153,120** |

Per-scenario budget baseline established for future upgrades: ~50K tokens per side, ~150K per scenario per skill for full A+B+E protocol.
