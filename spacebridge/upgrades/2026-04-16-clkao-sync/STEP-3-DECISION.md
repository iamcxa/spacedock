# Step 3 Decision — Commission workflow NOW, or continue manual?

**Input**: Step 1 (reference graph helper) + Step 2 (LLM characterize run) results.

## Measured data

| Metric | Value |
|---|---|
| Tokens per scenario per side | 47,407 |
| Projected characterize cost per skill (3 scenarios × 2 sides) | ~285K tokens |
| Drifted reference files this upgrade | 7 |
| Skills needing characterize (via reference graph) | ~4 (FO, ensign, build-plan, build-uat + confidence-gate consumers) |
| Total projected characterize cost | ~1.1M tokens |

## Finding that changes the calculus

Step 2's run revealed upstream has **semantic behavior replacements**, not just additive drift:
- `status --boot` consolidates multi-call startup → single call
- `status --discover` replaces filesystem scan → helper-based
- Library `mods/` path eliminated

Our fork's overlay sections (Event Emission, Effective Stages, Brainstorm Triage, Channel Awareness) were designed against the OLD startup contract. Overlay-as-designed won't work — fork patches reference primitives (`status --next`, `mods/` scan) that upstream no longer provides.

This means the overlay stage in our workflow design is **incomplete**. We don't yet know the right overlay primitive because we haven't seen enough semantic-replacement cases.

## Decision

**Continue manual for this upgrade. Do NOT commission workflow yet.**

Rationale:
1. **Insufficient data points**: one upgrade is not enough to generalize overlay mechanics. Need 2-3 upgrades with different drift profiles before the workflow skeleton stops changing.
2. **Overlay stage is undesigned**: current workflow design assumes additive sections. Real drift is semantic replacement. Need to discover the actual overlay primitive (section-splice? re-author? three-layer spec?) by hand first.
3. **Cost concern is manageable**: 1.1M tokens total is substantial but tractable. Not running now to commission; will accrue gradually during manual work.
4. **POC findings will inform commission**: when we DO commission (after 2-3 manuals), we'll have real patterns to encode, not speculation.

## What stays (validated this round)

- ✅ Triage stage — `triage.yaml` schema is sound
- ✅ Reference graph helper — reusable across upgrades
- ✅ Sandbox export mechanism — `git show clkao/main:path` workflow works
- ✅ Characterize stage SHAPE — dry-run via agent dispatch is viable measurement

## What needs more data before commissioning

- ⚠️ Overlay stage mechanics — TBD after 2-3 manual overlays
- ⚠️ Scenario auto-generation (Gray Area 2 option D) — not validated; this POC hand-drafted scenario-01
- ⚠️ MUST-invariant source of truth — fork-authored invariants failed against upstream. Who authors them? Upstream? Both? Captain negotiates?
- ⚠️ Rename/reorg detection — flagged in POC but not implemented

## Immediate next action (if captain agrees)

Proceed with manual upgrade of `skills/first-officer/` as the first real case:
1. Read fork's `shared-core.md` section-by-section
2. For each fork section, decide: port forward / drop / re-author against upstream primitives
3. Document decisions as they're made — this is the data we need for eventual commission
4. Ship result as PR, use PR #54 as upstream baseline reference

Alternative: defer upgrade entirely, ship only the POC scaffolding + this decision doc, let upgrade work happen when there's real pressure.
