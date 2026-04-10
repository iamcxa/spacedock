# Phase D -- Skill Contracts + Science Officer Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four skill-contract gaps surfaced by the Phase C smoke test (format drift, Open Questions rendering, loose-mode commit ambiguity, SO-direct prohibitions), expand Science Officer to own the full `brainstorm → explore → clarify` context-building phase via Boot Sequence routing, ship the `/science` wrapper and forge fixtures, and validate the whole stack end-to-end by running expanded SO on entity 047 (dogfood).

**Architecture:** Plan-driven, NOT FO-driven. Skill-contract repair cannot be dispatched via the pipeline because the skills being repaired are the pipeline's own tools (chicken-and-egg). Tasks 1-5 are pure markdown edits to skill reference docs, SKILL.md files, and the science-officer agent definition. Task 6 is the dogfood proof point: a Captain-driven SO-direct run on entity 047 that exercises every Task 1-5 fix. Tasks 7-9 are wrap-up (slash command, forge fixtures, plugin-split coordination). FO daemon continues running in background on unrelated entities only -- it must not touch Phase D work.

**Tech Stack:** Markdown editing for Tasks 1-5 and Tasks 7-9. Task 6 uses live `science-officer` agent invocation + `spacedock:build-brainstorm` + `spacedock:build-explore` + `spacedock:build-clarify` skills against entity 047. No runtime code changes to the dashboard or engine. All edits happen in the main repo; no worktree required because Phase D is plan-driven.

**Spec:** `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md` §Phase D (D.1 through D.7).

**Validation target entity:** `docs/build-pipeline/entity-body-rendering-hotfixes.md` (047) -- drafted last session, status `draft`, context_status `pending`. Bundles D.2 + D.3 as its own scope, so running it through the fixed flow produces both proof that Phase D skill fixes work AND the rendering hotfixes themselves.

**Captain's critical instructions:**
- Phase D is plan-driven. Do NOT dispatch via FO pipeline -- FO cannot fix the skills it runs.
- Smoke test Class 3 (build-clarify) MUST be Captain-driven. Do not attempt solo dogfood of interactive Q loops.
- Double dash `--` throughout, never em dash `—`. Hot-fix any em dashes that slip in.
- Main branch may move during execution (FO background shipping unrelated entities). Use fix-forward commits, NEVER `git commit --amend` on a branch with concurrent writers.
- Task 6 dogfood MUST follow Tasks 1-5. Running dogfood before fixes land tests broken infrastructure.

**Phase C lessons to apply:**
- Format definitions that appear in 2+ files must be cross-checked mechanically via grep, not by writer discipline.
- Stage Report field names are parsed by `tools/dashboard/src/frontmatter-io.ts` -- any format change must preserve parser compatibility.
- Production entity `dashboard-standalone-plugin.md` is the source-of-truth reference for the real Stage Report contract.
- Contradiction-annotation mechanism from build-explore is a correctness feature -- preserve it during any skill edits.

---

## File Structure

```
skills/build-explore/
├── SKILL.md                           # Task 5 -- remove Write/Edit prohibition, add SO-mode note
└── references/
    └── output-format.md               # Tasks 1, 2, 3 -- checklist format, Q blank lines, detail lines

skills/build-clarify/
├── SKILL.md                           # Task 5 -- Step 0 status-prep, Step 5 loose-mode clarification
├── references/
│   └── output-format.md               # Tasks 1, 3 -- checklist format, detail lines
└── fixtures/                          # Task 8 -- forge fixtures (new directory)
    ├── README.md
    ├── minimal-entity.md
    └── captain-responses.yaml

agents/
└── science-officer.md                 # Task 4 -- skills loadout, Boot Sequence routing

commands/
└── science.md                         # Task 7 -- /science slash command (new file)

docs/build-pipeline/
├── entity-body-rendering-hotfixes.md  # Task 6 -- dogfood target (entity 047)
└── spacedock-plugin-architecture-v2.md  # Task 9 -- plugin-naming coordination (entity 040, read + annotate)

docs/superpowers/plans/
└── 2026-04-10-phase-d-skill-contracts-and-so-expansion.md  # this plan
```

Reference files (read-only during Phase D):
- `tools/dashboard/src/frontmatter-io.ts:118-167` -- `extractStageReports` parser
- `docs/build-pipeline/dashboard-standalone-plugin.md` -- production Stage Report reference
- `docs/superpowers/plans/2026-04-09-build-clarify-skill-and-science-officer.md` -- Phase C plan (structure template)
- `docs/build-pipeline/dashboard-context-status-filter.md` (046) -- Phase C smoke-test artifact

---

### Task 1: Fix Stage Report format drift (D.1.1)

**Goal:** Update both skill reference docs so Stage Report items use `- [x]` checklist format matching the parser regex at `frontmatter-io.ts:140`. This unblocks dashboard rendering of every future explore/clarify Stage Report card.

**Files:**
- Modify: `skills/build-explore/references/output-format.md` (the `## Stage Report: explore` section around line 108-123)
- Modify: `skills/build-clarify/references/output-format.md` (the `## Section: Stage Report: clarify` section around line 103-124)

**Reference (read-only):**
- `tools/dashboard/src/frontmatter-io.ts:140` -- parser regex `/^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$/`
- `docs/build-pipeline/dashboard-standalone-plugin.md` -- production entity with correct checklist format

- [ ] **Step 1: Confirm parser contract by re-reading the regex**

Run:
```
Grep pattern="itemPattern" path="tools/dashboard/src/frontmatter-io.ts" output_mode="content" -n=true
```
Expected: line 140 shows `const itemPattern = /^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$/;`.

This is the contract. `- [x]` = done, `- [ ]` = pending, `SKIP:` / `FAIL:` prefixes allowed.

- [ ] **Step 2: Confirm production reference uses the contract**

Run:
```
Grep pattern="^## Stage Report:" path="docs/build-pipeline/dashboard-standalone-plugin.md" -A=8 output_mode="content"
```
Expected: items under each Stage Report start with `- [x] `. If production reference shows flat bullets instead, STOP and re-check the parser -- one of the two is wrong.

- [ ] **Step 3: Edit `skills/build-explore/references/output-format.md` Stage Report section**

Find the block:

```markdown
## Stage Report: explore

Summary block written at the end of the explore stage output. The FO and status script parse specific fields from this section.

```markdown
## Stage Report: explore

- Files mapped: 14 across domain, contract, view, frontend
- Assumptions formed: 6 (Confident: 4, Likely: 1, Unclear: 1)
- Options surfaced: 2
- Questions generated: 3
- α markers resolved: 2 / 3
- Scale assessment: revised from Small to Medium
```
```

Replace the inner code block with:

```markdown
## Stage Report: explore

- [x] Files mapped: 14 across domain, contract, view, frontend
- [x] Assumptions formed: 6 (Confident: 4, Likely: 1, Unclear: 1)
- [x] Options surfaced: 2
- [x] Questions generated: 3
- [x] α markers resolved: 2 / 3
- [x] Scale assessment: revised from Small to Medium
```

And replace the trailing paragraph:

```markdown
Six lines, always in this order. Field names must match exactly (the FO and status script parse these). Scale assessment uses one of: `confirmed` (no change from brainstorm's estimate) or `revised from X to Y` (where X and Y are `Small`, `Medium`, or `Large`).
```

With:

```markdown
Six items, always in this order. Each item MUST use the `- [x]` checklist format -- this is the parser contract defined at `tools/dashboard/src/frontmatter-io.ts:140`. Flat bullet format (`- {metric}`) is a drift bug; the dashboard will render the Stage Report card as empty. Field names must match exactly (the FO and status script parse these). Scale assessment uses one of: `confirmed` (no change from brainstorm's estimate) or `revised from X to Y` (where X and Y are `Small`, `Medium`, or `Large`).
```

- [ ] **Step 4: Edit `skills/build-clarify/references/output-format.md` Stage Report section**

Find the block under `## Section: Stage Report: clarify`:

```markdown
```markdown
## Stage Report: clarify

- Decomposition: {accepted|modified|rejected|not-applicable}
- Assumptions confirmed: {n} / {total} ({n corrected})
- Options selected: {n} / {total}
- Questions answered: {n} / {total}
- Canonical refs added: {n}
- Context status: ready
- Handoff mode: {loose|tight}
- Clarify duration: {n} questions asked, session complete
```
```

Replace the inner code block with:

```markdown
## Stage Report: clarify

- [x] Decomposition: {accepted|modified|rejected|not-applicable}
- [x] Assumptions confirmed: {n} / {total} ({n corrected})
- [x] Options selected: {n} / {total}
- [x] Questions answered: {n} / {total}
- [x] Canonical refs added: {n}
- [x] Context status: ready
- [x] Handoff mode: {loose|tight}
- [x] Clarify duration: {n} questions asked, session complete
```

And in the Rules block below, change:

```markdown
- All eight metric lines are mandatory -- use `0` or `not-applicable` rather than omitting.
```

To:

```markdown
- All eight metric lines are mandatory -- use `0` or `not-applicable` rather than omitting.
- Each line MUST use `- [x]` checklist format per parser contract (`tools/dashboard/src/frontmatter-io.ts:140`). Flat bullets are a drift bug.
```

- [ ] **Step 5: Verify no flat-bullet Stage Report lines remain**

Run:
```bash
grep -n '^- [^[]' skills/build-explore/references/output-format.md | grep -B1 -A0 'explore\|Files\|Assumptions formed\|Options surfaced\|Questions generated\|α markers\|Scale assessment'
grep -n '^- [^[]' skills/build-clarify/references/output-format.md | grep -B1 -A0 'clarify\|Decomposition\|Assumptions confirmed\|Options selected\|Questions answered\|Canonical refs\|Context status\|Handoff mode\|Clarify duration'
```
Expected: no matches that reference Stage Report metric names. (Other flat bullets elsewhere in the docs -- like Assumption A-1 bodies, Open Question formats, general rule bullets -- are fine; only the Stage Report code blocks are affected.)

- [ ] **Step 6: Update the Task 1 commit**

```bash
git add skills/build-explore/references/output-format.md skills/build-clarify/references/output-format.md
git commit -m "fix(phase-d): stage report checklist format matches parser contract (D.1.1)

Parser at tools/dashboard/src/frontmatter-io.ts:140 requires [x] format;
skill reference docs had flat bullets causing empty Stage Report cards in
dashboard UI. Production reference dashboard-standalone-plugin.md was the
real contract all along. Phase C smoke test (entity 046) surfaced the drift."
```

---

### Task 2: Open Questions blank-line separation (D.2)

**Goal:** Update build-explore Open Questions format to require blank lines between `Q-n` subfields so markdown renders each on its own paragraph instead of collapsing them into a single soft-newlined block. Addresses entity 047 scope.

**Files:**
- Modify: `skills/build-explore/references/output-format.md` (the `## Open Questions` section around line 64-82)

- [ ] **Step 1: Read the current Open Questions example**

Re-read `skills/build-explore/references/output-format.md` lines 64-82. The current format has single newlines between `Q-n:`, `Domain:`, `Why it matters:`, `Suggested options:` -- markdown will collapse them into one paragraph.

- [ ] **Step 2: Edit the Open Questions code block**

Find the block:

```markdown
```markdown
## Open Questions

Q-1: Should the explore stage produce a decomposition recommendation, or only flag when decomposition seems needed?
Domain: Runnable/Invokable
Why it matters: If explore recommends specific child entities, it needs to generate slugs and dependency graphs. If it only flags, that work moves to a later stage.
Suggested options: (a) Full decomposition with child slugs, (b) Flag-only with annotation, (c) Conditional based on gray area count

Q-2: What naming convention should new reference docs follow?
Domain: Readable/Textual
Why it matters: Determines discoverability and consistency with existing docs.
Suggested options: None -- captain input needed
```
```

Replace with:

```markdown
```markdown
## Open Questions

Q-1: Should the explore stage produce a decomposition recommendation, or only flag when decomposition seems needed?

Domain: Runnable/Invokable

Why it matters: If explore recommends specific child entities, it needs to generate slugs and dependency graphs. If it only flags, that work moves to a later stage.

Suggested options: (a) Full decomposition with child slugs, (b) Flag-only with annotation, (c) Conditional based on gray area count

Q-2: What naming convention should new reference docs follow?

Domain: Readable/Textual

Why it matters: Determines discoverability and consistency with existing docs.

Suggested options: None -- captain input needed
```
```

- [ ] **Step 3: Update the trailing paragraph to document the blank-line rule**

Find:

```markdown
Each question includes Domain (one of the 5 GSD domains), Why it matters, and Suggested options (or "None -- captain input needed" when genuinely open).
```

Replace with:

```markdown
Each question includes Domain (one of the 5 GSD domains), Why it matters, and Suggested options (or "None -- captain input needed" when genuinely open). Each field MUST be separated from the next by a blank line so markdown renders them as distinct paragraphs. Single-newline separation collapses into a wall of text when rendered in the dashboard UI. This also applies to the `→ Answer:` annotation that build-clarify appends during Q resolution -- the answer line gets its own blank-line separation from `Suggested options:`.
```

- [ ] **Step 4: Update build-clarify Answer annotation rule for consistency**

Edit `skills/build-clarify/references/output-format.md`. Find:

```markdown
Rules:
- Append after Suggested options, no blank line.
```

Replace with:

```markdown
Rules:
- Append after Suggested options with ONE blank line separating them (markdown paragraph break). Earlier versions used "no blank line" which collapsed the Answer into the Suggested options paragraph in the dashboard UI -- fixed in Phase D (D.2).
```

- [ ] **Step 5: Verify the build-explore example has blank lines between Q subfields**

Run:
```bash
awk '/^## Open Questions/,/^---$/' skills/build-explore/references/output-format.md | grep -c '^$'
```
Expected: at least 8 blank lines within the Open Questions section (2 questions × 4 fields each including the separator before next Q).

- [ ] **Step 6: Commit**

```bash
git add skills/build-explore/references/output-format.md skills/build-clarify/references/output-format.md
git commit -m "fix(phase-d): open questions blank-line separation between fields (D.2)

Markdown soft newlines collapse Q-n subfields (Domain / Why / Suggested options /
Answer) into a single paragraph. Explicit blank lines force paragraph breaks so
the dashboard renders each field on its own line. Matches entity 047 scope."
```

---

### Task 3: Stage Report Tier 1 detail lines (D.3)

**Goal:** Add optional 2-space-indented detail line format to both Stage Report sections. The parser at `frontmatter-io.ts:157-158` already reads the next indented line as `StageReportItem.detail`, so this is a free UI upgrade that unlocks per-metric context in dashboard cards.

**Files:**
- Modify: `skills/build-explore/references/output-format.md` (Stage Report explore section, same block edited in Task 1)
- Modify: `skills/build-clarify/references/output-format.md` (Stage Report clarify section, same block edited in Task 1)

**Reference (read-only):**
- `tools/dashboard/src/frontmatter-io.ts:155-160` -- `if (j + 1 < lines.length && lines[j + 1].startsWith("  ")) { detail = lines[j + 1].trim(); }`

- [ ] **Step 1: Confirm parser behavior for detail line**

Run:
```
Read file="tools/dashboard/src/frontmatter-io.ts" offset=155 limit=10
```
Expected: the parser reads the next line after a checklist item as `detail` iff that line starts with exactly 2 spaces. Blank detail is OK (empty string default).

- [ ] **Step 2: Update build-explore Stage Report example with detail lines**

Find the block edited in Task 1 Step 3 (now using `- [x]` format) and expand it to include detail lines:

```markdown
## Stage Report: explore

- [x] Files mapped: 14 across domain, contract, view, frontend
  domain: 3 files (aggregate + command handler), contract: 2, view: 6, frontend: 3
- [x] Assumptions formed: 6 (Confident: 4, Likely: 1, Unclear: 1)
  A-1 through A-4 Confident via line-number evidence; A-5 Likely; A-6 Unclear (see Q-3)
- [x] Options surfaced: 2
  O-1 real-time update mechanism; O-2 entity storage format
- [x] Questions generated: 3
  Q-1 decomposition output shape; Q-2 naming convention; Q-3 frontend state strategy
- [x] α markers resolved: 2 / 3
  α-1 (protocol), α-2 (storage) resolved via codebase; α-3 (state) escalated to Q-3
- [x] Scale assessment: revised from Small to Medium
  initial Small was Brainstorming Spec estimate; 14-file breadth + 3 open questions push to Medium
```

- [ ] **Step 3: Document the detail line rule for explore**

Add a new paragraph after the example code block (before the `---` separator):

```markdown
**Detail lines (optional, Tier 1 rendering):** Each checklist item MAY have a single detail line directly below it, indented with exactly 2 spaces. The dashboard parser reads this as the `detail` field of the Stage Report item and renders it under the metric in the UI card. The detail line must be a single line -- multi-line detail is Tier 2 work deferred to Phase F. Keep detail concise: the "what" of each metric (file names, entity IDs, counts) so a reviewer understands the metric without opening the entity body.
```

- [ ] **Step 4: Update build-clarify Stage Report example with detail lines**

Find the block edited in Task 1 Step 4 and expand:

```markdown
## Stage Report: clarify

- [x] Decomposition: {accepted|modified|rejected|not-applicable}
  e.g., "not-applicable -- entity is Small scope, no children proposed"
- [x] Assumptions confirmed: {n} / {total} ({n corrected})
  e.g., "A-1, A-2, A-4 confirmed via batch; A-3 corrected captain cited src/foo.ts"
- [x] Options selected: {n} / {total}
  e.g., "O-1 Filter UI placement -> Second chip row per workflow card (recommended)"
- [x] Questions answered: {n} / {total}
  e.g., "Q-1 persisted via client-side filterState; Q-2 always-visible spec interpretation"
- [x] Canonical refs added: {n}
  e.g., "entity 009 app.js:244-246; ADR-001 single-server architecture"
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: {loose|tight}
  loose: captain must say "execute {slug}"; tight: auto_advance: true in frontmatter
- [x] Clarify duration: {n} questions asked, session complete
  e.g., "4 AskUserQuestion calls (1 batch + 1 option + 2 Qs)"
```

- [ ] **Step 5: Document the detail line rule for clarify**

Add after the rules block in `## Section: Stage Report: clarify`:

```markdown
**Detail lines (optional, Tier 1 rendering):** Each checklist item MAY have a single detail line directly below it, indented with exactly 2 spaces. The dashboard parser reads this as the `detail` field of the Stage Report item and renders it under the metric in the UI card. The detail line must be a single line -- multi-line detail is Tier 2 work deferred to Phase F. For clarify, detail should capture the decision: which option was selected, which assumptions were corrected, which refs were cited. This turns the Stage Report into a one-glance decision audit trail.
```

- [ ] **Step 6: Verify parser compatibility with a minimal fixture**

Write a test markdown string and manually check format:
```bash
cat <<'EOF' > /tmp/phase-d-stage-report-check.md
## Stage Report: test

- [x] First metric: count 5
  details about the first metric
- [x] Second metric: value foo
EOF
# Confirm second metric has no detail line (empty detail) and first does
grep -E '^(- \[x\]|  [A-Za-z])' /tmp/phase-d-stage-report-check.md
```
Expected: 3 lines matching (2 checklist items + 1 detail).

- [ ] **Step 7: Commit**

```bash
git add skills/build-explore/references/output-format.md skills/build-clarify/references/output-format.md
git commit -m "fix(phase-d): stage report tier 1 detail lines (D.3)

Parser at frontmatter-io.ts:157-158 already reads 2-space indented detail
lines as StageReportItem.detail -- skill spec never populated it. Adding
detail format turns Stage Report into a one-glance decision audit trail.
Multi-line detail (Tier 2) deferred to Phase F Next.js rewrite. Matches
entity 047 scope."
```

---

### Task 4: Science Officer agent expansion with Boot Sequence routing (D.4)

**Goal:** Expand `agents/science-officer.md` to load all three context-building skills (`spacedock:build-brainstorm` + `spacedock:build-explore` + `spacedock:build-clarify`) and add routing logic so the agent reads an entity's `context_status` frontmatter and runs the appropriate skill sequence to advance it to `ready`. This makes SO the owner of the full 討論 (Discuss) phase per the Phase E vision.

**Files:**
- Modify: `agents/science-officer.md` (frontmatter `skills` array + `## Boot Sequence` section)

**Reference (read-only):**
- `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md` §D.4 -- scope
- `skills/build-brainstorm/SKILL.md` -- what brainstorm expects as input
- `skills/build-explore/SKILL.md` -- what explore expects as input
- `skills/build-clarify/SKILL.md` -- what clarify expects as input

- [ ] **Step 1: Read current science-officer frontmatter and Boot Sequence**

Run:
```
Read file="agents/science-officer.md" offset=1 limit=22
```
Confirm: `skills: ["spacedock:build-clarify"]` and the existing Boot Sequence only loads build-clarify.

- [ ] **Step 2: Update the frontmatter skills array**

Edit `agents/science-officer.md`. Find:

```yaml
skills: ["spacedock:build-clarify"]
```

Replace with:

```yaml
skills: ["spacedock:build-brainstorm", "spacedock:build-explore", "spacedock:build-clarify"]
```

- [ ] **Step 3: Rewrite the Boot Sequence with context_status routing**

Find:

```markdown
## Boot Sequence

If your operating contract was not already loaded via skill preloading, invoke the `spacedock:build-clarify` skill now to load it.

Then identify the entity to clarify:

1. **From captain's message**: extract slug or ID (e.g., "/science 046", "clarify dashboard-context-status-filter", "run clarify on the filter entity").
2. **If no slug given**: list entities currently in `context_status: awaiting-clarify` and ask the captain which to clarify.

Once the entity is identified, follow the build-clarify skill's 7-step flow end-to-end.
```

Replace with:

```markdown
## Boot Sequence

You own the full 討論 (Discuss) phase: `brainstorm → explore → clarify`. Your three skills are preloaded via frontmatter: `spacedock:build-brainstorm`, `spacedock:build-explore`, `spacedock:build-clarify`.

### Step 1: Identify the entity

1. **From captain's message**: extract slug or ID (e.g., "/science 046", "science 047", "clarify the filter entity").
2. **If no slug given**: list entities with `context_status` ∈ {`none`, `pending`, `awaiting-clarify`} and ask the captain which to advance.

### Step 2: Read entity frontmatter and route by context_status

Read the entity file and parse the frontmatter fields `status` and `context_status`. Use the following routing table to determine which skill to run first:

| status | context_status | Next skill | Notes |
|---|---|---|---|
| `draft` | missing or `none` | `build-brainstorm` | Entity has Directive + Captain Context Snapshot only; needs APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE. |
| `draft` | `pending` | `build-explore` | Brainstorming Spec exists; needs Assumptions / Options / Open Questions. |
| `draft` or `clarify` | `awaiting-clarify` | `build-clarify` | Explore output populated; needs captain resolution. |
| any | `ready` | stop | Entity is already context-complete; hand off to First Officer. |

After each skill completes, re-read the entity frontmatter and apply the routing table again. Continue until `context_status: ready` OR the captain pauses the session.

### Step 3: Per-skill execution rules

**When running `build-brainstorm`**: follow the skill's standard flow. On completion, the entity body should have an `APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE` brainstorming spec and frontmatter `context_status: pending`.

**When running `build-explore`**: follow the skill's standard flow. On completion, the entity body should have `## Assumptions`, `## Option Comparisons`, `## Open Questions`, and `## Stage Report: explore` (checklist format per Phase D D.1.1). Frontmatter should reflect `context_status: awaiting-clarify`.

**When running `build-clarify`**: follow the skill's 7-step flow. Captain interacts via AskUserQuestion (loaded via ToolSearch). On completion, entity body has annotations on every assumption/option/question plus `## Stage Report: clarify`. Frontmatter should reflect `context_status: ready`.

### Step 4: Handoff

After routing lands on `context_status: ready`:

- **Loose mode (default)**: present the summary, wait for captain to say "execute {slug}". You do not touch the `status` field -- First Officer owns that transition.
- **Tight mode** (`auto_advance: true` in frontmatter): the clarify skill's Step 6 already updated `status: plan`. Report the transition to the captain and exit.

### Chicken-and-egg note

If you are running in SO-direct mode (no ensign wrapper), you may need to write directly to the entity file via `Write`/`Edit` tools. The underlying skills support this mode as of Phase D D.1.3 -- see each skill's SKILL.md Tools Available section.
```

- [ ] **Step 4: Update the description field in frontmatter to reflect the expanded scope**

Find:

```yaml
description: Use when the captain wants interactive clarification of a build pipeline entity's gray areas -- resolving assumptions, selecting options from explore comparisons, answering open questions, and accumulating canonical references. Invoke when captain says "/science {slug}", "clarify {slug}", "run clarify on {slug}", or when an entity is observed in awaiting-clarify state during conversation. The Science Officer presents findings, runs the interactive AskUserQuestion loop, gates on context sufficiency, and hands off to First Officer via hybrid mode (loose default, tight via auto_advance flag).
```

Replace with:

```yaml
description: Use when the captain wants to advance a build pipeline entity through the full Discuss phase (brainstorm, explore, clarify) to context_status ready. The Science Officer routes by reading the entity's current context_status and runs the appropriate skill sequence: brainstorm for fresh entities, explore for brainstormed entities, clarify for explored entities. Invoke when captain says "/science {slug}", "science {slug}", "advance {slug}", or when an entity is observed with non-ready context_status during conversation. Hands off to First Officer via hybrid mode (loose default, tight via auto_advance flag) once context is ready.
```

- [ ] **Step 5: Verify the edits are syntactically valid markdown + frontmatter**

Run:
```bash
head -8 agents/science-officer.md
```
Expected: valid YAML frontmatter with three skills in the array.

Run:
```
Grep pattern="^## " path="agents/science-officer.md" output_mode="content" -n=true
```
Expected: section headers include `## Boot Sequence`, `## Persona`, `## Three Invocation Modes`, `## Handoff Protocol`, `## Boundaries`, `## Examples` (existing) and the new structure under Boot Sequence (Step 1/2/3/4 subsections, not top-level headers).

- [ ] **Step 6: Commit**

```bash
git add agents/science-officer.md
git commit -m "feat(phase-d): science officer owns full discuss phase via context_status routing (D.4)

Frontmatter loads all three context-building skills (brainstorm, explore,
clarify). Boot Sequence reads entity context_status and routes to the right
skill. Entity advances through pending -> awaiting-clarify -> ready without
captain needing to invoke each skill individually. Foundation for Phase E
Discuss phase ownership."
```

---

### Task 5: SKILL.md SO-direct compatibility fixes (D.1.2, D.1.3, D.1.4)

**Goal:** Fix the three remaining Phase C smoke test contract gaps that are inside the SKILL.md files themselves: (a) build-explore Write/Edit prohibition blocks SO-direct path, (b) build-clarify Step 5 loose-mode "Then stop" ambiguity vs Step 6 commit, (c) build-clarify assumes `status: clarify` on entry.

**Files:**
- Modify: `skills/build-explore/SKILL.md` (Tools Available section around lines 21-23)
- Modify: `skills/build-clarify/SKILL.md` (Step 0 pre-check + Step 5 Hybrid handoff + Step 6 commit)

**Reference (read-only):**
- `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md` §D.1 items 2, 3, 4

- [ ] **Step 1: Remove Write/Edit prohibition from build-explore SKILL.md**

Read lines 15-30 of `skills/build-explore/SKILL.md` to locate the `**NOT available:**` block.

Find:

```markdown
**NOT available:**
- `AskUserQuestion` -- this skill is non-interactive. Write findings to the entity body; build-clarify handles captain interaction.
- `Write` / `Edit` on the entity file -- the ensign wrapper applies updates. Return text output for the sections this skill owns.
```

Replace with:

```markdown
**NOT available:**
- `AskUserQuestion` -- this skill is non-interactive. Write findings to the entity body; build-clarify handles captain interaction.

**Mode-dependent Write/Edit:**
This skill can run in two modes:

1. **Ensign-wrapper mode** (FO-dispatched): the ensign wrapper handles entity file writes. The skill returns text output for the sections it owns; the ensign applies them via its own Write/Edit calls. Prefer this mode when available.
2. **SO-direct mode** (Science Officer invocation, no ensign): the skill writes directly to the entity file via `Write` and `Edit`. No wrapper translates between text output and file updates. Used when Science Officer runs explore as part of its context_status routing (see `agents/science-officer.md`).

In both modes, the output format rules in `references/output-format.md` apply identically. In SO-direct mode you may additionally update frontmatter (`context_status: awaiting-clarify`) as part of the skill's final write.
```

- [ ] **Step 2: Add Step 0 status-prep to build-clarify SKILL.md**

Read `skills/build-clarify/SKILL.md` Step 0 (around lines 50-100) to locate the entry point.

Find the section heading `## Step 0: Decomposition Gate` and insert a new pre-step subsection ABOVE it:

```markdown
## Pre-Step: Status Handoff Check

This skill expects the entity to have `status: clarify` when it starts. Normally the ensign wrapper sets this before invocation. If you are running in SO-direct mode (Science Officer's context_status routing), the entity may arrive with `status: draft`. Before Step 0:

1. Read the entity frontmatter field `status`.
2. If `status` is `clarify` → proceed to Step 0 normally.
3. If `status` is `draft` → update frontmatter to `status: clarify` as your first action (Write/Edit on the entity frontmatter). The transition from draft to clarify is a skill-owned action in SO-direct mode.
4. If `status` is anything else (e.g., `plan`, `execute`) → STOP. Report to captain: "Entity `{slug}` is in `status: {value}`, which is past the clarify stage. Refusing to clarify an already-advanced entity."

The status field and the `context_status` field serve different purposes: `status` tracks pipeline stage (draft / clarify / plan / execute / ...), `context_status` tracks clarify-phase progress (none / pending / awaiting-clarify / ready). Both must be correct for this skill to run safely.

---
```

- [ ] **Step 3: Fix Step 5 loose-mode "Then stop" ambiguity in build-clarify SKILL.md**

Find in `skills/build-clarify/SKILL.md` Step 5 (around lines 207-256):

```markdown
3. **Hybrid handoff check**: read the entity frontmatter `auto_advance` field.
   - If `auto_advance: true` → proceed to Step 6 immediately
   - Otherwise → present:

         Say "execute {slug}" when you're ready, or "hold {slug}" to park.

     Then stop. The status transition happens in a separate invocation (FO or another
     `/science {slug}` call) when the captain says "execute".
```

Replace with:

```markdown
3. **Hybrid handoff check**: read the entity frontmatter `auto_advance` field.
   - If `auto_advance: true` (tight mode) → proceed to Step 6 AND update `status: plan` in Step 6.
   - If `auto_advance` is absent or `false` (loose mode, default) → proceed to Step 6 AND commit the Stage Report + session changes, BUT do NOT update `status: plan`. The `status` field stays at `clarify` until the captain explicitly says "execute {slug}" (at which point First Officer owns the status transition in a separate flow).

   After Step 6 commits in loose mode, present:

         Say "execute {slug}" when you're ready, or "hold {slug}" to park.

   Then end the session. "End the session" here means "stop advancing the pipeline" -- Step 6 (write Stage Report + git commit) has already run. Do NOT interpret "stop" as "skip Step 6" -- that would leave the session's work uncommitted and is the Phase C smoke test bug this fix addresses.
```

- [ ] **Step 4: Make Step 6 commit unconditional (clarify the existing "always runs" behavior)**

Find in `skills/build-clarify/SKILL.md` Step 6 intro (around lines 258-265):

```markdown
## Step 6: Commit

Read `references/output-format.md` (Stage Report section) to format the Stage Report
correctly.

1. Write `## Stage Report: clarify` to the entity body as the LAST `## Stage Report:` section
   (after `## Stage Report: explore`):
```

Replace with:

```markdown
## Step 6: Commit

**Step 6 ALWAYS runs after Step 5 passes the sufficiency gate, regardless of handoff mode.** The distinction between loose and tight mode affects ONLY whether `status: plan` gets written to frontmatter. Writing the Stage Report and committing the session's entity body changes is not optional -- that's how the work is persisted to git.

Read `references/output-format.md` (Stage Report section) to format the Stage Report
correctly.

1. Write `## Stage Report: clarify` to the entity body as the LAST `## Stage Report:` section
   (after `## Stage Report: explore`):
```

- [ ] **Step 5: Verify all three fixes landed**

Run:
```bash
grep -A1 'NOT available' skills/build-explore/SKILL.md | head -20
```
Expected: `AskUserQuestion` is still prohibited; `Write / Edit` line is NOT in the NOT available block.

Run:
```bash
grep -n 'Pre-Step: Status Handoff Check' skills/build-clarify/SKILL.md
```
Expected: one match, before Step 0.

Run:
```bash
grep -n 'Step 6 ALWAYS runs' skills/build-clarify/SKILL.md
```
Expected: one match, inside Step 6.

Run:
```bash
grep -n 'Then stop' skills/build-clarify/SKILL.md
```
Expected: zero matches in the Step 5 Hybrid handoff area (the ambiguous wording should be gone).

- [ ] **Step 6: Commit**

```bash
git add skills/build-explore/SKILL.md skills/build-clarify/SKILL.md
git commit -m "fix(phase-d): skill so-direct compatibility (D.1.2, D.1.3, D.1.4)

build-explore: allow Write/Edit in SO-direct mode (ensign wrapper optional,
not required). build-clarify: add Pre-Step status handoff check for SO-direct
entries with status:draft; clarify Step 5 loose-mode semantics (Step 6 commit
ALWAYS runs, only the status:plan update is tight-only). Closes the three
Phase C smoke test gaps that weren't about reference doc format drift."
```

---

### Task 6: Dogfood validation -- Science Officer end-to-end on entity 047 (VALIDATION)

**Goal:** Prove that Tasks 1-5 landed cleanly by having the Captain run expanded Science Officer on entity 047 (`entity-body-rendering-hotfixes`) end-to-end. Entity 047 starts at `status: draft` / `context_status: pending` with a brainstorming spec already written. SO should route it through `build-explore → build-clarify` without any workarounds, with entity 047 as the dogfood AND simultaneously the D.2/D.3 rendering hotfixes themselves.

**This task is Captain-driven.** Do not attempt to simulate Captain responses. This is a Class 3 interactive skill flow that requires live Captain input.

**Files:**
- Execute against: `docs/build-pipeline/entity-body-rendering-hotfixes.md` (047)
- Observe in: Dashboard UI at `http://localhost:8420/entities/047-entity-body-rendering-hotfixes` (or equivalent)

- [ ] **Step 1: Verify all prior tasks committed cleanly**

```bash
git log --oneline -10
git status
```
Expected: Tasks 1-5 commits visible on main. Working tree clean. No uncommitted edits to skill files or the science-officer agent.

- [ ] **Step 2: Verify entity 047 is in correct starting state**

```bash
head -22 docs/build-pipeline/entity-body-rendering-hotfixes.md
```
Expected: frontmatter `status: draft`, `context_status: pending`, brainstorming spec populated (APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE sections present).

- [ ] **Step 3: Captain invokes Science Officer**

In a fresh Claude Code session (or a dashboard-equipped session), the Captain says:

```
/science 047
```

OR:

```
science-officer, advance entity-body-rendering-hotfixes to context_status ready
```

- [ ] **Step 4: Observe Science Officer boot routing**

Expected SO behavior:
- SO reads entity 047 frontmatter
- Detects `status: draft`, `context_status: pending`
- Routing table resolves: run `build-explore` next
- SO announces: "Captain, entity 047 has status draft, context_status pending -- invoking build-explore to populate Assumptions / Options / Open Questions."
- build-explore runs in SO-direct mode (Write/Edit now allowed)

If SO instead starts with build-brainstorm (expected path would skip it since spec exists) OR refuses Write/Edit, something in Task 4 or Task 5 broke -- STOP and loop back.

- [ ] **Step 5: Observe build-explore output matches Phase D format**

After build-explore completes, check entity 047 body:

```bash
grep -E '^(## Stage Report|^- \[x\])' docs/build-pipeline/entity-body-rendering-hotfixes.md
```
Expected: `## Stage Report: explore` exists and has `- [x]` checklist items (NOT flat bullets). Also verify Open Questions section has blank lines between Q-n subfields:

```bash
awk '/^## Open Questions/,/^## /' docs/build-pipeline/entity-body-rendering-hotfixes.md | head -40
```
Expected: each Q-n subfield (Domain, Why it matters, Suggested options) separated by blank lines from the others.

If either check fails, the task that owned that fix (Task 1 or Task 2) has a gap -- STOP and loop back.

- [ ] **Step 6: Observe context_status routing advances automatically**

SO should auto-detect `context_status: awaiting-clarify` after explore finishes and announce:
- "Captain, explore complete. Entity 047 now has 3 assumptions / 2 options / 2 open questions. context_status is awaiting-clarify. Invoking build-clarify now."

SO should then run build-clarify WITHOUT captain having to re-invoke `/science`. If SO stops after explore and waits for captain to re-trigger, routing broke -- STOP and loop back to Task 4.

- [ ] **Step 7: Captain interacts with build-clarify**

Captain answers AskUserQuestion prompts for each assumption / option / question. This is the only Captain-interactive part of the task and cannot be automated.

Expected:
- build-clarify's Pre-Step detects `status: draft` and updates to `status: clarify` before Step 0
- Assumption batch confirmation → each assumption gets `→ Confirmed:` or `→ Corrected by` annotation
- Option selection → each option gets `→ Selected:` annotation
- Open Question resolution → each Q gets `→ Answer:` annotation, separated by blank line from `Suggested options:`

- [ ] **Step 8: Observe Step 5 sufficiency gate + Step 6 commit runs in loose mode**

Expected:
- Step 5 gate passes (all annotations present)
- Step 5 presents summary, sets `context_status: ready`
- Since entity 047 has no `auto_advance: true`, this is loose mode
- Step 6 STILL runs: writes `## Stage Report: clarify` + git commit (NOT skipping -- this is the D.1.2 fix)
- Frontmatter `status` stays at `clarify` (NOT advanced to `plan` -- that's loose mode behavior)

Verify:
```bash
git log -1 --name-only
grep -E 'status:|context_status:' docs/build-pipeline/entity-body-rendering-hotfixes.md | head -5
```
Expected: a clarify commit for entity 047 as the latest entry; frontmatter shows `status: clarify`, `context_status: ready`.

- [ ] **Step 9: Observe dashboard UI renders entity 047 correctly**

Load `http://localhost:8420/entities/047-entity-body-rendering-hotfixes` (or the dashboard equivalent). Verify visually:
- Stage Report card for explore is NOT empty -- shows the checklist items with detail lines
- Stage Report card for clarify is NOT empty -- shows the 8 metrics with detail lines
- Open Questions section renders each Q-n's Domain / Why / Suggested options / Answer on separate lines, not collapsed into a text wall

If any rendering issue remains, the corresponding Task (1, 2, or 3) has a gap. Loop back before proceeding.

- [ ] **Step 10: Document dogfood success in the entity body or journal**

If everything passes, append a brief "Dogfood notes" paragraph to entity 047's body (under the `## Stage Report: clarify` section) noting which Phase D fixes it exercised:

```markdown
## Dogfood Notes

This entity was the Phase D dogfood validation target. It exercised:

- D.1.1 Stage Report checklist format (explore + clarify Stage Report cards render non-empty)
- D.1.2 build-clarify Step 5 loose-mode Step 6 commit (loose mode committed without advancing status)
- D.1.3 build-explore SO-direct Write/Edit (no ensign wrapper, skill wrote directly)
- D.1.4 build-clarify status-draft entry handoff (Pre-Step transitioned draft -> clarify)
- D.2 Open Questions blank-line rendering (Q subfields render on distinct paragraphs)
- D.3 Stage Report detail lines (2-space indent per metric)
- D.4 Science Officer context_status routing (explore -> clarify without re-invocation)
```

Commit:
```bash
git add docs/build-pipeline/entity-body-rendering-hotfixes.md
git commit -m "docs(phase-d): entity 047 dogfood validation complete

Phase D Tasks 1-5 proven end-to-end via expanded Science Officer running
on entity 047. D.1.1, D.1.2, D.1.3, D.1.4, D.2, D.3, D.4 all exercised
without workarounds. Phase D validation gate passed."
```

- [ ] **Step 11: If any step failed, loop back, don't patch forward**

If any of Steps 4-9 surfaced a gap in a prior task's work, STOP Phase D progression. Fix the relevant task (Task 1, 2, 3, 4, or 5) properly, re-run from Task 6 Step 1. Do not apply one-off patches to entity 047 -- that hides the underlying skill contract bug from future entities.

---

### Task 7: /science slash command wrapper + batch mode (D.6)

**Goal:** Create a thin `/science` slash command that dispatches to the science-officer agent. Add `--batch` mode to iterate through all entities with non-ready `context_status`. This is pure UX polish on top of Task 4's routing work.

**Files:**
- Create: `commands/science.md`

**Reference (read-only):**
- `agents/science-officer.md` (as updated in Task 4)
- Existing slash command examples in the repo (search for `commands/*.md`)

- [ ] **Step 1: Survey existing slash command format**

```bash
ls commands/ 2>/dev/null || ls .claude-plugin/commands/ 2>/dev/null
```
Pick one existing slash command as a format template. If none exists in the expected locations, search more broadly:
```bash
find . -type d -name 'commands' -not -path '*/node_modules/*' -not -path '*/\.git/*' 2>/dev/null
```

- [ ] **Step 2: Write the /science command file**

Create `commands/science.md` (or the equivalent path for spacedock plugin commands discovered in Step 1):

```markdown
---
name: science
description: Dispatch to Science Officer agent. Advances a build pipeline entity through brainstorm/explore/clarify based on its context_status. Use for /science {slug} or /science --batch.
argument-hint: "[slug|--batch]"
---

# /science Command

Dispatches the `science-officer` agent (`agents/science-officer.md`) to advance a build pipeline entity through the full 討論 (Discuss) phase: brainstorm -> explore -> clarify.

## Usage

### Single entity

```
/science 047
/science entity-body-rendering-hotfixes
```

The Science Officer reads the entity frontmatter, routes by `context_status`, and runs the appropriate skill sequence until `context_status: ready`.

### Batch mode

```
/science --batch
```

Lists all entities with `context_status` ∈ {`none`, `pending`, `awaiting-clarify`} and prompts the captain which to advance first. Processes them sequentially -- never in parallel (AskUserQuestion cannot be batched across entities).

## Dispatch

Load `agents/science-officer.md` and pass the slug or `--batch` flag through. The agent's Boot Sequence handles entity identification and routing.

## Modes

- **Loose handoff** (default): entity ends at `context_status: ready`, `status: clarify`. Captain must say "execute {slug}" to transition to plan.
- **Tight handoff**: set `auto_advance: true` in entity frontmatter before invoking. Science Officer's clarify skill Step 6 will transition `status: clarify -> plan` as part of its commit.

## Delegation rules

- `/science` delegates ALL work to the science-officer agent. This command file is a thin wrapper -- it does not duplicate the agent's routing logic.
- If the science-officer agent is not available, report the missing agent and STOP. Do NOT fall back to invoking individual skills directly.
```

- [ ] **Step 3: Verify the command file is recognized**

Run:
```bash
ls commands/science.md 2>/dev/null && echo "OK" || echo "MISSING"
```
Expected: `OK`.

Depending on how spacedock discovers commands (plugin.json, .claude-plugin manifest, etc.), the command may need registration. Check:

```bash
grep -rn 'science' .claude-plugin/ 2>/dev/null | head -10
```
If commands are auto-discovered from the directory, no registration needed. If manifest-based, add `science` to the commands list.

- [ ] **Step 4: Commit**

```bash
git add commands/science.md .claude-plugin/ 2>/dev/null || git add commands/science.md
git commit -m "feat(phase-d): /science slash command wrapping science-officer agent (D.6)

Thin wrapper dispatching to agents/science-officer.md. Supports single entity
(/science 047) and batch mode (/science --batch for all non-ready entities).
All routing logic lives in the agent; this command file is purely delegation."
```

---

### Task 8: Forge fixtures for build-clarify solo regression (D.7)

**Goal:** Create pre-recorded Captain response fixtures so build-clarify can be regression-tested without a live Captain. This addresses the Class 3 interactive smoke-test gap from MEMORY.md "Skill Interaction Classes for Smoke Testing (2026-04-10)".

**Files:**
- Create: `skills/build-clarify/fixtures/README.md`
- Create: `skills/build-clarify/fixtures/minimal-entity.md`
- Create: `skills/build-clarify/fixtures/captain-responses.yaml`

**Reference (read-only):**
- `skills/build-clarify/SKILL.md` (Step 2/3/4 AskUserQuestion call sites)
- Any existing forge infrastructure (search below)

- [ ] **Step 1: Discover existing forge infrastructure**

```bash
find . -type d -name 'forge' -not -path '*/node_modules/*' -not -path '*/\.git/*' 2>/dev/null
find . -type f -name '*fixture*' -not -path '*/node_modules/*' -not -path '*/\.git/*' 2>/dev/null | head -20
grep -rn 'forge' .claude-plugin/ 2>/dev/null | head -10
```

If forge is in a separate plugin (e.g. `kc-plugin-forge`) and not yet integrated into spacedock, the fixtures still belong under `skills/build-clarify/fixtures/` -- forge will pick them up from that convention when integrated.

- [ ] **Step 2: Create fixtures directory and README**

```bash
mkdir -p skills/build-clarify/fixtures
```

Write `skills/build-clarify/fixtures/README.md`:

```markdown
# build-clarify Forge Fixtures

Pre-recorded Captain responses for solo regression testing of the build-clarify skill. These
fixtures address the Class 3 interactive skill limitation documented in MEMORY.md -- build-clarify
requires live captain input via AskUserQuestion, making it impossible to smoke-test without a
human in the loop.

Forge loads these fixtures in place of the live AskUserQuestion harness, feeds them to the skill
in order, and asserts the final entity state matches expectations.

## Fixture format

- `minimal-entity.md` -- a small fixture entity with 1 assumption, 1 option, and 1 open question.
  Pre-populated via build-explore output format (checklist Stage Report, blank-line Open Questions).
- `captain-responses.yaml` -- ordered list of Captain responses, keyed by step number.

## How forge uses them

1. Forge copies `minimal-entity.md` to a temporary location under a test slug.
2. Forge invokes build-clarify against the temp entity.
3. Each AskUserQuestion call is intercepted and satisfied by the next entry in
   `captain-responses.yaml`.
4. After build-clarify returns, forge compares the entity body against the expected post-clarify
   snapshot (stored here as `expected-post-clarify.md`).

## Updating fixtures

When build-clarify's AskUserQuestion sequence changes (new question type, reordered flow), update
both `captain-responses.yaml` and `expected-post-clarify.md` in the same commit. Fixtures are
contract tests -- drift between fixture and skill is a regression signal.
```

- [ ] **Step 3: Create the minimal entity fixture**

Write `skills/build-clarify/fixtures/minimal-entity.md`:

```markdown
---
id: fixture-001
title: Forge Fixture -- Minimal Clarify Regression
status: draft
context_status: awaiting-clarify
source: forge-fixture
created: 2026-04-10T00:00:00+08:00
started:
completed:
intent: test
scale: Small
project: spacedock
---

## Directive

> Test fixture for build-clarify regression. Exercises: 1 assumption confirm, 1 option select, 1 question answer.

## Brainstorming Spec

**APPROACH**: Use a single configuration file at the root to control fixture behavior.

**ALTERNATIVE**: Environment variables. Rejected because they mix test state across runs.

**GUARDRAILS**:
- Must not write outside the fixture directory
- Must not hit the network

**RATIONALE**: Single file keeps the fixture self-contained.

## Acceptance Criteria

- Fixture entity survives clarify round-trip without manual intervention
- All three gray areas get annotations

## Assumptions

A-1: Fixture uses JSON format for the configuration file.
Confidence: Likely
Evidence: scripts/forge.sh:42 -- existing forge scripts use JSON

## Option Comparisons

### Configuration file location

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Repo root | Simple path, no search | Clutters root | Low | Recommended |
| `.forge/` subdirectory | Organized | Extra search step | Low | Viable |

## Open Questions

Q-1: Should the fixture support custom assertion hooks?

Domain: Runnable/Invokable

Why it matters: Custom hooks let downstream test writers add project-specific checks.

Suggested options: (a) Yes via hook file, (b) No keep minimal, (c) Phase 2 feature

## Canonical References

## Stage Report: explore

- [x] Files mapped: 0 (fixture is self-contained)
  no real code paths -- this is a forge contract fixture
- [x] Assumptions formed: 1
  A-1 Likely confidence
- [x] Options surfaced: 1
  O-1 configuration file location
- [x] Questions generated: 1
  Q-1 custom assertion hook support
- [x] α markers resolved: 0 / 0
  no α markers in fixture
- [x] Scale assessment: confirmed
  fixture is trivial Small scope by construction
```

- [ ] **Step 4: Create the Captain responses YAML**

Write `skills/build-clarify/fixtures/captain-responses.yaml`:

```yaml
# Pre-recorded captain responses for build-clarify fixture regression test.
# Forge intercepts AskUserQuestion calls and satisfies them with these responses
# in order. Each entry corresponds to one Step in the skill.

responses:
  # Step 0: Decomposition Gate -- fixture has no ## Decomposition Recommendation, so
  # this step is a no-op and no AskUserQuestion fires.

  # Step 2: Assumption Batch Confirmation (batch mode, 1 assumption)
  - step: 2
    type: assumption_batch
    response:
      A-1:
        action: confirm  # alternatives: correct, skip
        note: ""

  # Step 3: Option Selection (interactive, 1 option comparison)
  - step: 3
    type: option_select
    question: "Configuration file location"
    response:
      option_label: "Repo root"  # verbatim from Option column
      mode: interactive

  # Step 4: Open Question Resolution (interactive, 1 question)
  - step: 4
    type: question_answer
    question: "Q-1"
    response:
      answer: "Yes via hook file"  # picks option (a)
      mode: interactive

  # Step 5: Context Sufficiency Gate -- no AskUserQuestion fires.
  # Step 6: Commit -- no AskUserQuestion fires.

expected_final_state:
  status: "clarify"        # loose mode, no auto_advance
  context_status: "ready"
  annotations:
    - "A-1" must have "→ Confirmed:"
    - "### Configuration file location" must have "→ Selected: Repo root"
    - "Q-1" must have "→ Answer: Yes via hook file"
  stage_reports:
    - name: "clarify"
      checklist_items: 8  # all 8 metric lines present
```

- [ ] **Step 5: Verify files created and structurally valid**

```bash
ls skills/build-clarify/fixtures/
head -5 skills/build-clarify/fixtures/README.md
head -5 skills/build-clarify/fixtures/minimal-entity.md
head -5 skills/build-clarify/fixtures/captain-responses.yaml
```
Expected: all three files present; each has expected header content.

Attempt basic YAML validation:
```bash
python3 -c "import yaml; yaml.safe_load(open('skills/build-clarify/fixtures/captain-responses.yaml'))" 2>&1
```
Expected: no output (success). If error, fix the YAML syntax.

- [ ] **Step 6: Commit**

```bash
git add skills/build-clarify/fixtures/
git commit -m "feat(phase-d): forge fixtures for build-clarify solo regression (D.7)

Class 3 interactive skill cannot smoke-test without live captain. Fixtures
provide pre-recorded captain responses + a minimal entity so forge can run
build-clarify in a sealed loop and assert final entity state. Unblocks CI
regression coverage for the full 7-step flow."
```

---

### Task 9: Plugin split coordination with entity 040 (D.5)

**Goal:** Resolve the plugin-naming open question from the Phase D spec and entity 040 parallel track. Confirm or revise the `spacedock:build-* -> spacebridge:build-*` migration target. Decide 2-plugin (engine + dashboard UI) vs 3-plugin (engine + UI + build studio) split. Annotate entity 040 with the Phase D decision so the plugin-split work has a clear input.

**This is a decision task -- it produces a written resolution, not skill edits.** The decision itself requires Captain input via AskUserQuestion.

**Files:**
- Read-only: `docs/build-pipeline/spacedock-plugin-architecture-v2.md` (entity 040)
- Modify: `docs/build-pipeline/spacedock-plugin-architecture-v2.md` (append a Phase D decision annotation OR add to Canonical References)
- Reference: `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md` §D.5

- [ ] **Step 1: Read entity 040 current state**

```bash
head -50 docs/build-pipeline/spacedock-plugin-architecture-v2.md
```
Note: the entity is XLarge and pre-existing from before Phase C. Its Brainstorming Spec or Acceptance Criteria may already take a position on 2-plugin vs 3-plugin split. Read enough to know what (if anything) it already commits to.

- [ ] **Step 2: Captain decision via AskUserQuestion**

Load the deferred tool if needed:
```
ToolSearch query="select:AskUserQuestion" max_results=1
```

Ask the Captain:

```
AskUserQuestion({
  header: "PluginSplit",
  question: "Phase D.5 needs the plugin-split shape locked so entity 040 work and Phase D Task 4 (SO agent loadout) don't drift. Two options:",
  options: [
    {
      label: "2-plugin (engine + spacedock-dashboard UI)",
      description: "Keep build-* skills in spacedock core. Only dashboard splits into spacedock-dashboard plugin. Namespace stays spacedock:build-*. Smallest split, fewest renames."
    },
    {
      label: "3-plugin (engine + dashboard UI + spacebridge build studio)",
      description: "build-* skills migrate to new spacebridge plugin. Namespace flips spacedock:build-* -> spacebridge:build-*. Supports long-term distribution story (recce, carlvoe deployment). More rename churn now."
    }
  ]
})
```

Wait for Captain's answer. This is the only interactive step in Task 9.

- [ ] **Step 3: Record the decision in entity 040's body**

Append to `docs/build-pipeline/spacedock-plugin-architecture-v2.md` under a new or existing Canonical References / decision section:

For 2-plugin path:
```markdown
## Phase D Decision Anchor (2026-04-10)

Plugin split locked as **2-plugin** by Captain via Phase D Task 9:
- spacedock (engine + build-* skills) stays at `spacedock:` namespace
- spacedock-dashboard (UI layer) splits out as separate plugin per existing entity 040 WP1 scope
- No namespace migration -- `spacedock:build-brainstorm`, `spacedock:build-explore`, `spacedock:build-clarify` stay as-is
- Phase D Task 4 (Science Officer skills loadout) uses `spacedock:build-*` prefix directly -- no follow-up rename task needed

Forward implications:
- Long-term distribution story (recce, carlvoe) will use the same `spacedock:` prefix or a later rename-in-place migration; Phase D does not block on that.
- Phase E role definitions remain project-agnostic via skill contract, not plugin name.

Commit reference: (this Phase D commit)
```

For 3-plugin path:
```markdown
## Phase D Decision Anchor (2026-04-10)

Plugin split locked as **3-plugin** by Captain via Phase D Task 9:
- spacedock (engine, no build-* skills) -- narrower scope
- spacedock-dashboard (UI layer) -- per entity 040 WP1
- spacebridge (build studio: build-brainstorm + build-explore + build-clarify + science-officer agent)
- Namespace migration `spacedock:build-* -> spacebridge:build-*` confirmed -- follow-up rename task needed in entity 040 or a new decomposition entity

Forward implications:
- Phase D Task 4 (Science Officer skills loadout) needs a follow-up edit after entity 040 WP1 ships to flip the skill names from `spacedock:build-*` to `spacebridge:build-*`. Until then, SO loads `spacedock:build-*` (current state).
- Long-term distribution story (recce, carlvoe) uses `spacebridge` as the build flow plugin.
- Phase E role definitions bind to `spacebridge` skills.

Follow-up task: create rename entity or extend entity 040 scope to include namespace flip.
Commit reference: (this Phase D commit)
```

Pick the block matching the Captain's answer and append it verbatim.

- [ ] **Step 4: Update Phase D roadmap spec with the resolution**

Edit `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md`. In the `## Open Questions` section at the bottom, find:

```markdown
1. **Plugin naming**: confirm or revise `spacedock:build-* -> spacebridge:build-*` migration noted in Phase C handoff. Does the split produce 2 plugins (engine + UI) or 3 (engine + UI + build studio)?
```

Replace with the resolved answer (2-plugin or 3-plugin, matching Step 2):

For 2-plugin:
```markdown
1. **Plugin naming** (RESOLVED 2026-04-10 via Phase D Task 9): **2-plugin split**. Engine stays `spacedock:`, dashboard splits to `spacedock-dashboard:`. No `spacebridge:` namespace in Phase D; `spacedock:build-*` remains the canonical prefix. See entity 040 §Phase D Decision Anchor for implications.
```

For 3-plugin:
```markdown
1. **Plugin naming** (RESOLVED 2026-04-10 via Phase D Task 9): **3-plugin split**. Engine is `spacedock:`, dashboard is `spacedock-dashboard:`, build studio is `spacebridge:`. Namespace migration `spacedock:build-* -> spacebridge:build-*` confirmed; follow-up rename task queued. See entity 040 §Phase D Decision Anchor for implications.
```

- [ ] **Step 5: If 3-plugin chosen, queue the follow-up rename task**

Only for 3-plugin path: create a note in this Phase D plan (this file) or a new GSD todo so the rename doesn't get lost. Add at the bottom of this plan:

```markdown
---

## Phase D Follow-ups (post-D.5)

- **Namespace rename** (blocked on entity 040 WP1 ship): flip `spacedock:build-brainstorm`, `spacedock:build-explore`, `spacedock:build-clarify` references to `spacebridge:build-*` across: agents/science-officer.md, commands/science.md, docs/build-pipeline/README.md, any existing entity body references. Tracked via entity 040 or a new rename entity.
```

Skip this step for 2-plugin path.

- [ ] **Step 6: Commit**

```bash
git add docs/build-pipeline/spacedock-plugin-architecture-v2.md docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md docs/superpowers/plans/2026-04-10-phase-d-skill-contracts-and-so-expansion.md
git commit -m "decide(phase-d): plugin split resolution for D.5

Captain locked plugin split shape via Phase D Task 9. Decision anchored in
entity 040 body and Phase D/E/F roadmap Open Questions section. See entity
040 Phase D Decision Anchor for 2-plugin vs 3-plugin choice and forward
implications."
```

---

## Phase D Completion Criteria

Phase D is complete when ALL of the following hold:

- [x] Task 1 (D.1.1) -- Stage Report checklist format landed in both output-format.md files
- [x] Task 2 (D.2) -- Open Questions blank-line separation landed in build-explore output-format.md + build-clarify Answer rule updated
- [x] Task 3 (D.3) -- Stage Report Tier 1 detail lines documented in both output-format.md files
- [x] Task 4 (D.4) -- Science Officer agent loads all three context-building skills with context_status routing
- [x] Task 5 (D.1.2, D.1.3, D.1.4) -- build-explore Write/Edit unblocked, build-clarify Step 5/6 clarified, build-clarify Pre-Step status handoff added
- [x] Task 6 (VALIDATION) -- Entity 047 ran through expanded SO end-to-end with no workarounds; dashboard rendering verified; Dogfood Notes section appended (dogfood discovered SKILL.md format drift bug -- captain expanded 047 scope to fix inline per Q-1 answer; dashboard visual verification remains captain-owned)
- [x] Task 7 (D.6) -- `/science` slash command exists at `skills/science/SKILL.md` using persona injection pattern (not subagent dispatch) to preserve AskUserQuestion access
- [x] Task 8 (D.7) -- build-clarify forge fixtures exist at `skills/build-clarify/fixtures/` (README + minimal entity + captain responses YAML, all following Phase D format rules)
- [x] Task 10 (047 Q-1) -- SKILL.md Stage Report format drift fixed at `skills/build-explore/SKILL.md:161` and `skills/build-clarify/SKILL.md:286`, matching reference docs character-for-character
- [x] Task 9 (D.5) -- Plugin split decision anchored in entity 040 + roadmap spec Open Questions resolved (design-doc 2-plugin: spacedock engine + spacebridge [UI + coord + build studio]; ratified by Captain via AskUserQuestion)

Final commit:
```bash
git commit --allow-empty -m "milestone(phase-d): skill contracts and SO expansion complete

All 9 Phase D tasks completed. Skill contracts cleaned (format drift,
rendering hotfixes, SO-direct compatibility). Science Officer owns the
full Discuss phase via context_status routing. Entity 047 dogfood
validated the stack end-to-end. Plugin split decision locked. Ready
for Phase E lifecycle restructure."
```

## Phase D Non-Goals (explicitly deferred)

- Phase E lifecycle restructure (Discuss/Execute/Verify role formalization)
- Phase F Next.js frontend rewrite
- Tier 2/3 Stage Report rendering (multi-line detail, clickable anchors)
- AC defect semantic check (Q answer vs AC contradiction detection)
- File watcher / WebSocket push on direct edits
- Entity 040 plugin split *execution* (Phase D only provides the naming decision input)
