# Phase E Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared infrastructure for Phase E — `workflow-index` skill + `knowledge-capture` two-mode skill + `workflow-index-maintainer` mod + additive update to `spacedock:first-officer` skill — so that subsequent Phase E plans (Plan 2-5) can depend on a stable, tested foundation.

**Architecture:** Two new shared skills plus one mod plus one additive FO skill step. No new stage skills, no pipeline README changes, no new agents. Zero impact on existing Phase D flow; Phase D pipelines continue to work unchanged. Python-based structural tests validate skill frontmatter + reference file existence; fixture-based integration tests validate behavior on fake entities.

**Tech Stack:** Markdown (skills), YAML (frontmatter + fixture files), Python (pytest-based tests, run via `uv run pytest` from repo root), kc-plugin-forge plugin for structural validation.

**Namespace Decision:** Phase E spec §Scope states new skills go in `spacebridge:*` namespace. However, spacebridge plugin doesn't exist yet (physically deferred to Phase F per entity 040). Plan 1 therefore uses `spacedock:*` namespace under the existing `skills/` directory, matching Phase D's pattern. Phase F will rename all build-related skills (existing `spacedock:build-*` + new Phase E `spacedock:workflow-index` + `spacedock:knowledge-capture`) to `spacebridge:*` as part of the plugin split. This decision trades forward compatibility for reduced risk during Plan 1 execution.

**Spec Reference:** `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` §Scope, §New Skills and Agents, §Knowledge Capture, §Workflow Index.

---

## File Structure

**Create (new files):**
- `skills/workflow-index/SKILL.md` — workflow-index skill definition, three-mode entry point
- `skills/workflow-index/references/contracts-format.md` — CONTRACTS.md file format spec
- `skills/workflow-index/references/decisions-format.md` — DECISIONS.md file format spec with supersede semantics
- `skills/workflow-index/references/read-mode.md` — read mode: query by file or entity, reverse lookup
- `skills/workflow-index/references/write-mode.md` — write mode: append entries, update entity stage transitions
- `skills/workflow-index/references/check-mode.md` — check mode: cross-entity coherence for plan-checker Dim 7
- `skills/knowledge-capture/SKILL.md` — knowledge-capture skill definition, two-mode entry point
- `skills/knowledge-capture/references/classifier.md` — finding classifier: root (CODE/DOC/NEW/PLAN) + severity (CRITICAL..NIT)
- `skills/knowledge-capture/references/gates.md` — severity gate + 3-question test
- `skills/knowledge-capture/references/capture-mode.md` — capture mode (ensign-side): D1 auto-append + D2 candidate staging
- `skills/knowledge-capture/references/apply-mode.md` — apply mode (FO-side): present pending captures, edit CLAUDE.md
- `skills/knowledge-capture/references/targets.md` — multi-level CLAUDE.md target selection rules
- `skills/knowledge-capture/fixtures/sample-finding.yaml` — sample raw finding for capture mode test
- `skills/knowledge-capture/fixtures/captain-responses.yaml` — pre-recorded captain responses for apply mode test
- `skills/knowledge-capture/fixtures/entity-with-pending.md` — fixture entity with `## Pending Knowledge Captures` section
- `mods/workflow-index-maintainer.md` — mod with startup + idle hooks maintaining INDEX/CONTRACTS/DECISIONS
- `tests/test_workflow_index.py` — pytest for workflow-index structural and behavior checks
- `tests/test_knowledge_capture.py` — pytest for knowledge-capture structural and behavior checks
- `tests/test_fo_pending_capture_step.py` — pytest verifying `references/first-officer-shared-core.md` has the new step 3.6 (pending capture detection)
- `tests/fixtures/workflow-index-fixture/README.md` — minimal workflow README for fixture
- `tests/fixtures/workflow-index-fixture/_index/CONTRACTS.md` — seed contracts fixture
- `tests/fixtures/workflow-index-fixture/_index/DECISIONS.md` — seed decisions fixture
- `tests/fixtures/workflow-index-fixture/_index/INDEX.md` — seed index fixture
- `tests/fixtures/workflow-index-fixture/entity-a.md` — fixture entity (shipped)
- `tests/fixtures/workflow-index-fixture/entity-b.md` — fixture entity (execute, in-flight)
- `tests/fixtures/workflow-index-maintainer-mod/README.md` — workflow README for mod fixture
- `tests/fixtures/workflow-index-maintainer-mod/_mods/workflow-index-maintainer.md` — mod under test (copy from mods/)
- `tests/fixtures/workflow-index-maintainer-mod/entity-1.md` — fixture entity
- `docs/build-pipeline/_index/CONTRACTS.md` — initial production CONTRACTS.md (empty shell)
- `docs/build-pipeline/_index/DECISIONS.md` — initial production DECISIONS.md (empty shell)
- `docs/build-pipeline/_index/INDEX.md` — initial production INDEX.md (empty shell)

**Modify (existing files):**
- `references/first-officer-shared-core.md` — insert new step 3.6 (pending capture detection) into "Completion and Gates" section, between existing steps 3.5 and 4. The `skills/first-officer/SKILL.md` file itself is a thin launcher (13 lines) that reads this reference; we don't need to modify the SKILL.md.

---

## File Responsibilities

| File | Responsibility |
|------|----------------|
| `skills/workflow-index/SKILL.md` | Entry point: routes to read/write/check mode reference files based on caller's mode argument. Has frontmatter with `name`, `description`, `allowed-tools`. |
| `skills/workflow-index/references/contracts-format.md` | Canonical CONTRACTS.md format spec — one section per file path, table of entities with stage/status/intent. |
| `skills/workflow-index/references/decisions-format.md` | Canonical DECISIONS.md format — each decision is a `## D-{entity}-{n}` block with Source/Scope/Rationale/Related entities/Status/Supersedes. |
| `skills/workflow-index/references/read-mode.md` | How to parse CONTRACTS.md and DECISIONS.md, filter by file path or entity slug, return structured results. |
| `skills/workflow-index/references/write-mode.md` | How to append new entries without corrupting existing structure; how to mark decisions superseded. |
| `skills/workflow-index/references/check-mode.md` | Cross-entity coherence check for plan-checker Dim 7: given a proposed plan's files_modified, find other entities touching same files, classify as in-flight (blocker) or recent (warning). |
| `skills/knowledge-capture/SKILL.md` | Entry point: dispatches to capture or apply mode. Frontmatter declares this is a two-mode shared utility skill. |
| `skills/knowledge-capture/references/classifier.md` | Rules for assigning severity (CRITICAL/HIGH/MEDIUM/LOW/NIT) and root (CODE/DOC/NEW/PLAN) to raw findings. |
| `skills/knowledge-capture/references/gates.md` | Severity gate pre-filter + three-question test (recurs? non-obvious? ruleable?). |
| `skills/knowledge-capture/references/capture-mode.md` | Ensign-side: classify findings, D1 auto-append to plugin reference, D2 candidate staging to entity body. No captain interaction. |
| `skills/knowledge-capture/references/apply-mode.md` | FO-side: parse `## Pending Knowledge Captures`, present each via AskUserQuestion, Edit target CLAUDE.md, commit. |
| `skills/knowledge-capture/references/targets.md` | Multi-level target selection: plugin / user-global / project / module / lessons / DECISIONS.md. |
| `mods/workflow-index-maintainer.md` | Startup + idle hook mod that scans entities for stage changes, invokes workflow-index write mode to update INDEX/CONTRACTS/DECISIONS. |
| `tests/test_workflow_index.py` | Pytest: SKILL.md structural checks, reference file presence, fixture-based behavior tests for each mode. |
| `tests/test_knowledge_capture.py` | Pytest: SKILL.md structural checks, classifier logic checks via fixture, capture-mode staging test, apply-mode replay test using captain-responses fixture. |
| `tests/test_fo_pending_capture_step.py` | Pytest: grep `references/first-officer-shared-core.md` for step 3.6 markers, verify invocation hook is present. |
| `references/first-officer-shared-core.md` | Existing FO operating contract. Plan 1 adds step 3.6 (pending capture detection) between existing steps 3.5 and 4 in the "Completion and Gates" section. All other steps unchanged. |

---

## Task List

The plan has 20 tasks. Each task is one logical unit with TDD steps (write test → run → implement → run → commit).

---

### Task 1: Create production `_index/` directory with empty CONTRACTS/DECISIONS/INDEX

**Files:**
- Create: `docs/build-pipeline/_index/CONTRACTS.md`
- Create: `docs/build-pipeline/_index/DECISIONS.md`
- Create: `docs/build-pipeline/_index/INDEX.md`

- [ ] **Step 1: Verify parent directory exists**

Run: `ls -d docs/build-pipeline/`
Expected: directory listed (it already exists, this is where workflow entities live)

- [ ] **Step 2: Create `_index/` directory and empty CONTRACTS.md**

```bash
mkdir -p docs/build-pipeline/_index
```

Write `docs/build-pipeline/_index/CONTRACTS.md` with:

```markdown
# Contracts Index

Auto-maintained by `mods/workflow-index-maintainer.md`. Do not edit manually except to pin architectural contracts.

Each section lists a file path with entities that have modified it, their stage, intent, and status.

## Active Contracts

<!-- No active contracts yet. First entry will be written when an entity advances past plan stage. -->

## Recently Retired (last 30 days)

<!-- Empty until entities ship and their contracts age out. -->
```

- [ ] **Step 3: Create empty DECISIONS.md**

Write `docs/build-pipeline/_index/DECISIONS.md` with:

```markdown
# Decisions Log

Auto-maintained by workflow skills. Append-only. Superseded decisions marked, never deleted.

Each decision is a `## D-{entity-slug}-{sequence}` block with Source, Scope, Rationale, Related entities, Status, and optional Supersedes reference.

---

<!-- First decision will be written when an entity's clarify stage captures a captain decision. -->
```

- [ ] **Step 4: Create empty INDEX.md**

Write `docs/build-pipeline/_index/INDEX.md` with:

```markdown
# Workflow Index

Machine-generated by `mods/workflow-index-maintainer.md` on idle hook. Do not edit manually.

## Entities by Status

<!-- Rebuilt automatically when entities advance stages. -->
```

- [ ] **Step 5: Commit initial `_index/` directory**

```bash
git add docs/build-pipeline/_index/CONTRACTS.md docs/build-pipeline/_index/DECISIONS.md docs/build-pipeline/_index/INDEX.md
git commit -m "feat(phase-e): initialize _index/ directory for workflow coherence tracking"
```

---

### Task 2: Write workflow-index skill frontmatter and entry point

**Files:**
- Create: `skills/workflow-index/SKILL.md`
- Test: `tests/test_workflow_index.py`

- [ ] **Step 1: Write the failing structural test first**

Create `tests/test_workflow_index.py`:

```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
# ABOUTME: Structural and behavior tests for skills/workflow-index/SKILL.md.
# ABOUTME: Validates frontmatter, reference files, and mode dispatch.

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = REPO_ROOT / "skills" / "workflow-index"
SKILL_FILE = SKILL_DIR / "SKILL.md"


def parse_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter from a markdown file."""
    content = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        raise ValueError(f"No frontmatter in {path}")
    return yaml.safe_load(match.group(1))


def test_skill_file_exists():
    assert SKILL_FILE.exists(), f"Expected {SKILL_FILE} to exist"


def test_skill_frontmatter_has_name():
    fm = parse_frontmatter(SKILL_FILE)
    assert fm.get("name") == "workflow-index", (
        f"Expected name='workflow-index', got {fm.get('name')!r}"
    )


def test_skill_frontmatter_has_description():
    fm = parse_frontmatter(SKILL_FILE)
    desc = fm.get("description", "")
    assert desc and len(desc) > 20, (
        "Expected description with at least 20 characters"
    )


def test_skill_content_mentions_all_three_modes():
    content = SKILL_FILE.read_text(encoding="utf-8")
    for mode in ["read", "write", "check"]:
        assert mode in content.lower(), f"Expected mode '{mode}' mentioned in SKILL.md"
```

- [ ] **Step 2: Run the test to verify it fails**

Run from repo root: `uv run pytest tests/test_workflow_index.py -v`
Expected: FAIL with `FileNotFoundError` or `Expected … to exist` for all tests (SKILL.md doesn't exist yet).

- [ ] **Step 3: Create the skill directory and write minimal SKILL.md**

```bash
mkdir -p skills/workflow-index/references
mkdir -p skills/workflow-index/fixtures
```

Write `skills/workflow-index/SKILL.md`:

```markdown
---
name: workflow-index
description: Read, write, and check the workflow-level index artifacts (CONTRACTS.md, DECISIONS.md, INDEX.md) that track cross-entity coherence. Three modes — read (query by file or entity), write (append entries after entity stage changes), check (plan-checker Dim 7 cross-entity coherence validation). Used by build-plan's plan-checker, stage ensigns that need to look up prior decisions, and the workflow-index-maintainer mod.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# workflow-index

Shared utility skill for maintaining and querying workflow-level coherence artifacts under `docs/build-pipeline/_index/`. Three modes determine behavior:

| Mode | Caller | Purpose |
|------|--------|---------|
| `read` | Any ensign, plan-checker, mods | Query CONTRACTS.md or DECISIONS.md by file path or entity slug. Returns structured matches. |
| `write` | Stage ensigns at transitions, workflow-index-maintainer mod | Append new entries to CONTRACTS.md / DECISIONS.md. Update INDEX.md. Preserves existing entries; never rewrites unrelated sections. |
| `check` | build-plan's plan-checker (Dimension 7 — Cross-Entity Coherence) | Given a proposed plan's `files_modified` list, find other entities touching the same files. Classify as in-flight (blocker) or recent (warning). Return structured issue list. |

## Mode Dispatch

The caller must specify `mode` in the invocation prompt. Based on mode, read the corresponding reference file for detailed instructions:

- `mode: read` → follow `references/read-mode.md`
- `mode: write` → follow `references/write-mode.md`
- `mode: check` → follow `references/check-mode.md`

Each reference file describes the expected inputs, processing steps, and output format for that mode.

## File Format References

The canonical file formats are documented in:

- `references/contracts-format.md` — CONTRACTS.md structure
- `references/decisions-format.md` — DECISIONS.md structure including supersede semantics

These formats are the contract between workflow-index (writer) and callers (readers). Changes require updating both this skill and all consumers (plan-checker, mods).

## Rules

- **Never rewrite unrelated sections** — Edit the minimal region required by the operation. Use Edit with specific `old_string` / `new_string` matches, not wholesale Write.
- **Decisions are append-only** — Never delete a decision entry. Use supersede mechanism (set Status to 🔴 superseded, reference new decision in Supersedes field).
- **Commits are separate** — Workflow-index writes get their own commit (`chore(index): update CONTRACTS for entity-046`), never bundled with code changes.
- **Idempotent reads** — `read` mode never mutates state. Safe to call repeatedly.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_workflow_index.py -v`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/SKILL.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index skill frontmatter and entry point"
```

---

### Task 3: Write workflow-index contracts-format reference

**Files:**
- Create: `skills/workflow-index/references/contracts-format.md`
- Test: `tests/test_workflow_index.py` (add test)

- [ ] **Step 1: Add failing test for the reference file**

Append to `tests/test_workflow_index.py`:

```python
def test_contracts_format_reference_exists():
    ref = SKILL_DIR / "references" / "contracts-format.md"
    assert ref.exists(), f"Expected {ref} to exist"


def test_contracts_format_defines_section_structure():
    ref = SKILL_DIR / "references" / "contracts-format.md"
    content = ref.read_text(encoding="utf-8")
    # Contract format must explain the per-file section structure
    assert "Active Contracts" in content
    assert "Entity" in content
    assert "Status" in content
```

- [ ] **Step 2: Run tests to see them fail**

Run: `uv run pytest tests/test_workflow_index.py::test_contracts_format_reference_exists tests/test_workflow_index.py::test_contracts_format_defines_section_structure -v`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write the contracts-format reference**

Write `skills/workflow-index/references/contracts-format.md`:

```markdown
# CONTRACTS.md Format Specification

CONTRACTS.md tracks which entities have modified which files, their current pipeline stage, and the intent of each change. This enables cross-entity coherence checking — detecting when a new plan proposes modifying a file that another in-flight entity is also modifying.

## File Location

`docs/build-pipeline/_index/CONTRACTS.md`

## Structure

```markdown
# Contracts Index

<preamble — see sample below>

## Active Contracts

### {file path relative to repo root}

| Entity | Stage | Intent | Status |
|--------|-------|--------|--------|
| 046    | shipped | Filter logic moved to client-side | 🟢 final |
| 052    | execute | WebSocket reconnection on idle    | 🟡 in-flight |

### {another file path}
...

## Recently Retired (last 30 days)

<entries aged out from Active Contracts when entity reaches shipped status for > 30 days>
```

## Rules for Section Ordering

- Active Contracts is first, Recently Retired second.
- Within Active Contracts, sections are ordered alphabetically by file path.
- Within each section, entries are ordered by entity advance date (oldest first).

## Rules for Status Column

| Emoji | Meaning |
|-------|---------|
| 🟢 final | Entity has shipped. Decision is locked in main branch. |
| 🟡 in-flight | Entity is between plan and shipped. Decision may still change. |
| 🔵 planned | Entity has a plan that will touch this file but execute hasn't started. |
| 🔴 reverted | Entity was abandoned or its change was rolled back. Kept for audit. |

## Rules for Reads

When `read` mode queries by file path:
1. Find the section matching the file path.
2. Parse the table into a list of `{entity, stage, intent, status}` dicts.
3. Return matches ordered by status priority: in-flight > planned > final > reverted.

## Rules for Writes

When `write` mode appends a new entry:
1. If the file path section doesn't exist, create it alphabetically.
2. Within the section, append a new row to the table.
3. Never modify existing rows unless the operation is explicitly updating an existing entry's status (e.g., in-flight → final when entity ships).
4. Preserve blank lines and section separators exactly.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_workflow_index.py -v`
Expected: All tests PASS (including the 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/references/contracts-format.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index contracts-format reference"
```

---

### Task 4: Write workflow-index decisions-format reference

**Files:**
- Create: `skills/workflow-index/references/decisions-format.md`
- Test: `tests/test_workflow_index.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_workflow_index.py`:

```python
def test_decisions_format_reference_exists():
    ref = SKILL_DIR / "references" / "decisions-format.md"
    assert ref.exists(), f"Expected {ref} to exist"


def test_decisions_format_describes_supersede_mechanism():
    ref = SKILL_DIR / "references" / "decisions-format.md"
    content = ref.read_text(encoding="utf-8")
    assert "Supersedes" in content
    assert "append-only" in content.lower()
    assert "D-" in content  # decision ID format marker
```

- [ ] **Step 2: Run tests to see them fail**

Run: `uv run pytest tests/test_workflow_index.py -v -k "decisions_format"`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write the decisions-format reference**

Write `skills/workflow-index/references/decisions-format.md`:

```markdown
# DECISIONS.md Format Specification

DECISIONS.md is an append-only log of captain-approved decisions during the build flow. Decisions are never deleted; they are superseded when replaced by newer decisions. This preserves full audit history.

## File Location

`docs/build-pipeline/_index/DECISIONS.md`

## Entry Structure

Each decision is a `## D-{entity-slug}-{sequence}` heading followed by structured fields. Sequence starts at 1 per entity and increments for each decision sourced from that entity.

```markdown
## D-046-1: Filter UI is client-side

**Source**: entity 046, clarify stage, 2026-04-10
**Scope**: tools/dashboard/static/app.js
**Rationale**: Client-side filter keeps server load low; user count too small for server-side
**Related entities**: [046, 052, 059]
**Status**: 🟢 active
**Supersedes**: none

---
```

## Required Fields

Every decision entry must include:

| Field | Format | Purpose |
|-------|--------|---------|
| Heading | `## D-{slug}-{seq}: {short title}` | Stable ID used for cross-referencing and supersede tracking |
| **Source** | `entity {slug}, {stage} stage, {YYYY-MM-DD}` | Where the decision originated |
| **Scope** | File path or paths the decision applies to | Enables reverse lookup by file |
| **Rationale** | 1-2 sentences of reasoning | Future readers need to understand WHY |
| **Related entities** | `[slug, slug, ...]` | Entities affected by or referencing this decision |
| **Status** | `🟢 active` or `🔴 superseded by D-XXX-Y` | Current state |
| **Supersedes** | `none` or `D-XXX-Y` | Previous decision this replaces, if any |

## Supersede Mechanism

When a new decision replaces an older one:

1. Write the new decision entry with `Supersedes: D-{old-id}`.
2. Edit the old entry's Status field: `Status: 🔴 superseded by D-{new-id}`.
3. Do NOT remove the old entry. It remains in the file for audit history.
4. Commit both changes in the same commit: `docs(decisions): supersede D-046-1 with D-052-1`.

## Rules for Reads

When `read` mode queries DECISIONS.md:
- Query by file path → find entries whose Scope contains the path, return only those with Status 🟢 active by default (include 🔴 superseded if caller explicitly requests history).
- Query by entity slug → find entries where Source entity matches OR Related entities contains the slug.

## Rules for Writes

- Always append new entries at the end of the file, before any trailing `---` separator.
- Never reorder existing entries.
- When updating a Supersedes target's Status, use Edit with specific old/new string match — do not rewrite the whole entry.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "decisions_format"`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/references/decisions-format.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index decisions-format reference with supersede semantics"
```

---

### Task 5: Write workflow-index read-mode reference

**Files:**
- Create: `skills/workflow-index/references/read-mode.md`
- Test: `tests/test_workflow_index.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_workflow_index.py`:

```python
def test_read_mode_reference_exists():
    ref = SKILL_DIR / "references" / "read-mode.md"
    assert ref.exists()


def test_read_mode_documents_query_by_file_and_entity():
    ref = SKILL_DIR / "references" / "read-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "query" in content.lower()
    assert "file" in content.lower()
    assert "entity" in content.lower()
    assert "active" in content.lower()
```

- [ ] **Step 2: Run test to see it fail**

Run: `uv run pytest tests/test_workflow_index.py -v -k "read_mode"`
Expected: FAIL.

- [ ] **Step 3: Write read-mode reference**

Write `skills/workflow-index/references/read-mode.md`:

```markdown
# workflow-index — read mode

Read mode is idempotent and does not mutate state. It parses CONTRACTS.md, DECISIONS.md, or INDEX.md and returns structured results filtered by the caller's query.

## Inputs

```yaml
mode: read
target: contracts | decisions | index
query:
  file: {optional, relative path}
  entity: {optional, slug}
  include_superseded: {optional bool, default false}
  status_filter: {optional list, e.g. [in-flight, planned]}
```

## Process

### Query CONTRACTS.md by file

1. Read `docs/build-pipeline/_index/CONTRACTS.md`.
2. Find the `### {file}` subsection matching `query.file`.
3. Parse the table rows into `{entity, stage, intent, status}` dicts.
4. If `status_filter` provided, keep only matching entries.
5. Return results sorted by priority: in-flight > planned > final > reverted.

### Query CONTRACTS.md by entity

1. Scan all `### {file}` sections.
2. For each section, find rows where `entity` column matches `query.entity`.
3. Return a list of `{file, stage, intent, status}` entries for that entity.

### Query DECISIONS.md by file

1. Read `docs/build-pipeline/_index/DECISIONS.md`.
2. Parse each `## D-{slug}-{n}` block into a structured decision dict.
3. Keep decisions whose Scope field contains the query file path.
4. By default exclude entries with Status 🔴 superseded; include only if `include_superseded: true`.
5. Return list of matching decisions.

### Query DECISIONS.md by entity

1. Parse all decision blocks.
2. Keep decisions where Source entity equals `query.entity` OR Related entities list contains `query.entity`.
3. Apply same superseded filter as above.
4. Return list.

## Output Format

Return structured YAML to the caller:

```yaml
matches:
  - entity: 046
    stage: shipped
    intent: Filter logic moved to client-side
    status: final
    file: tools/dashboard/static/app.js
count: 1
```

If no matches: `matches: []`, `count: 0`.

## Error Handling

- If target file doesn't exist: return `{matches: [], count: 0, error: "target file not found"}`.
- If query parameter is malformed: return `{error: "malformed query: {reason}"}`.
- Do not raise exceptions — always return a structured response.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "read_mode"`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/references/read-mode.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index read-mode reference"
```

---

### Task 6: Write workflow-index write-mode reference

**Files:**
- Create: `skills/workflow-index/references/write-mode.md`
- Test: `tests/test_workflow_index.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_workflow_index.py`:

```python
def test_write_mode_reference_exists():
    ref = SKILL_DIR / "references" / "write-mode.md"
    assert ref.exists()


def test_write_mode_documents_append_semantics():
    ref = SKILL_DIR / "references" / "write-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "append" in content.lower()
    assert "supersede" in content.lower() or "Supersedes" in content
    assert "commit" in content.lower()
```

- [ ] **Step 2: Run test to see it fail**

Run: `uv run pytest tests/test_workflow_index.py -v -k "write_mode"`
Expected: FAIL.

- [ ] **Step 3: Write write-mode reference**

Write `skills/workflow-index/references/write-mode.md`:

```markdown
# workflow-index — write mode

Write mode appends new entries to CONTRACTS.md, DECISIONS.md, or rebuilds INDEX.md. All writes preserve existing content; only the minimal region being modified is touched.

## Inputs

```yaml
mode: write
target: contracts | decisions | index
operation: append | update-status | supersede | rebuild
entry:
  # Fields vary by target, see below
```

## Operation: append to CONTRACTS.md

Used when an entity enters a new stage that touches files.

Input:
```yaml
entry:
  entity: 052
  stage: execute
  files:
    - tools/dashboard/static/ws-client.js
    - tools/dashboard/src/channel-provider.ts
  intent: WebSocket reconnection with exponential backoff
  status: in-flight
```

Process:
1. Read CONTRACTS.md.
2. For each file in entry.files:
   a. Check if `### {file}` section exists.
   b. If yes, Edit to append a new row to the table.
   c. If no, Edit to insert a new section alphabetically with a single-row table.
3. Commit: `chore(index): add contracts for entity-{slug} entering {stage}`

## Operation: update-status in CONTRACTS.md

Used when an entity advances to shipped or the contract retires.

Input:
```yaml
entry:
  entity: 046
  file: tools/dashboard/static/app.js
  new_status: final  # or reverted
```

Process:
1. Read CONTRACTS.md.
2. Locate the row matching entity + file.
3. Edit just the Status cell with minimal old_string/new_string replacement.
4. If new_status is `final` and entity has been shipped > 30 days, move row to Recently Retired section.
5. Commit: `chore(index): mark contract for {entity}+{file} as {new_status}`

## Operation: append to DECISIONS.md

Used when clarify stage captures a captain decision.

Input:
```yaml
entry:
  id: D-046-1
  title: Filter UI is client-side
  source_entity: 046
  source_stage: clarify
  source_date: 2026-04-10
  scope: [tools/dashboard/static/app.js]
  rationale: Client-side filter keeps server load low; user count too small
  related_entities: [046, 052, 059]
```

Process:
1. Read DECISIONS.md.
2. Find insertion point: end of file, before any trailing `---` separator.
3. Write the new decision block per `decisions-format.md` template.
4. Commit: `docs(decisions): capture D-{id} from {entity} {stage}`

## Operation: supersede in DECISIONS.md

Used when a new decision replaces an older one.

Input:
```yaml
entry:
  new_decision:
    # Full decision entry as above
    supersedes: D-046-1
```

Process:
1. Append the new decision (using append operation above).
2. Edit the old decision's Status field: `Status: 🟢 active` → `Status: 🔴 superseded by D-{new-id}`
3. Commit both changes together: `docs(decisions): supersede D-046-1 with D-{new-id}`

## Operation: rebuild INDEX.md

Used by workflow-index-maintainer mod on idle hook.

Input:
```yaml
operation: rebuild
target: index
```

Process:
1. Scan all `docs/build-pipeline/*.md` entity files.
2. Parse each entity's frontmatter for `id`, `title`, `status`.
3. Group by status.
4. Write `docs/build-pipeline/_index/INDEX.md` with structured tables.
5. Commit: `chore(index): rebuild INDEX.md`

## Rules

- **Minimal edits** — Use Edit with unique old_string/new_string matches. Never use Write to rewrite a whole file (except INDEX.md rebuild which is generated).
- **Separate commits** — Each write operation is its own commit. Never bundle with feature code.
- **Idempotency for rebuild** — Running rebuild twice in a row should produce identical INDEX.md content.
- **Atomicity for supersede** — Both the new decision append AND the old decision status update must happen in the same commit.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "write_mode"`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/references/write-mode.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index write-mode reference"
```

---

### Task 7: Write workflow-index check-mode reference

**Files:**
- Create: `skills/workflow-index/references/check-mode.md`
- Test: `tests/test_workflow_index.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_workflow_index.py`:

```python
def test_check_mode_reference_exists():
    ref = SKILL_DIR / "references" / "check-mode.md"
    assert ref.exists()


def test_check_mode_documents_in_flight_and_warning_gates():
    ref = SKILL_DIR / "references" / "check-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "in-flight" in content.lower()
    assert "blocker" in content.lower()
    assert "warning" in content.lower()
    # Must reference Dimension 7 from plan-checker
    assert "Dim" in content or "dimension 7" in content.lower() or "Dimension 7" in content
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_workflow_index.py -v -k "check_mode"`
Expected: FAIL.

- [ ] **Step 3: Write check-mode reference**

Write `skills/workflow-index/references/check-mode.md`:

```markdown
# workflow-index — check mode

Check mode implements Plan-Checker Dimension 7 (Cross-Entity Coherence). Given a proposed plan's `files_modified` list, it queries CONTRACTS.md and DECISIONS.md to find other entities that also touch those files or would be affected by contradictory decisions.

## Inputs

```yaml
mode: check
entity: {slug of entity being planned}
files_modified:
  - tools/dashboard/static/app.js
  - tools/dashboard/src/ws-client.ts
recent_threshold_days: 30  # optional, default 30
```

## Process

1. For each file in `files_modified`:
   a. Invoke read mode: `{mode: read, target: contracts, query: {file: <file>}}`
   b. Filter results excluding the current entity itself.

2. Classify each match:
   - **Status 🟡 in-flight** (another entity between plan and shipped) → **blocker**
     Rationale: merge conflict risk + stepping on another entity's work.
   - **Status 🔵 planned** (another entity has a plan but hasn't started execute) → **blocker**
     Rationale: two concurrent plans on same file means one must wait.
   - **Status 🟢 final**, shipped within `recent_threshold_days` → **warning**
     Rationale: reviewer should check the recent shipped entity's Stage Report for context (approach might have changed).
   - **Status 🟢 final**, shipped before threshold → **info only** (not included in blockers or warnings)
   - **Status 🔴 reverted** → **info only** with note "previously attempted but rolled back"

3. For each file, also query DECISIONS.md:
   a. Invoke read mode: `{mode: read, target: decisions, query: {file: <file>}}`
   b. For each active decision, check if the current entity's plan rationale contradicts it.
   c. Detection heuristic: scan the plan's rationale section for phrases opposing the decision's rationale (e.g., decision says "client-side filter" but plan says "move filter to server").
   d. If contradiction detected → **blocker** with message: "Plan contradicts D-{id} — supersede or revise".

## Output Format

```yaml
issues:
  - severity: blocker
    kind: in-flight-conflict
    file: tools/dashboard/static/app.js
    other_entity: 052
    other_stage: execute
    message: "Entity 052 is currently modifying this file (in-flight). Merge conflict risk. Resolve by coordinating with 052 or serializing execution."

  - severity: warning
    kind: recent-change
    file: tools/dashboard/src/ws-client.ts
    other_entity: 041
    shipped_date: 2026-04-05
    message: "Entity 041 recently modified this file. Check its Stage Report before proceeding; the file's conventions may have changed."

  - severity: blocker
    kind: decision-contradiction
    file: tools/dashboard/static/app.js
    decision_id: D-046-1
    message: "Plan rationale 'move filter to server-side' contradicts D-046-1 ('Filter UI is client-side'). Either supersede D-046-1 with a new captain-approved decision, or revise plan."

count_blockers: 2
count_warnings: 1
```

If no issues: return `{issues: [], count_blockers: 0, count_warnings: 0}`.

## Integration with Plan-Checker

This check is Dimension 7 in the plan-checker's 7-dimension run. The plan-checker subagent:

1. Reads the plan's `files_modified` across all tasks.
2. Invokes workflow-index check mode with the aggregated list.
3. Integrates returned issues into its overall issue list alongside other dimensions.
4. Reports to build-plan orchestrator for revision loop.

## Limitations

- Contradiction detection is heuristic; false positives possible. When in doubt, mark as warning with "possible contradiction" kind.
- Recent-change window is configurable but default 30 days balances catch rate vs noise.
- This check does not validate semantic correctness of the plan itself — only cross-entity coherence.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "check_mode"`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-index/references/check-mode.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index check-mode reference for plan-checker Dim 7"
```

---

### Task 8: Write workflow-index fixture files

**Files:**
- Create: `tests/fixtures/workflow-index-fixture/README.md`
- Create: `tests/fixtures/workflow-index-fixture/_index/CONTRACTS.md`
- Create: `tests/fixtures/workflow-index-fixture/_index/DECISIONS.md`
- Create: `tests/fixtures/workflow-index-fixture/_index/INDEX.md`
- Create: `tests/fixtures/workflow-index-fixture/entity-a.md`
- Create: `tests/fixtures/workflow-index-fixture/entity-b.md`
- Test: `tests/test_workflow_index.py` (add fixture tests)

- [ ] **Step 1: Add failing test for fixture existence**

Append to `tests/test_workflow_index.py`:

```python
FIXTURE_DIR = REPO_ROOT / "tests" / "fixtures" / "workflow-index-fixture"


def test_workflow_index_fixture_directory_exists():
    assert FIXTURE_DIR.exists() and FIXTURE_DIR.is_dir()


def test_workflow_index_fixture_has_seed_artifacts():
    for name in ["CONTRACTS.md", "DECISIONS.md", "INDEX.md"]:
        assert (FIXTURE_DIR / "_index" / name).exists(), f"Missing {name}"


def test_workflow_index_fixture_has_entities():
    assert (FIXTURE_DIR / "entity-a.md").exists()
    assert (FIXTURE_DIR / "entity-b.md").exists()
```

- [ ] **Step 2: Run tests to see them fail**

Run: `uv run pytest tests/test_workflow_index.py -v -k "fixture"`
Expected: FAIL — fixture directory doesn't exist.

- [ ] **Step 3: Create fixture directory and seed files**

```bash
mkdir -p tests/fixtures/workflow-index-fixture/_index
```

Write `tests/fixtures/workflow-index-fixture/README.md`:

```markdown
---
commissioned-by: spacedock@0.9.0
entity-type: test-entity
entity-label: task
entity-label-plural: tasks
id-style: alphanumeric
stages:
  profiles:
    default: [draft, execute, shipped]
  defaults:
    worktree: false
    concurrency: 1
  states:
    - name: draft
      initial: true
      worktree: false
      manual: true
    - name: execute
    - name: shipped
      terminal: true
      worktree: false
---

# Fixture Workflow for workflow-index Tests

Minimal workflow with two entities used by `tests/test_workflow_index.py`. Not exercised by production FO.
```

Write `tests/fixtures/workflow-index-fixture/_index/CONTRACTS.md` (note: includes the `Last Updated` column added to the schema during the Task 3/5/7 fix-forward pass):

```markdown
# Contracts Index

Fixture seed — mirrors structure of production CONTRACTS.md.

## Active Contracts

### tools/fixture/a.ts

| Entity | Stage | Intent | Status | Last Updated |
|--------|-------|--------|--------|--------------|
| entity-a | shipped | Initial fixture entry | 🟢 final     | 2026-04-01 |
| entity-b | execute | Modify fixture file   | 🟡 in-flight | 2026-04-11 |

### tools/fixture/b.ts

| Entity | Stage | Intent | Status | Last Updated |
|--------|-------|--------|--------|--------------|
| entity-a | shipped | Another shipped entry | 🟢 final | 2026-04-01 |

## Recently Retired (last 30 days)

<!-- Empty in fixture -->
```

Write `tests/fixtures/workflow-index-fixture/_index/DECISIONS.md`:

```markdown
# Decisions Log

Fixture seed — contains one active decision and one superseded decision.

---

## D-entity-a-1: Fixture decision for a.ts

**Source**: entity-a, clarify stage, 2026-04-01
**Scope**: tools/fixture/a.ts
**Rationale**: Initial fixture rationale for testing reverse lookup
**Related entities**: [entity-a, entity-b]
**Status**: 🟢 active
**Supersedes**: none

---

## D-entity-a-2: Superseded fixture decision

**Source**: entity-a, clarify stage, 2026-03-15
**Scope**: tools/fixture/c.ts
**Rationale**: Old approach that was replaced
**Related entities**: [entity-a]
**Status**: 🔴 superseded by D-entity-a-1
**Supersedes**: none
```

Write `tests/fixtures/workflow-index-fixture/_index/INDEX.md`:

```markdown
# Workflow Index

## Entities by Status

### shipped
- entity-a — Fixture shipped entity

### execute
- entity-b — Fixture in-flight entity
```

Write `tests/fixtures/workflow-index-fixture/entity-a.md`:

```markdown
---
id: entity-a
title: Fixture shipped entity
status: shipped
---

# Fixture entity-a

Shipped test entity for workflow-index fixtures.
```

Write `tests/fixtures/workflow-index-fixture/entity-b.md`:

```markdown
---
id: entity-b
title: Fixture in-flight entity
status: execute
---

# Fixture entity-b

In-flight test entity for workflow-index fixtures.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "fixture"`
Expected: All 3 fixture tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/workflow-index-fixture/
git add tests/test_workflow_index.py
git commit -m "test(phase-e): workflow-index test fixture with seed CONTRACTS/DECISIONS"
```

---

### Task 9: Write behavior test for workflow-index read mode (query by file)

**Files:**
- Test: `tests/test_workflow_index.py` (add behavior test)

This test validates the read-mode specification by parsing fixture CONTRACTS.md and checking that a query by file returns the expected entries. Since workflow-index is a markdown skill (executed by Claude at runtime), the "behavior test" here is a Python re-implementation of the read logic that asserts the reference spec is self-consistent with the fixture.

- [ ] **Step 1: Write the behavior test**

Append to `tests/test_workflow_index.py`:

```python
def parse_contracts_by_file(contracts_path: Path, file_query: str) -> list[dict]:
    """Re-implements the read-mode 'query by file' logic in Python.

    This is a spec-conformance check: the Python implementation mirrors what a
    Claude ensign would do when executing the skill's read-mode reference.
    """
    content = contracts_path.read_text(encoding="utf-8")
    # Find the section for the queried file
    section_header = f"### {file_query}"
    if section_header not in content:
        return []

    # Extract the section content up to the next ### or ##
    start = content.index(section_header) + len(section_header)
    rest = content[start:]
    next_section_match = re.search(r"\n(##+ )", rest)
    section_body = rest[: next_section_match.start()] if next_section_match else rest

    # Parse the markdown table
    lines = [line.strip() for line in section_body.strip().split("\n") if line.strip().startswith("|")]
    if len(lines) < 3:
        return []

    # Skip header row and separator
    rows = lines[2:]
    results = []
    for row in rows:
        cells = [c.strip() for c in row.split("|")[1:-1]]
        if len(cells) == 5:
            # Post fix-forward schema: Entity | Stage | Intent | Status | Last Updated
            results.append({
                "entity": cells[0],
                "stage": cells[1],
                "intent": cells[2],
                "status": cells[3],
                "last_updated": cells[4],
            })
        elif len(cells) == 4:
            # Legacy schema without Last Updated — treat as missing date
            results.append({
                "entity": cells[0],
                "stage": cells[1],
                "intent": cells[2],
                "status": cells[3],
                "last_updated": None,
            })
    return results


def test_read_contracts_by_file_returns_expected_entries():
    contracts = FIXTURE_DIR / "_index" / "CONTRACTS.md"
    results = parse_contracts_by_file(contracts, "tools/fixture/a.ts")
    assert len(results) == 2
    assert results[0]["entity"] == "entity-a"
    assert "final" in results[0]["status"]
    assert results[1]["entity"] == "entity-b"
    assert "in-flight" in results[1]["status"]


def test_read_contracts_by_file_empty_for_unknown_file():
    contracts = FIXTURE_DIR / "_index" / "CONTRACTS.md"
    results = parse_contracts_by_file(contracts, "tools/fixture/nonexistent.ts")
    assert results == []
```

- [ ] **Step 2: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "read_contracts_by_file"`
Expected: Both PASS (the fixture already has the expected content).

- [ ] **Step 3: Commit**

```bash
git add tests/test_workflow_index.py
git commit -m "test(phase-e): workflow-index read-mode behavior test via fixture parse"
```

---

### Task 10: Write behavior test for workflow-index DECISIONS supersede filter

**Files:**
- Test: `tests/test_workflow_index.py` (add behavior test)

- [ ] **Step 1: Write the test**

Append to `tests/test_workflow_index.py`:

```python
def parse_decisions_filter_active(decisions_path: Path, include_superseded: bool = False) -> list[dict]:
    """Re-implements 'query decisions' logic, default excludes superseded."""
    content = decisions_path.read_text(encoding="utf-8")
    # Split on ## D- headings
    blocks = re.split(r"\n## (D-[\w\-]+): ", content)
    results = []
    # blocks[0] is preamble; then alternating (id, body)
    for i in range(1, len(blocks), 2):
        decision_id = blocks[i]
        body = blocks[i + 1] if i + 1 < len(blocks) else ""
        # Extract Status field
        status_match = re.search(r"\*\*Status\*\*:\s*(.+?)(?:\n|$)", body)
        status = status_match.group(1).strip() if status_match else ""
        is_superseded = "superseded" in status
        if not include_superseded and is_superseded:
            continue
        results.append({
            "id": decision_id,
            "status": status,
            "is_superseded": is_superseded,
        })
    return results


def test_read_decisions_excludes_superseded_by_default():
    decisions = FIXTURE_DIR / "_index" / "DECISIONS.md"
    results = parse_decisions_filter_active(decisions)
    active_ids = [r["id"] for r in results]
    assert "D-entity-a-1" in active_ids
    assert "D-entity-a-2" not in active_ids  # superseded, excluded by default


def test_read_decisions_includes_superseded_when_requested():
    decisions = FIXTURE_DIR / "_index" / "DECISIONS.md"
    results = parse_decisions_filter_active(decisions, include_superseded=True)
    all_ids = [r["id"] for r in results]
    assert "D-entity-a-1" in all_ids
    assert "D-entity-a-2" in all_ids
```

- [ ] **Step 2: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "read_decisions"`
Expected: Both PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/test_workflow_index.py
git commit -m "test(phase-e): workflow-index decisions supersede filter behavior"
```

---

### Task 11: Write knowledge-capture skill frontmatter and entry point

**Files:**
- Create: `skills/knowledge-capture/SKILL.md`
- Test: `tests/test_knowledge_capture.py`

- [ ] **Step 1: Write the failing structural test**

Create `tests/test_knowledge_capture.py`:

```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
# ABOUTME: Structural and behavior tests for skills/knowledge-capture/SKILL.md.
# ABOUTME: Validates two-mode structure (capture / apply) and classifier/gate references.

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = REPO_ROOT / "skills" / "knowledge-capture"
SKILL_FILE = SKILL_DIR / "SKILL.md"


def parse_frontmatter(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        raise ValueError(f"No frontmatter in {path}")
    return yaml.safe_load(match.group(1))


def test_skill_file_exists():
    assert SKILL_FILE.exists(), f"Expected {SKILL_FILE}"


def test_frontmatter_name_is_knowledge_capture():
    fm = parse_frontmatter(SKILL_FILE)
    assert fm.get("name") == "knowledge-capture"


def test_frontmatter_description_mentions_both_modes():
    fm = parse_frontmatter(SKILL_FILE)
    desc = fm.get("description", "").lower()
    assert "capture" in desc and "apply" in desc


def test_skill_content_mentions_D1_and_D2():
    content = SKILL_FILE.read_text(encoding="utf-8")
    assert "D1" in content
    assert "D2" in content
```

- [ ] **Step 2: Run test to verify failure**

Run: `uv run pytest tests/test_knowledge_capture.py -v`
Expected: FAIL on `test_skill_file_exists`.

- [ ] **Step 3: Create skill directory and SKILL.md**

```bash
mkdir -p skills/knowledge-capture/references
mkdir -p skills/knowledge-capture/fixtures
```

Write `skills/knowledge-capture/SKILL.md`:

```markdown
---
name: knowledge-capture
description: Two-mode shared skill for capturing and applying knowledge from workflow findings. Mode 'capture' (called by stage ensigns) classifies findings, auto-appends D1 skill-level patterns, and stages D2 project-level candidates to the entity body. Mode 'apply' (called by First Officer in --agent context) reads pending candidates, presents each to captain via AskUserQuestion, and writes approved ones to the target CLAUDE.md or review-lessons.md. Solves the ensign-subagent AskUserQuestion limitation by splitting capture (no captain) from apply (captain-facing).
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# knowledge-capture

Shared utility skill for preserving knowledge across workflow runs. Distilled from `kc-pr-flow`'s knowledge-capture mechanism (D1/D2 dimensions) and generalized for any stage ensign to call.

## Two Modes

| Mode | Caller | Context | Captain Interaction |
|------|--------|---------|---------------------|
| `capture` | Any stage ensign (research, plan, execute, quality, review, uat) | Ensign subagent | None — findings staged only |
| `apply` | First Officer | FO `--agent` context | Yes — AskUserQuestion per candidate |

Callers MUST specify `mode: capture` or `mode: apply` in the invocation prompt. The skill's entry point dispatches to the corresponding reference file.

## Dimensions

**D1 — Skill-level patterns, auto-append, no gate**
General workflow patterns discovered during execution. Written to plugin-internal reference files (e.g., `learned-patterns.md`). Makes the plugin smarter for future runs. No captain confirmation required.

**D2 — Project-level rules, gated + staged + applied**
Project-specific rules or gotchas that should live in CLAUDE.md or review-lessons.md of the reviewed project. Requires:
1. Severity gate pass (CRITICAL/HIGH with DOC/NEW classification, or MEDIUM with 2+ recurrence)
2. Three-question test pass (recurs? non-obvious? ruleable?)
3. Captain confirmation (in apply mode only)

See `references/gates.md` for the full gate logic.

## Mode Dispatch

- `mode: capture` → follow `references/capture-mode.md`
- `mode: apply` → follow `references/apply-mode.md`

Both modes share:
- `references/classifier.md` — finding classification (root + severity)
- `references/gates.md` — D2 severity gate and 3-question test
- `references/targets.md` — multi-level CLAUDE.md target selection

## Critical Invariants

- **Capture mode never calls AskUserQuestion** — ensigns are subagents without native UI access. D2 candidates are staged in the entity body's `## Pending Knowledge Captures` section instead.
- **Apply mode is called only by FO** — FO runs in `--agent` mode where native AskUserQuestion works. This is the only correct caller for mode=apply.
- **Append-only D1 writes** — plugin reference files grow monotonically. Never rewrite or delete D1 entries.
- **Separate commits for D2 writes** — D2 apply always commits as its own change, never bundled with other work.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v`
Expected: All 4 structural tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/SKILL.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture skill frontmatter and two-mode entry point"
```

---

### Task 12: Write knowledge-capture classifier reference

**Files:**
- Create: `skills/knowledge-capture/references/classifier.md`
- Test: `tests/test_knowledge_capture.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
def test_classifier_reference_exists():
    ref = SKILL_DIR / "references" / "classifier.md"
    assert ref.exists()


def test_classifier_defines_all_severity_levels():
    ref = SKILL_DIR / "references" / "classifier.md"
    content = ref.read_text(encoding="utf-8")
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NIT"]:
        assert level in content, f"Expected severity {level} in classifier.md"


def test_classifier_defines_all_root_types():
    ref = SKILL_DIR / "references" / "classifier.md"
    content = ref.read_text(encoding="utf-8")
    for root in ["CODE", "DOC", "NEW", "PLAN"]:
        assert root in content, f"Expected root {root} in classifier.md"
```

- [ ] **Step 2: Run test to see failure**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "classifier"`
Expected: FAIL.

- [ ] **Step 3: Write classifier reference**

Write `skills/knowledge-capture/references/classifier.md`:

```markdown
# Finding Classifier

Every raw finding passed to knowledge-capture must be classified along two axes before gating: **severity** and **root**. This happens automatically inside capture mode before the severity gate and 3-question test run.

## Axis 1: Severity

| Severity | Definition | Example |
|----------|------------|---------|
| **CRITICAL** | Exploit, data loss, silent failure that affects production | Unhandled auth bypass; DROP TABLE in migration; swallowed exception hiding data corruption |
| **HIGH** | Clear bug that will cause user-visible problems | Wrong error handling; broken edge case; incorrect validation |
| **MEDIUM** | Code smell, moderate quality issue, recurring pattern | Duplicated logic; inconsistent naming; moderate test gap |
| **LOW** | Minor readability, preference, small improvement | Variable naming; comment wording; style nit |
| **NIT** | Stylistic only, no functional impact | Whitespace; trailing comma; alphabetization |

## Axis 2: Root (where the finding lives)

| Root | Definition | Typical Action |
|------|------------|----------------|
| **CODE** | Problem is in the code itself; fix by editing the source file | Fix in execute stage (feedback-to: execute) |
| **DOC** | Problem is in documentation (CLAUDE.md, README, comments) that is stale or wrong | Update the doc; does NOT require code change |
| **NEW** | Finding reveals a pattern/rule that is not yet documented anywhere | Propose a new rule in CLAUDE.md or review-lessons.md |
| **PLAN** | Problem cannot be fixed in execute alone; plan itself needs revision | Raise replan advisory flag (captain decides) |

## Classification Rules

1. **Severity is assigned based on impact**, not effort. A one-line typo causing data loss is CRITICAL, not LOW.
2. **Root is assigned based on where the fix lives**, not where the finding was detected. A test that fails because documentation is stale → Root=DOC, not Root=CODE.
3. **Findings can have secondary roots** but primary root determines routing. Capture the secondary root in finding metadata if relevant.
4. **Never classify as NIT + DOC** — stylistic documentation fixes are not worth capturing. Skip them.
5. **PLAN findings are rare** — reserve for architectural issues that prove the plan's decomposition is wrong. Do not use PLAN for "this task is hard to implement".

## Classification Output Schema

```yaml
finding:
  id: f-001
  summary: "Short description of the finding"
  severity: HIGH
  root: CODE
  secondary_root: null
  source_file: src/foo.ts
  source_line: 42
  detected_by: pr-review-toolkit:silent-failure-hunter
```

## Integration Point

This classification is the first step inside capture mode. See `references/capture-mode.md` for how classification feeds into D1 auto-append and D2 gate evaluation.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "classifier"`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/references/classifier.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture classifier reference (severity + root axes)"
```

---

### Task 13: Write knowledge-capture gates reference

**Files:**
- Create: `skills/knowledge-capture/references/gates.md`
- Test: `tests/test_knowledge_capture.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
def test_gates_reference_exists():
    ref = SKILL_DIR / "references" / "gates.md"
    assert ref.exists()


def test_gates_contains_three_question_test():
    ref = SKILL_DIR / "references" / "gates.md"
    content = ref.read_text(encoding="utf-8")
    for q in ["Recurs", "Non-obvious", "Ruleable"]:
        assert q in content, f"Expected '{q}' in gates.md"


def test_gates_contains_severity_table():
    ref = SKILL_DIR / "references" / "gates.md"
    content = ref.read_text(encoding="utf-8")
    assert "CRITICAL" in content
    assert "candidate" in content.lower()
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "gates"`
Expected: FAIL.

- [ ] **Step 3: Write gates reference**

Write `skills/knowledge-capture/references/gates.md`:

```markdown
# D2 Gates (Severity + Three-Question Test)

Before any finding can become a D2 candidate (project-level CLAUDE.md or review-lessons.md entry), it must pass two gates in sequence. This prevents noise and ensures captured rules are worth the user's attention.

## Gate 1: Severity Pre-Filter

Pre-filter by classification severity and root. Only findings that pass this gate proceed to the three-question test.

| Severity | Root | D2 Candidate? |
|----------|------|---------------|
| CRITICAL | DOC or NEW | ✅ Yes |
| CRITICAL | CODE | ✅ Yes (code fix already flows to execute, but also worth documenting the lesson) |
| HIGH | DOC or NEW | ✅ Yes |
| HIGH | CODE | ✅ Yes if recurrence ≥ 2 |
| MEDIUM | Any | ✅ Yes if recurrence ≥ 2 (same type 2+ times in history) |
| MEDIUM | Any | ❌ No if first occurrence |
| LOW | Any | ❌ Never |
| NIT | Any | ❌ Never |

**Recurrence check**: "Same type" means the finding's semantic category matches a previous finding. Recurrence is determined by scanning the plugin's `learned-patterns.md` and project's `review-lessons.md` for similar entries. If 2+ matches exist, recurrence flag is set.

## Gate 2: Three-Question Test

Every D2 candidate that passes the severity gate must answer YES to all three questions. Any NO → skip.

### Q1: Recurs?

> Will future similar work encounter this same issue?

Examples:
- ✅ YES: "Every React component that directly mutates state has this bug — future React work will hit it."
- ❌ NO: "This specific function was written by a confused intern. No future work will recreate it."

If NO: the finding is a one-off, not worth a rule. Skip.

### Q2: Non-obvious?

> Would a developer unfamiliar with this project miss this issue?

Examples:
- ✅ YES: "Only our codebase has this convention — outside devs would miss it."
- ❌ NO: "Any competent developer would notice this trivially."

If NO: the finding is self-evident; documenting it adds noise. Skip.

### Q3: Ruleable?

> Can this be expressed as a concrete rule: "do X / never Y, because Z"?

Examples:
- ✅ YES: "Never use `useEffect` without a dependency array, because React will loop infinitely."
- ❌ NO: "Be careful with async code."

If NO: vague advisories don't help. Skip.

## Gate Output

For each candidate:

```yaml
gate_result:
  finding_id: f-001
  severity_gate: pass
  q1_recurs: yes
  q2_non_obvious: yes
  q3_ruleable: yes
  overall: candidate  # or "skipped"
  skip_reason: null  # or reason if skipped
```

Candidates that pass all gates proceed to target selection (see `references/targets.md`) and, in capture mode, get staged to the entity body's `## Pending Knowledge Captures` section.

## Rationale

This dual-gate approach is distilled from kc-pr-flow's knowledge-capture pattern. The severity gate reduces processing cost by excluding obvious noise early. The three-question test catches subtle noise — findings that look important but don't generalize. Together they keep D2 writes actionable and rare enough that captain's attention (in apply mode) is well-spent.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "gates"`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/references/gates.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture gates reference (severity + 3Q test)"
```

---

### Task 14: Write knowledge-capture targets reference

**Files:**
- Create: `skills/knowledge-capture/references/targets.md`
- Test: `tests/test_knowledge_capture.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
def test_targets_reference_exists():
    ref = SKILL_DIR / "references" / "targets.md"
    assert ref.exists()


def test_targets_defines_all_levels():
    ref = SKILL_DIR / "references" / "targets.md"
    content = ref.read_text(encoding="utf-8")
    for level in ["plugin", "user-global", "project", "module", "lessons", "DECISIONS"]:
        assert level in content, f"Expected level '{level}' in targets.md"
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "targets"`
Expected: FAIL.

- [ ] **Step 3: Write targets reference**

Write `skills/knowledge-capture/references/targets.md`:

```markdown
# D2 Target Selection

Once a finding has passed both gates (see `gates.md`), the next step is choosing WHERE to write the rule. Different findings belong at different levels of the CLAUDE.md hierarchy.

## Level Hierarchy

| Level | Target File | When to Use |
|-------|-------------|-------------|
| **plugin** | `{plugin}/reference/learned-patterns.md` | D1 default — skill-level reusable patterns (not D2, always D1) |
| **user-global** | `~/.claude/CLAUDE.md` | Rules that apply to ALL of the user's projects. Rare. Requires explicit captain consent. |
| **project** | `{repo}/CLAUDE.md` | Rules that apply to the whole repo. Most common D2 target. |
| **module** | `{repo}/{subdir}/CLAUDE.md` | Rules that apply only to a specific module/directory. Use when scope is clearly narrower than project-wide. |
| **lessons** | `{repo}/.claude/review-lessons.md` | Contextual gotchas that aren't enforceable rules. Use when you can't phrase it as "do X / never Y". |
| **decisions** | `docs/build-pipeline/_index/DECISIONS.md` | Spacebridge-internal workflow decisions that affect future entities. Used by clarify stage and knowledge-capture when finding involves a workflow-level choice. |

## Target Selection Logic

```
For each D2 candidate:

1. Is this a spacebridge workflow decision (affects how future entities are planned)?
   → target: decisions

2. Is the finding expressible as a concrete rule (do X / never Y)?
   YES:
     a. Does the rule apply to all of the user's projects (not just this repo)?
        YES → target: user-global (rare)
     b. Does the rule apply to a specific subdirectory only?
        YES → target: module ({repo}/{subdir}/CLAUDE.md)
     c. Otherwise:
        → target: project ({repo}/CLAUDE.md)
   NO:
     → target: lessons ({repo}/.claude/review-lessons.md)
```

## User-Global Restriction

Writes to `~/.claude/CLAUDE.md` require **explicit captain confirmation with a secondary question**. Apply mode must ask: "This rule would apply to ALL your projects. Confirm?" before writing. Decline → fall back to project level.

## Module Detection

When the finding's source_file is in a subdirectory with its own CLAUDE.md, prefer module level over project level. Walk up the directory tree from source_file; the first CLAUDE.md encountered is the target (before reaching repo root).

Example: finding in `tools/dashboard/static/app.js` → check `tools/dashboard/static/CLAUDE.md`, then `tools/dashboard/CLAUDE.md`, then `{repo}/CLAUDE.md`. Use whichever exists (closest wins).

## Output Schema

```yaml
target:
  level: project
  file: /Users/kent/Project/spacedock/CLAUDE.md
  proposed_edit: |
    Append to § Frontend Patterns:
    "Never mutate React state directly. Use setX(prev => ...) or immutable helpers.
     Rationale: concurrent updates drop direct mutations."
  requires_secondary_confirmation: false
```

The `proposed_edit` field is a human-readable description of what will be written. Apply mode shows this to captain before editing.

## Integration

- Capture mode uses this to stage D2 candidates with their proposed target in the entity body's `## Pending Knowledge Captures` section.
- Apply mode reads the staged target, presents to captain for confirmation, and performs the Edit on approval.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "targets"`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/references/targets.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture targets reference (multi-level CLAUDE.md)"
```

---

### Task 15: Write knowledge-capture capture-mode reference

**Files:**
- Create: `skills/knowledge-capture/references/capture-mode.md`
- Test: `tests/test_knowledge_capture.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
def test_capture_mode_reference_exists():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    assert ref.exists()


def test_capture_mode_forbids_askuserquestion():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    content = ref.read_text(encoding="utf-8")
    # Must explicitly state no AskUserQuestion
    assert "AskUserQuestion" in content
    assert "not" in content.lower() or "never" in content.lower()


def test_capture_mode_describes_pending_captures_section():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "Pending Knowledge Captures" in content
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "capture_mode"`
Expected: FAIL.

- [ ] **Step 3: Write capture-mode reference**

Write `skills/knowledge-capture/references/capture-mode.md`:

```markdown
# knowledge-capture — capture mode

Capture mode runs inside a stage ensign's subagent context. Its job is to process findings, auto-append D1 patterns, and stage D2 candidates for later review. **It never interacts with the captain** — ensigns do not have access to native AskUserQuestion.

## Inputs

The caller (stage ensign) passes:

```yaml
mode: capture
findings: List[RawFinding]
source_stage: research | plan | execute | quality | review | uat
caller_context:
  entity_slug: {slug}
  entity_path: docs/build-pipeline/{slug}.md
  repo_path: /Users/kent/Project/spacedock
```

Each `RawFinding` is an unclassified observation from the caller ensign:

```yaml
- id: f-001
  summary: "Direct state mutation in React component"
  source_file: tools/dashboard/static/app.js
  source_line: 244
  detected_by: pr-review-toolkit:code-reviewer
  evidence: |
    // line 244-246: direct mutation
    state.filterActive = newValue;
    renderFilter();
```

## Process

### Step 1: Classify

For each finding, run `references/classifier.md` classification:
- Assign severity (CRITICAL..NIT)
- Assign root (CODE/DOC/NEW/PLAN)

### Step 2: D1 auto-append (all findings regardless of severity)

D1 targets skill-level reusable patterns. Even LOW severity findings can teach the plugin something.

For each classified finding:
1. Determine if it matches a D1 insight category (see classifier.md):
   - General review pattern discovered
   - New false-positive to ignore next time
   - New triage heuristic
   - Agent prompt improvement suggestion
2. If yes, format as a D1 entry and append to `{plugin}/reference/learned-patterns.md`:

```markdown
### [2026-04-11] spacedock — Direct mutation detection pattern

**Pattern**: React state mutation without setState wrapper detected via code-reviewer
**Applies to**: Any React-based dashboard project
**Action**: Add to pre-scan checks; walk changed files for state direct-write patterns
```

3. Briefly log to ensign output: "Appended pattern to learned-patterns.md: Direct mutation detection pattern"

**D1 writes are auto-append, no gate, no confirmation.** The plugin learning is low-risk and self-contained.

### Step 3: D2 gate evaluation

For each finding, run the severity gate (from `references/gates.md`):
- If fails severity gate → skip D2 for this finding
- If passes, run the three-question test
- If any of Q1/Q2/Q3 is NO → skip D2 for this finding

### Step 4: D2 candidate target selection

For each finding that passed both gates, run target selection (from `references/targets.md`):
- Determine level (plugin/user-global/project/module/lessons/decisions)
- Compute full target file path
- Compose proposed_edit text

### Step 5: Stage to entity body

Append or create `## Pending Knowledge Captures` section in the entity file. Each D2 candidate is a `<capture>` element:

```markdown
## Pending Knowledge Captures

<capture id="kc-1" severity="HIGH" root="NEW" target="/Users/kent/Project/spacedock/tools/dashboard/CLAUDE.md">
  <finding>
  Direct React state mutation detected at tools/dashboard/static/app.js:244.
  This violates React's concurrent update semantics and causes re-render drops.
  </finding>
  <proposed_edit>
  Append to tools/dashboard/CLAUDE.md § Frontend Patterns:

  "Never mutate React state directly in components. Use the functional
   setState pattern (setX(prev => ...)) or immutable helpers. Rationale:
   concurrent updates can drop direct mutations, causing flaky re-renders."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>046</source_entity>
  <source_file>tools/dashboard/static/app.js</source_file>
  <source_line>244</source_line>
  <detected_by>pr-review-toolkit:code-reviewer</detected_by>
</capture>
```

Use `Edit` tool to insert the section if it doesn't exist, or append new `<capture>` elements if the section already has entries. Never overwrite existing entries.

### Step 6: Return summary

Return to caller ensign:

```yaml
d1_written: 2
d2_pending: 1
skipped: 3
skipped_reasons:
  - "f-002: NIT severity"
  - "f-003: Q3 fail (vague rule)"
  - "f-004: duplicate of existing D1 pattern"
```

Caller records this in its Stage Report.

## Critical Invariants

- **NO AskUserQuestion calls in capture mode.** Capture runs in ensign subagent context. If capture-mode somehow calls AskUserQuestion, it will either fail or fall through to the Teammate tool — both indicate a design violation. FO handles captain interaction in apply mode, not capture mode.
- **D1 writes are the plugin's own reference files.** Never write D1 entries to the reviewed project's files. That would confuse the plugin-vs-project boundary.
- **D2 candidates are staged, never applied.** Capture mode must NOT write to CLAUDE.md or review-lessons.md directly. Those writes happen in apply mode, after captain approval.
- **Idempotency** — calling capture with the same findings twice should produce the same pending entries. Use finding IDs to detect duplicates and skip.

## Error Handling

- If entity file doesn't exist at `caller_context.entity_path`: return `{error: "entity not found"}` without writing anything.
- If classification fails for a finding: log the reason, skip that finding, continue with others.
- If D1 target file (`learned-patterns.md`) doesn't exist: create it with a header before appending.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "capture_mode"`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/references/capture-mode.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture capture-mode reference (ensign-side, no captain)"
```

---

### Task 16: Write knowledge-capture apply-mode reference

**Files:**
- Create: `skills/knowledge-capture/references/apply-mode.md`
- Test: `tests/test_knowledge_capture.py` (add test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
def test_apply_mode_reference_exists():
    ref = SKILL_DIR / "references" / "apply-mode.md"
    assert ref.exists()


def test_apply_mode_documents_askuserquestion_usage():
    ref = SKILL_DIR / "references" / "apply-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "AskUserQuestion" in content
    # Must document that FO is the ONLY caller
    assert "First Officer" in content or "FO" in content
    # Must document separate commit requirement
    assert "commit" in content.lower() and "separate" in content.lower()
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "apply_mode"`
Expected: FAIL.

- [ ] **Step 3: Write apply-mode reference**

Write `skills/knowledge-capture/references/apply-mode.md`:

```markdown
# knowledge-capture — apply mode

Apply mode runs inside the First Officer's `--agent` context where native AskUserQuestion works. Its job is to read pending D2 candidates from the entity body, present each to the captain one at a time, and apply approved edits to the target CLAUDE.md or review-lessons.md files.

## Caller

**Only** the First Officer should invoke this mode. The First Officer detects pending captures at step 3.6 of its "Completion and Gates" flow (see `references/first-officer-shared-core.md`) and calls knowledge-capture with `mode=apply` via the `Skill` tool.

Do NOT call apply mode from:
- Stage ensigns (they run as subagents without native AskUserQuestion)
- Mods (they are FO instructions, not execution vessels)
- Direct Agent dispatch (loses FO's captain context)

## Inputs

```yaml
mode: apply
entity_slug: {slug}
entity_path: docs/build-pipeline/{slug}.md
```

## Process

### Step 1: Read pending captures

Read the entity file. Find the `## Pending Knowledge Captures` section. If the section doesn't exist or is empty, return immediately with `{applied: 0, rejected: 0, modified: 0}`.

Parse all `<capture>` elements into a list.

### Step 2: Present each capture to captain

For each capture element, present via AskUserQuestion (one per message, never batched):

```
AskUserQuestion:
  question: "Knowledge capture candidate from entity {source_entity} ({source_stage} stage):

            FINDING: {finding text}

            PROPOSED TARGET: {target path}

            PROPOSED EDIT:
            {proposed_edit}

            How should I handle this?"
  options:
    - apply: "Apply as proposed (edit target file + commit)"
    - modify_target: "Apply but to a different target file"
    - reject: "Reject this capture (don't write anything)"
    - skip: "Skip for now, keep in pending for later review"
```

### Step 3: Handle captain response

**Case: apply**
1. Open target file with Read.
2. Compose the minimal Edit (old_string/new_string) that adds the proposed edit.
3. For CLAUDE.md targets, insert at the end of the most relevant section. Preserve all other content.
4. For review-lessons.md, append to the appropriate dated section.
5. Commit the change as its own commit:
   ```
   git add {target_file}
   git commit -m "docs: capture review lesson from {source_entity}"
   ```
6. Mark the `<capture>` element in the entity body as `status="applied"` (Edit the entity file to add the attribute).

**Case: modify_target**
1. Ask a secondary AskUserQuestion: "Which target? Options: project CLAUDE.md / module CLAUDE.md ({subdir}/CLAUDE.md) / review-lessons.md / user-global CLAUDE.md (rare)"
2. Use captain's choice as the new target.
3. Proceed with Edit + commit as in apply case, but using the new target.
4. For user-global target, add a secondary confirmation: "This will write to ~/.claude/CLAUDE.md affecting ALL your projects. Confirm?" Decline → fall back to project level.

**Case: reject**
1. Mark the `<capture>` element in the entity body as `status="rejected"` with captain's reason (optional follow-up question).
2. No Edit to target file; no commit.

**Case: skip**
1. Leave the `<capture>` element unchanged (still pending).
2. Continue to next capture.

### Step 4: Update entity body

After processing all captures, update the `## Pending Knowledge Captures` section:
- Keep captures marked `skipped` as the new pending list.
- Move `applied` and `rejected` captures to a `## Processed Knowledge Captures` section below for audit history.

If no captures remain (all applied/rejected), delete the Pending section entirely.

### Step 5: Final commit (entity body update)

Commit the entity body changes as a separate commit from the CLAUDE.md edits:

```
git add {entity_path}
git commit -m "chore(knowledge): process pending captures for {entity_slug}"
```

This keeps the CLAUDE.md edit commits atomic and reviewable independently.

## Return Summary

```yaml
applied: 2
rejected: 1
modified: 0
skipped: 1
commits_created: 3  # 2 CLAUDE.md edits + 1 entity body update
```

## Critical Invariants

- **Separate commits for each target file edit** — never bundle multiple CLAUDE.md edits into one commit. Each capture gets its own commit.
- **Entity body update is last** — commit CLAUDE.md edits first, then entity body. This preserves clean history if something goes wrong mid-apply.
- **Never silently apply** — every D2 write must go through AskUserQuestion. No "batch apply all" shortcut.
- **Preserve section ordering in target files** — use Edit with minimal old/new string, not Write. Unrelated sections must remain untouched.

## Error Handling

- If target file doesn't exist (e.g., no CLAUDE.md in the proposed subdirectory): present captain with options (create file / fall back to parent CLAUDE.md / skip).
- If Edit fails (old_string not found): report error to captain, mark capture as `error` status with the failure reason. Continue with next capture.
- If user cancels mid-stream (closes AskUserQuestion): preserve state (some applied, some still pending); do not rollback applied edits. Log a warning that apply was interrupted.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "apply_mode"`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/references/apply-mode.md tests/test_knowledge_capture.py
git commit -m "feat(phase-e): knowledge-capture apply-mode reference (FO-side, captain-facing)"
```

---

### Task 17: Write knowledge-capture fixtures + behavior test

**Files:**
- Create: `skills/knowledge-capture/fixtures/sample-finding.yaml`
- Create: `skills/knowledge-capture/fixtures/captain-responses.yaml`
- Create: `skills/knowledge-capture/fixtures/entity-with-pending.md`
- Test: `tests/test_knowledge_capture.py` (add fixture tests)

- [ ] **Step 1: Add failing test**

Append to `tests/test_knowledge_capture.py`:

```python
FIXTURES_DIR = SKILL_DIR / "fixtures"


def test_fixtures_directory_exists():
    assert FIXTURES_DIR.exists() and FIXTURES_DIR.is_dir()


def test_sample_finding_fixture_parses():
    sample = FIXTURES_DIR / "sample-finding.yaml"
    assert sample.exists()
    data = yaml.safe_load(sample.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "findings" in data
    assert len(data["findings"]) >= 2


def test_captain_responses_fixture_parses():
    resp = FIXTURES_DIR / "captain-responses.yaml"
    assert resp.exists()
    data = yaml.safe_load(resp.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "responses" in data


def test_entity_with_pending_fixture_has_pending_section():
    entity = FIXTURES_DIR / "entity-with-pending.md"
    assert entity.exists()
    content = entity.read_text(encoding="utf-8")
    assert "## Pending Knowledge Captures" in content
    assert "<capture" in content
```

- [ ] **Step 2: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "fixture"`
Expected: FAIL.

- [ ] **Step 3: Write fixture files**

Write `skills/knowledge-capture/fixtures/sample-finding.yaml`:

```yaml
# Sample findings for knowledge-capture capture-mode tests.
# Each finding represents the kind of raw observation a review ensign
# might pass into knowledge-capture.

findings:
  - id: f-001
    summary: "Direct React state mutation in dashboard filter"
    source_file: tools/dashboard/static/app.js
    source_line: 244
    detected_by: pr-review-toolkit:code-reviewer
    evidence: |
      // line 244-246: direct mutation
      state.filterActive = newValue;
      renderFilter();

  - id: f-002
    summary: "Trailing whitespace in config file"
    source_file: config/app.json
    source_line: 15
    detected_by: pr-review-toolkit:code-simplifier
    evidence: "trailing whitespace on line 15"

  - id: f-003
    summary: "Silent failure in WebSocket reconnection handler"
    source_file: tools/dashboard/static/ws-client.js
    source_line: 102
    detected_by: pr-review-toolkit:silent-failure-hunter
    evidence: |
      // line 102: caught but not logged
      try { this.reconnect(); } catch (e) {}
```

Write `skills/knowledge-capture/fixtures/captain-responses.yaml`:

```yaml
# Pre-recorded captain responses for knowledge-capture apply-mode tests.
# Keyed by capture ID (as written in the entity body).

responses:
  kc-1:
    action: apply
    comment: null

  kc-2:
    action: reject
    comment: "Too narrow; won't recur"

  kc-3:
    action: modify_target
    new_target: lessons
    secondary_confirmation: null
```

Write `skills/knowledge-capture/fixtures/entity-with-pending.md`:

```markdown
---
id: fixture-entity-1
title: Fixture entity with pending captures
status: review
---

# Fixture Entity 1

Used by knowledge-capture apply-mode tests.

## Pending Knowledge Captures

<capture id="kc-1" severity="HIGH" root="NEW" target="/fake/repo/tools/dashboard/CLAUDE.md">
  <finding>
  Direct React state mutation detected. Violates concurrent update semantics.
  </finding>
  <proposed_edit>
  Append to tools/dashboard/CLAUDE.md § Frontend:
  "Never mutate React state directly; use setX(prev => ...) pattern."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>tools/dashboard/static/app.js</source_file>
  <source_line>244</source_line>
  <detected_by>pr-review-toolkit:code-reviewer</detected_by>
</capture>

<capture id="kc-2" severity="MEDIUM" root="CODE" target="/fake/repo/CLAUDE.md">
  <finding>
  Missing null check in auth middleware.
  </finding>
  <proposed_edit>
  Append: "Always null-check user object in auth middleware."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>src/auth/middleware.ts</source_file>
  <source_line>42</source_line>
  <detected_by>pr-review-toolkit:silent-failure-hunter</detected_by>
</capture>

<capture id="kc-3" severity="HIGH" root="NEW" target="/fake/repo/CLAUDE.md">
  <finding>
  WebSocket reconnection catch block swallows errors.
  </finding>
  <proposed_edit>
  Append: "Never swallow exceptions in async reconnect logic; log and re-throw or retry with backoff."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>tools/dashboard/static/ws-client.js</source_file>
  <source_line>102</source_line>
  <detected_by>pr-review-toolkit:silent-failure-hunter</detected_by>
</capture>
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_knowledge_capture.py -v -k "fixture"`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/knowledge-capture/fixtures/ tests/test_knowledge_capture.py
git commit -m "test(phase-e): knowledge-capture fixtures (sample finding, captain responses, pending entity)"
```

---

### Task 18: Write workflow-index-maintainer mod

**Files:**
- Create: `mods/workflow-index-maintainer.md`
- Test: `tests/test_workflow_index.py` (add mod structural test)

- [ ] **Step 1: Add failing test**

Append to `tests/test_workflow_index.py`:

```python
MOD_FILE = REPO_ROOT / "mods" / "workflow-index-maintainer.md"


def test_workflow_index_maintainer_mod_exists():
    assert MOD_FILE.exists()


def test_mod_has_frontmatter_with_name():
    content = MOD_FILE.read_text(encoding="utf-8")
    assert content.startswith("---\n")
    fm_match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    assert fm_match
    fm = yaml.safe_load(fm_match.group(1))
    assert fm.get("name") == "workflow-index-maintainer"


def test_mod_defines_startup_and_idle_hooks():
    content = MOD_FILE.read_text(encoding="utf-8")
    assert "## Hook: startup" in content
    assert "## Hook: idle" in content


def test_mod_references_workflow_index_skill():
    content = MOD_FILE.read_text(encoding="utf-8")
    assert "workflow-index" in content
    # Must tell FO to invoke the skill
    assert "mode: write" in content or "write mode" in content
```

- [ ] **Step 2: Run test**

Run: `uv run pytest tests/test_workflow_index.py -v -k "mod"`
Expected: FAIL.

- [ ] **Step 3: Write the mod**

Write `mods/workflow-index-maintainer.md`:

```markdown
---
name: workflow-index-maintainer
description: Maintains workflow-level coherence artifacts (CONTRACTS.md, DECISIONS.md, INDEX.md) by invoking the workflow-index skill at key lifecycle points. Keeps cross-entity coherence tracking up to date without cluttering each ensign's responsibilities.
version: 0.1.0
---

# workflow-index-maintainer

This mod extends the First Officer with automatic maintenance of the `docs/build-pipeline/_index/` directory. It ensures CONTRACTS.md, DECISIONS.md, and INDEX.md stay in sync with the current workflow state without requiring each stage ensign to know about index maintenance.

## Hook: startup

On First Officer startup, verify the index artifacts are fresh and rebuild if stale.

Instructions for FO:

1. Check the modification time of `docs/build-pipeline/_index/INDEX.md`.
2. Get the most recent modification time of any entity file in `docs/build-pipeline/*.md` (exclude `_index/` and `_mods/`).
3. If any entity file is newer than INDEX.md → INDEX is stale.
4. If stale, invoke the `workflow-index` skill with:
   ```yaml
   mode: write
   operation: rebuild
   target: index
   ```
5. The skill regenerates INDEX.md from current entity frontmatter.
6. Log to captain: "Workflow index refreshed (was stale)."

If INDEX.md is up-to-date, skip the rebuild and proceed to normal FO startup flow.

## Hook: idle

When the FO is idle (no entities dispatchable), scan for stage transitions that need CONTRACTS/DECISIONS updates.

Instructions for FO:

1. List all entity files in `docs/build-pipeline/*.md`.
2. For each entity, compare its current stage (from frontmatter `status` field) against the status recorded in CONTRACTS.md for that entity.
3. If the entity has advanced (e.g., was `execute` in CONTRACTS, now `shipped` in frontmatter):
   a. Invoke `workflow-index` skill:
      ```yaml
      mode: write
      target: contracts
      operation: update-status
      entry:
        entity: {slug}
        files: {files from entity's most recent Stage Report}
        new_status: {final if shipped, in-flight otherwise}
      ```
   b. If the new stage is `shipped` and the entity has been in shipped for > 30 days, run update-status with new_status=final and age-out logic (move to Recently Retired section).

4. Scan DECISIONS.md for any decisions whose Related entities field references entities that have since shipped. If any, ensure the decision's Status reflects the latest state (no action needed unless explicit supersede was flagged).

5. Rebuild INDEX.md (always, on every idle scan — it's cheap):
   ```yaml
   mode: write
   operation: rebuild
   target: index
   ```

6. Log summary to captain: "Workflow index updated: {n} contract updates, INDEX rebuilt."

## Rules

- **Never modify entity frontmatter from this mod.** The mod only reads entity state and writes to `_index/` files.
- **Workflow-index skill is the only writer.** This mod never directly edits CONTRACTS/DECISIONS/INDEX files; it always goes through the skill to preserve format invariants.
- **Separate commits per mod operation.** Each write operation commits independently with a `chore(index):` prefix.
- **Graceful on first run.** If `_index/` directory or files don't exist yet, the skill's write mode handles creation.
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/test_workflow_index.py -v -k "mod"`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mods/workflow-index-maintainer.md tests/test_workflow_index.py
git commit -m "feat(phase-e): workflow-index-maintainer mod (startup + idle hooks)"
```

---

### Task 19: Update FO shared-core with pending capture detection step

**Important plan correction (2026-04-11)**: Original Task 19 targeted `skills/first-officer/SKILL.md` with a "step 6.5" insertion. That was wrong — `skills/first-officer/SKILL.md` is a thin launcher (13 lines) that reads three reference files. The actual dispatch lifecycle lives in `references/first-officer-shared-core.md`, which has a "Completion and Gates" section with numbered steps 1, 2, 3, 3.5, 4 covering what FO does after a worker completes. The pending capture detection logically fits between step 3.5 (completion event emission) and step 4 (gate check) — call it **step 3.6**.

**Files:**
- Modify: `references/first-officer-shared-core.md`
- Test: `tests/test_fo_pending_capture_step.py`

- [ ] **Step 1: Inspect current shared-core structure**

```bash
sed -n '201,225p' references/first-officer-shared-core.md
```

Expected: see the "## Completion and Gates" section with steps 1, 2, 3, 3.5, 4 (gate check), then the unnumbered "If the stage is not gated" / "If the stage is gated" branches.

- [ ] **Step 2: Write the failing test**

Create `tests/test_fo_pending_capture_step.py`:

```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# ///
# ABOUTME: Verifies references/first-officer-shared-core.md includes pending capture detection step.
# ABOUTME: This is the Phase E additive update that integrates knowledge-capture apply mode.

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FO_SHARED_CORE = REPO_ROOT / "references" / "first-officer-shared-core.md"


def test_fo_shared_core_file_exists():
    assert FO_SHARED_CORE.exists()


def test_fo_shared_core_has_pending_capture_detection():
    content = FO_SHARED_CORE.read_text(encoding="utf-8")
    # Phase E update markers
    assert "Pending Knowledge Captures" in content, (
        "FO shared-core missing pending capture detection step"
    )
    assert "knowledge-capture" in content, (
        "FO shared-core does not reference knowledge-capture skill"
    )
    assert "apply" in content.lower(), (
        "FO shared-core does not invoke knowledge-capture apply mode"
    )


def test_fo_shared_core_preserves_existing_structure():
    """Ensure existing FO shared-core functionality is not accidentally removed."""
    content = FO_SHARED_CORE.read_text(encoding="utf-8")
    # Core sections that must still be present
    assert "## Startup" in content
    assert "## Dispatch" in content
    assert "## Completion and Gates" in content
    assert "## Feedback Rejection Flow" in content
    assert "## Merge and Cleanup" in content
    assert "## Mod Hook Convention" in content
```

- [ ] **Step 3: Run test to see it fail**

Run: `uv run pytest tests/test_fo_pending_capture_step.py -v`
Expected: FAIL on `test_fo_shared_core_has_pending_capture_detection` (the other two tests should already pass because the file and sections exist).

- [ ] **Step 4: Add step 3.6 to shared-core "Completion and Gates"**

The "Completion and Gates" section currently reads (at the top):

```
## Completion and Gates

When a worker completes:

1. Read the entity file.
2. Review the `## Stage Report` section against the checklist. Every dispatched checklist item must be represented as DONE, SKIPPED, or FAILED.
3. If checklist items are missing, send the worker back once to repair the report.
3.5. Emit completion event with the checklist count summary as detail (skip if dashboard not running).
4. Check whether the completed stage is gated.
```

Use Edit with this exact `old_string` and `new_string`:

**old_string**:
```
3.5. Emit completion event with the checklist count summary as detail (skip if dashboard not running).
4. Check whether the completed stage is gated.
```

**new_string**:
```
3.5. Emit completion event with the checklist count summary as detail (skip if dashboard not running).
3.6. Process pending knowledge captures (Phase E addition):
   - Scan the entity file for a `## Pending Knowledge Captures` section containing `<capture>` elements.
   - If the section exists and is non-empty, invoke the `knowledge-capture` skill via the Skill tool with `mode: apply`, `entity_slug: {current slug}`, `entity_path: {entity file path}`.
   - Follow the skill's apply-mode instructions (see `skills/knowledge-capture/references/apply-mode.md`). AskUserQuestion calls inside the skill run in FO's `--agent` context where native UI works.
   - If the section is absent or empty, proceed immediately to step 4.
   - Rationale: stage ensigns cannot use AskUserQuestion themselves (they run as subagents). By staging D2 candidates in the entity body and having FO process them at completion time, we preserve the "captain-facing flows only happen in --agent context" invariant without adding a separate captain-gated stage.
4. Check whether the completed stage is gated.
```

This is a minimal additive edit — it inserts exactly one new numbered step (3.6) and leaves all surrounding content untouched.

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_fo_pending_capture_step.py -v`
Expected: All 3 tests PASS.

- [ ] **Step 6: Run full FO-related test suite to check for regressions**

Run: `uv run pytest tests/ -v -k "first_officer or merge_hook"`
Expected: All previously passing tests still pass (no regression).

- [ ] **Step 7: Commit**

```bash
git add references/first-officer-shared-core.md tests/test_fo_pending_capture_step.py
git commit -m "feat(phase-e): FO shared-core step 3.6 — pending knowledge capture detection"
```

---

### Task 20: Run full test suite + kc-plugin-forge audit + Stage Report

**Files:**
- Update: (none, validation step)

- [ ] **Step 1: Run full Python test suite**

Run: `uv run pytest tests/ -v`
Expected: All tests pass. Specifically:
- `test_workflow_index.py`: all workflow-index tests
- `test_knowledge_capture.py`: all knowledge-capture tests
- `test_fo_pending_capture_step.py`: FO update tests
- All pre-existing tests (test_merge_hook_guardrail, test_gate_guardrail, etc.) still pass

If any pre-existing test fails, investigate — it means the FO skill update caused a regression.

- [ ] **Step 2: Run kc-plugin-forge audit on new skills**

Invoke via Skill tool: `kc-plugin-forge` with route `audit` against `skills/workflow-index/`.

Expected output: audit report with no structural issues (frontmatter valid, references exist, naming consistent).

Repeat for `skills/knowledge-capture/`.

If audit reports issues, fix them inline and re-run until clean.

- [ ] **Step 3: Run kc-plugin-forge verify-agents**

Invoke via Skill tool: `kc-plugin-forge` with route `verify-agents`.

Expected: all existing agents (first-officer, ensign, science-officer) still pass verification. Plan 1 does not add new agents, so this is a regression check.

- [ ] **Step 4: Write Phase E Plan 1 Stage Report**

Create `docs/superpowers/plans/2026-04-11-phase-e-plan-1-foundation-stage-report.md`:

```markdown
# Phase E Plan 1 — Foundation Stage Report

**Date**: {YYYY-MM-DD}
**Plan**: docs/superpowers/plans/2026-04-11-phase-e-plan-1-foundation.md
**Commit range**: {first-task-sha}..{last-task-sha}

## Tasks Completed

- [x] 1. Create `_index/` directory with empty CONTRACTS/DECISIONS/INDEX
- [x] 2. workflow-index skill frontmatter and entry point
- [x] 3. workflow-index contracts-format reference
- [x] 4. workflow-index decisions-format reference (supersede semantics)
- [x] 5. workflow-index read-mode reference
- [x] 6. workflow-index write-mode reference
- [x] 7. workflow-index check-mode reference (plan-checker Dim 7)
- [x] 8. workflow-index test fixture
- [x] 9. workflow-index read-mode behavior test
- [x] 10. workflow-index decisions supersede filter behavior test
- [x] 11. knowledge-capture skill frontmatter and two-mode entry point
- [x] 12. knowledge-capture classifier reference
- [x] 13. knowledge-capture gates reference (severity + 3Q)
- [x] 14. knowledge-capture targets reference (multi-level CLAUDE.md)
- [x] 15. knowledge-capture capture-mode reference
- [x] 16. knowledge-capture apply-mode reference
- [x] 17. knowledge-capture fixtures (findings, captain responses, pending entity)
- [x] 18. workflow-index-maintainer mod (startup + idle hooks)
- [x] 19. FO shared-core step 3.6 (pending knowledge capture detection) in `references/first-officer-shared-core.md`
- [x] 20. Full test suite + kc-plugin-forge audit + Stage Report

## Deliverables

### New skills
- `skills/workflow-index/` (SKILL.md + 5 references)
- `skills/knowledge-capture/` (SKILL.md + 5 references + 3 fixtures)

### New mod
- `mods/workflow-index-maintainer.md`

### Updated reference
- `references/first-officer-shared-core.md` (additive step 3.6 in "Completion and Gates")

### Initial production artifacts
- `docs/build-pipeline/_index/CONTRACTS.md` (empty shell)
- `docs/build-pipeline/_index/DECISIONS.md` (empty shell)
- `docs/build-pipeline/_index/INDEX.md` (empty shell)

### Tests
- `tests/test_workflow_index.py`
- `tests/test_knowledge_capture.py`
- `tests/test_fo_pending_capture_step.py`
- `tests/fixtures/workflow-index-fixture/` (seed data)

## Validation

- [x] All Python tests pass (from repo root via `uv run pytest tests/`)
- [x] kc-plugin-forge audit clean on workflow-index and knowledge-capture skills
- [x] kc-plugin-forge verify-agents still passes (no regression)
- [x] Phase D tests continue to pass (merge-hook, gate-guardrail, etc.)

## Deviations

Record any deviations from the plan here:

- {Task N}: {deviation reason} — {decision}

## Next

Phase E Plan 2 (Plan Stage: researcher agent + build-research + build-plan) is unblocked. Plan 2 can now depend on:
- `workflow-index` skill for plan-checker Dimension 7 (Cross-Entity Coherence)
- `knowledge-capture` skill for D2 findings staging from build-research and build-plan
- FO shared-core step 3.6 for processing any D2 captures after each stage completes

Phase E Plan 1 complete.
```

- [ ] **Step 5: Commit Stage Report**

```bash
git add docs/superpowers/plans/2026-04-11-phase-e-plan-1-foundation-stage-report.md
git commit -m "milestone(phase-e): Plan 1 Foundation complete"
```

- [ ] **Step 6: Verify branch state**

```bash
git log --oneline -25
git status
```

Expected: clean working tree, recent commits matching the 20 tasks, HEAD on main (or the branch Plan 1 was executed on).

---

## Self-Review

**1. Spec coverage:** Every Plan 1 scope item from the Phase E spec is addressed:
- ✅ `spacebridge:workflow-index` (registered here as `spacedock:workflow-index` per namespace decision)
- ✅ `mods/workflow-index-maintainer.md`
- ✅ `spacebridge:knowledge-capture` (registered here as `spacedock:knowledge-capture`) with two-mode structure
- ✅ FO shared-core step 3.6 additive update (in `references/first-officer-shared-core.md`)
- ✅ Initial `_index/` directory

**2. Placeholder scan:** Each task has concrete file paths, concrete SKILL.md content, concrete Python test code, and concrete commit messages. No "TBD", no "add appropriate", no "similar to Task N". Fixture content is written out in full.

**3. Type consistency:** The schema for `RawFinding` in classifier.md matches the schema in capture-mode.md (`id`, `summary`, `source_file`, `source_line`, `detected_by`, `evidence`). The `<capture>` element attributes in capture-mode.md match the test assertions in test_knowledge_capture.py. The workflow-index mode names (read/write/check) are consistent across SKILL.md, reference files, and the mod's instructions.

**4. Namespace consistency:** All skills use `skills/workflow-index/` and `skills/knowledge-capture/` paths (spacedock namespace) per the namespace decision in the plan header. Phase F will rename; Phase E Plan 1 keeps it simple.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-11-phase-e-plan-1-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, two-stage review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
