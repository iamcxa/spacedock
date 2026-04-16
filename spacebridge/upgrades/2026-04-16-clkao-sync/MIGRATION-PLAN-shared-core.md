# Migration Plan — references/first-officer-shared-core.md

**Approach**: re-base on upstream (428→237 lines, upstream is leaner after dedup #58), then re-apply fork-specific overlays as named sections. No textual merge.

## Section-by-section decisions

| Section | Status | Decision | Rationale |
|---|---|---|---|
| Startup | Both, drifted | **Rebase to upstream + re-apply 4 fork bits** | Upstream's `status --discover` + `--boot` is strictly more capable. Fork bits to preserve: (1) grafted workflow support (source 2.4), (2) dashboard check (step 6.5), (3) `stages.profiles` extraction in step 3, (4) `dispatch: task-list-driven/debate-driven` stage property |
| Status Viewer | Both, minor drift | **Upstream + fork's plugin-manifest cross-ref note** | Fork adds one-liner about `{spacedock_plugin_dir}` reuse |
| Event Emission | Fork-only | **Keep as overlay** | Dashboard is fork-specific feature |
| Single-Entity Mode | Both | **Adopt upstream** | Upstream has 152b0e41 fix (non-interactive gate); fork version lacks this guard |
| Working Directory | Both | **Adopt upstream** | Cleaner post-consolidation |
| Effective Stages | Fork-only | **Keep as overlay** | 034 B1 work, load-bearing for profile routing |
| Brainstorm Triage | Fork-only | **Keep as overlay, verify** | 034 B2 inline-FO triage; needs test that `(FO inline)` dispatch semantics still compose with upstream's runtime adapter |
| Dispatch | Both, drifted | **Adopt upstream runtime-adapter abstraction + keep fork dispatch modes** | Upstream makes dispatch runtime-pluggable (#58). Fork's task-list-driven + debate-driven should become named dispatch modes under the new abstraction |
| Completion and Gates | Both | TBD — needs diff | Likely adopt upstream |
| Feedback Rejection Flow | Both | **Adopt upstream** | Upstream has captain-rejection fix (3fcd207a) |
| Merge and Cleanup | Both | TBD — needs diff | Likely adopt upstream |
| State Management | Both, upstream split | **Adopt upstream's split** | Upstream moved ownership-semantics to new Worktree Ownership section |
| Worktree Ownership | Upstream-only | **Adopt** | New explicit section, no fork conflict |
| FO Write Scope | Upstream-only | **Adopt** | 097 guardrail + E2E test — meaningful safety net |
| **Mod Hook Convention** | Both, **design conflict** | **⚠️ Captain decision required** | See below |
| Clarification and Communication | Both | **Adopt upstream** | Baseline likely unchanged |
| Probe and Ideation Discipline | Upstream-only | **Adopt** | 9917c52b usage-presence-is-not-existence rule, universally useful |
| Channel Awareness | Fork-only | **Keep as overlay** | Dashboard-dependent |
| Issue Filing / Scaffolding | Naming diff | **Adopt upstream's naming** | Upstream separates scaffolding detection from issue filing; fork merged them. Upstream is clearer. |

## ⚠️ Design conflict requiring captain decision

### Mod Hook Convention: layered (fork) vs single-location (upstream)

**Fork**: Library mods in `mods/*.md` (repo root) + workflow mods in `{workflow}/_mods/*.md`. Layering with override semantics (workflow mod wins if `name:` collides).

**Upstream**: Only `{workflow}/_mods/*.md`. No library path.

**Why fork went layered**: cross-workflow mods like `pr-review-loop` and `workflow-index-maintainer` are useful regardless of which workflow they're attached to. Duplicating into every workflow's `_mods/` is write-amplification.

**Why upstream is flat**: simpler mental model; one mod location per workflow; avoids override-resolution complexity.

**Options**:
- **A. Keep fork layered** — preserves our mod reuse pattern, diverges from upstream permanently in this section
- **B. Adopt upstream flat** — align, but requires duplicating library mods into `build-pipeline/_mods/` + any future workflow; loses override semantics
- **C. Negotiate upstream** — propose library-mod pattern as upstream PR; in meantime keep fork layered with a `// FORK-ADDITION` comment

**SO recommendation**: **C**. Library mods are a generalizable pattern (not spacebridge-specific). The feature is worth upstreaming; preserving layered locally while we negotiate costs nothing.

## Overlay mechanism (discovered by necessity)

After this analysis, the overlay primitive needed is clearer than in POC. Not section-splice, not annotated blocks — it's **section list with provenance**:

```
sections:
  - name: Startup
    source: upstream@SHA
    fork_patches:
      - step: 2
        patch: "add source 2.4 (grafted workflow plugin-manifest)"
      - step: 3
        patch: "add stages.profiles + dispatch property extraction"
      - step: 6.5
        patch: "add dashboard check"
  - name: Event Emission
    source: fork_only
  - name: Mod Hook Convention
    source: fork_only_override  # diverges from upstream by design, see conflict above
```

Workflow can't auto-apply these patches (LLM-mediated re-authoring required per section). But the **provenance schema** gives us audit trail + re-application recipe next upgrade.

## Execution plan (for captain approval)

1. Resolve Mod Hook Convention decision (A/B/C above)
2. SO produces rewritten `references/first-officer-shared-core.md` section-by-section following the table
3. Update `skills/first-officer/SKILL.md` to match upstream path conventions (references moved into `skills/first-officer/references/`)
4. Run the POC scenario-01 against the rewritten version to confirm behavioral alignment
5. Commit as single PR with this plan attached as audit artifact

**Estimated tokens for step 2**: ~30-50K (re-author ~15 sections, read both sides per section). Single session doable if we commit to it in one go.

**Pre-flight check before execution**: captain confirms Mod Hook decision + sections TBD (Completion and Gates, Merge and Cleanup) — SO inspects diffs inline during execution.
