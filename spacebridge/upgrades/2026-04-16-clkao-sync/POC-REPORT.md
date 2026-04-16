# POC Report — Upgrade Workflow Validation via shared-core characterize

**Date**: 2026-04-16
**POC Target**: `references/first-officer-shared-core.md` (heaviest drift file)
**Workflow Stage Simulated**: triage + characterize (scaffolding only; no LLM execution yet)

## What this POC validated

### ✅ Workflow shape is viable

1. **Sandbox export works** — both sides extractable to `sandbox/{upstream,ours}/` via `git show clkao/main:path` + `cp`
2. **Structural diff reveals merge hazards early** — section-header grep alone surfaces 7 disjoint sections (3 upstream-only, 4 fork-only), proving textual merge would produce incoherent output
3. **Triage schema captures real decisions** — `triage.yaml` records path-reorg hazard, per-section changes, captain-confirmed intent, characterize priority
4. **Golden scenario format is concrete** — scenario-01 defines MUST/MUST-NOT invariants independent of exact LLM phrasing, makes behavioral diff tractable

### ⚠ Gaps surfaced by POC

1. **Path reorg detection missing from design**: upstream moved `references/*.md` → `skills/*/references/*.md`. Gray Area 7 (scope) didn't account for file moves. Triage stage needs `git log --follow` or `git diff --find-renames` to detect these. Added to `triage.yaml.workflow_validation_findings`.

2. **Consumer-mapping is non-trivial**: shared-core is loaded by `skills/first-officer/SKILL.md`, but ALSO referenced by ensign (via ensign-shared-core.md on upstream). True consumer set requires transitive reference scan. Single-hop grep is insufficient.

3. **Scenario generation cost unknown**: POC hand-drafted scenario-01 (~15 min). Writing-skills auto-gen (Gray Area 2 option D) may produce unusable drafts — won't know until Gray Area 2 is actually tested.

### ❌ Not yet validated (deferred to real upgrade)

1. **Characterize LLM run**: scenario-01 defines expected behavior, but we haven't actually invoked FO in sandbox with upstream shared-core. Real POC needs a controlled sandbox (isolated workflow dir) where LLM runs are replayable. Cost estimate: ~5-10K tokens per scenario per side = 30-60K per skill per upgrade.

2. **Overlay stage**: no code demonstrated for "apply fork sections on upstream base as overlays". Candidate approaches (unverified):
   - Section-level diff-and-splice (requires heading-aware parser)
   - Annotated overlay blocks in source (e.g., `<!-- FORK-OVERLAY: Event Emission -->`)
   - Separate overlay files assembled at load time (changes runtime loading semantics)
   Pick during real upgrade implementation.

3. **Regression detection via golden diff**: scenario-01 defines format, but MUST/MUST-NOT checking needs implementation — likely a small verifier skill that reads golden + actual output and produces pass/fail per invariant.

## Key findings impacting main workflow design

### Finding 1: Triage stage needs rename/move detection

Amend workflow design Gray Area 7:
- Scope stays "prompt-heavy artifacts" (yes)
- ADD: triage must detect file moves + reorg, not just content diff
- Triage input: `git diff --name-status --find-renames=50% origin/main clkao/main`

### Finding 2: Consumer mapping needs transitive scan

The "manual map" part of Gray Area 1 (B + manual map) has hidden complexity. Consider:
- Build a reference graph at upgrade start (grep reference filenames across all SKILL.md + agents)
- Reverse-lookup per drifted reference → consumer list
- Present consumer list to captain in triage; captain confirms characterize targets

### Finding 3: Goldens should be skill-scoped, not file-scoped

Directory layout adjusted: `goldens/{skill}/scenario-NN-*.md` (was implied by design, now explicit). Reference drift maps to consumer skill goldens, not reference-file goldens.

## Recommendation for next step

Before full upgrade:
1. ✅ Accept this POC scaffolding as workflow baseline
2. Implement a small `build-reference-graph` helper (one-time investment, reusable every upgrade)
3. Run a **real LLM characterize** on ONE scenario (scenario-01 upstream side) to measure token cost + output stability
4. Only then commit to full upgrade execution

## Artifacts produced

```
spacebridge/upgrades/2026-04-16-clkao-sync/
├── POC-REPORT.md                          (this file)
├── triage.yaml                            (classification output)
├── sandbox/
│   ├── upstream/{shared-core.md, SKILL.md}
│   └── ours/{shared-core.md, SKILL.md}
└── goldens/first-officer/
    └── scenario-01-startup.md             (format definition, no output yet)
```

Total tokens consumed by POC: ~0 LLM tokens for characterize (scaffolding only), ~3K for triage analysis. Real upgrade characterize per skill estimated 30-60K tokens.
