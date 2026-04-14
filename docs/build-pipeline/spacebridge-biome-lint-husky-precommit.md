---
id: 096
title: "Biome lint + Husky precommit hooks for spacebridge"
status: plan
context_status: ready
source: captain (2026-04-14)
created: 2026-04-14T18:00:00+08:00
started: 2026-04-14T17:30:00+08:00
worktree: .worktrees/spacedock-ensign-spacebridge-biome-lint-husky-precommit
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> Set up Biome as the linter/formatter and Husky + lint-staged as the precommit hook system for the entire spacebridge project (frontend Next.js app at `spacebridge/ui/` AND backend/domain code at `spacebridge/src/`). Biome replaces or supplements the current linting setup. Husky precommit hooks should run Biome lint + format check on staged files only (via lint-staged), plus type-check (`tsc --noEmit`) on affected files. The goal is fast feedback at commit time -- lint and format errors caught before they enter the pipeline.
>
> Scope: entire spacebridge directory (not spacedock engine or tools/dashboard). Configuration lives at the spacebridge root level. Must work with Bun as the package manager/runtime.

## Captain Context Snapshot

- **Repo**: main @ 83752a6
- **Session**: FO startup, captain requested biome + husky setup
- **Domain**: Tooling/DX
- **Related entities**: 054 -- Entity detail page (shipped) -- recent spacebridge work that would benefit from lint. 053 -- War room (shipped) -- established the Next.js + Bun + Tailwind stack.
- **Created**: 2026-04-14T18:00:00+08:00

## Brainstorming Spec

**APPROACH**: Install Biome as the sole linter/formatter for spacebridge (no ESLint — no existing config to preserve). Configure a single `spacebridge/biome.json` covering both `ui/` (Next.js React) and `src/` (plain TypeScript). Install Husky via `bunx husky init` at the spacebridge root, configure lint-staged in `spacebridge/package.json` to run `biome check --staged` (lint + format in one pass) on staged `.ts`/`.tsx`/`.js` files. Add `tsc --noEmit` as a separate precommit step for type-checking. No tests in precommit — defer to CI/quality stage for fast commit feedback. Add `biome:check` and `biome:fix` scripts to `spacebridge/ui/package.json` for manual invocation.

**ALTERNATIVE**: Add ESLint with `eslint-config-next` alongside Biome (Biome for format, ESLint for Next.js-specific lint rules). -- D-01 Rejected: no existing ESLint config to preserve (grep returns 0 eslint config files), Biome covers lint + format in one tool with 10-100x speed advantage over ESLint + Prettier, and Biome already supports JSX/TSX with React-specific rules.

**GUARDRAILS**:
- Scope strictly limited to `spacebridge/` — do NOT touch spacedock engine, `tools/dashboard/`, or repo root config
- Must work with Bun as package manager (`bun add -D`, `bunx husky init`, not npm/yarn)
- Biome config must handle both Next.js React JSX (`spacebridge/ui/`) and plain TypeScript (`spacebridge/src/`) in one config
- Precommit must be fast (<5s) — lint + format + typecheck only, no tests

**RATIONALE**: Biome is the correct choice for a greenfield setup — no existing ESLint config to migrate, Biome is orders of magnitude faster, and covers both lint and format in a single binary. A single `biome.json` at the spacebridge root avoids config duplication between ui/ and src/. Husky + lint-staged is the standard precommit solution that works with Bun. Excluding tests from precommit keeps commit friction low — the pipeline's quality stage handles comprehensive testing.

## Acceptance Criteria

- `spacebridge/biome.json` exists with lint + format rules covering `.ts`, `.tsx`, `.js` files (how to verify: `cat spacebridge/biome.json` parses as valid JSON with `linter` and `formatter` sections)
- Husky is initialized at spacebridge root with a precommit hook that runs lint-staged (how to verify: `.husky/pre-commit` exists and contains `lint-staged` or `bunx lint-staged`)
- lint-staged config runs `biome check --staged` on staged TypeScript/JavaScript files (how to verify: `grep -r "biome" spacebridge/package.json` or `spacebridge/.lintstagedrc`)
- `tsc --noEmit` runs as part of the precommit flow (how to verify: precommit hook or lint-staged config includes tsc)
- A deliberately malformatted file is caught by precommit and blocks the commit (how to verify: create a file with bad formatting, `git add` it, attempt `git commit`, observe precommit failure)

## Notes (Captain Context)

### Spacebridge Stack Context

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui -- at `spacebridge/ui/`
- **Backend/Domain**: TypeScript with Drizzle ORM, fmodel CQRS pattern -- at `spacebridge/src/`
- **Runtime**: Bun (package manager + test runner + bundler)
- **Existing lint**: NONE — no ESLint config, no Biome config, no Prettier config. Clean slate.

## Assumptions

A-1: No existing linter/formatter config exists in spacebridge — clean slate installation.
Confidence: 🟢 Confident (0.95)
Evidence: `glob spacebridge/**/eslint*` returns only bundled Next.js file in node_modules; no `biome.json`, no `.prettierrc`, no `.eslintrc` found. `spacebridge/ui/package.json` has no lint/format scripts.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: Bun supports Husky initialization via `bunx husky init` and lint-staged execution.
Confidence: 🟡 Likely (0.75)
Evidence: Bun documentation claims npm package compatibility; Husky v9+ uses a simple shell script approach that is runtime-agnostic. No spacedock codebase precedent to confirm.
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Biome supports Next.js 16 + React 19 JSX/TSX out of the box.
Confidence: 🟡 Likely (0.75)
Evidence: Biome docs claim React/JSX support; no spacedock codebase precedent. Next.js 16 is very new — potential edge cases with App Router patterns.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Single `biome.json` at `spacebridge/` can cover both `ui/` and `src/` without subdirectory configs.
Confidence: 🟢 Confident (0.85)
Evidence: Biome's `include`/`exclude` patterns support directory scoping in a single config file. Common pattern in monorepo setups.
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Husky `.husky/` lives at repo root (git root) with a conditional pre-commit that checks staged files for `spacebridge/` paths before running lint. Non-spacebridge commits have zero hook overhead.
Confidence: 🟢 Confident (0.90)
Evidence: Husky requires `.husky/` at git root; conditional check via `git diff --cached --name-only | grep '^spacebridge/'` is standard shell pattern for monorepo hooks.
→ Confirmed: captain, 2026-04-14 (interactive)

## Option Comparisons

(none -- approach is clear, captain pre-identified decisions in Notes resolve to single path)

## Open Questions

(none from explore)

Q-1: Husky initializes at git root but spacebridge is a subdirectory. How to scope precommit hooks?

Domain: Tooling/DX
Why it matters: Without scoping, every commit (including engine-only or docs-only) triggers spacebridge lint. With scoping, only commits touching spacebridge files trigger the hook.
Suggested options: (a) Repo root + conditional check; (b) Repo root + always run; (c) core.hooksPath

→ Answer: Repo root + conditional check -- .husky/pre-commit at git root, script checks if staged files contain spacebridge/ paths before running cd spacebridge && bunx lint-staged. Zero overhead for non-spacebridge commits. (captain, 2026-04-14, interactive)

## Decomposition Recommendation

Not warranted. Small entity, 3-4 config files to create, no complex logic.

## Canonical References

- `spacebridge/ui/package.json` -- current scripts and dependencies (no lint scripts)
- `spacebridge/package.json` -- root package.json (lint-staged config target)

## Stage Report: explore

- [x] Files mapped: 3 across config targets
  spacebridge/biome.json (to create), spacebridge/package.json (lint-staged config), spacebridge/ui/package.json (scripts + existing deps)
- [x] Assumptions formed: 4 (Confident: 2, Likely: 2, Unclear: 0)
  A-1 clean slate (0.95), A-2 Bun+Husky compat (0.75), A-3 Biome+Next16 compat (0.75), A-4 single config (0.85)
- [x] Options surfaced: 0
  Captain pre-identified decisions resolve to single path
- [x] Questions generated: 0
  All resolved by codebase analysis
- [x] α markers resolved: 0 / 0
  No α markers
- [x] Scale assessment: Small confirmed
  3-4 config files to create/modify
- [x] Research dispatched: 0 researchers (skipped -- A-2 and A-3 are external tech claims but Likely confidence, could warrant research in a larger entity; accepted as-is for Small scope)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- Small infra entity
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  Evidence verified same session
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-4 confirmed via batch; A-5 confirmed interactive (Husky path at repo root + conditional)
- [x] Options selected: 0 / 0
  No option comparisons
- [x] Questions answered: 1 / 1
  Q-1 Husky hooks at repo root with conditional spacebridge/ check
- [x] Open exploration: 1 gray area surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 1 via captain selection)
  Husky subdirectory scoping (Q-1, A-5)
- [x] Canonical refs added: 0
  2 refs already populated from explore
- [x] Context status: ready
  gate passed: all assumptions confirmed, all Qs answered. Ready for FO execution.
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 096" to advance
- [x] Clarify duration: 3 questions asked, session complete
  1 batch confirmation + 2 exploration iterations

## Research Findings

### Upstream Constraints

- Two tsconfigs govern spacebridge TypeScript:
  - `spacebridge/tsconfig.json` -- includes `src/**/*.ts`, `bin/**/*.ts`; has `outDir: dist`, does NOT set `noEmit` (spacebridge/tsconfig.json:1-15)
  - `spacebridge/ui/tsconfig.json` -- includes `**/*.ts`, `**/*.tsx`, `next-env.d.ts`, `.next/types/**/*.ts`; sets `noEmit: true` already (spacebridge/ui/tsconfig.json:1-42)
- No root `package.json` at repo root -- Husky/lint-staged deps must go in `spacebridge/package.json`
- No project-level CLAUDE.md with lint/format constraints
- CONTRACTS.md has `spacebridge/package.json` entries from 2 other entities (both `planned` status, no `in-flight` conflicts)
- CONTRACTS.md has `spacebridge/ui/package.json` entry from 1 entity (`planned` status, no conflict)

### Existing Patterns

- No linting/formatting infrastructure exists anywhere in the repo. Zero config files for ESLint, Biome, Prettier. Confirmed by glob of `spacebridge/**/eslint*`, `spacebridge/**/biome*`, `spacebridge/**/.prettierrc`.
- `spacebridge/ui/package.json` has `dev`, `build`, `start` scripts only -- no `lint` or `format` scripts (spacebridge/ui/package.json:6-9)
- `spacebridge/package.json` has zero scripts section (spacebridge/package.json:1-14)

### Library/API Surface

- **Biome**: Uses `biome.json` with `$schema` field pointing to the version schema URL. Key config sections: `linter` (rules), `formatter` (indentation, line width), `organizeImports`. Supports `include`/`exclude` glob arrays at top level for directory scoping. `biome check` runs lint+format in one pass. `biome check --write` auto-fixes. `biome check --staged` operates only on git-staged files (Biome handles staged detection internally when this flag is used).
- **Husky v9+**: `bunx husky init` creates `.husky/` directory with a `pre-commit` shell script. Husky v9 switched to simple shell scripts (no `husky.sh` sourcing). The pre-commit file is a plain shell script that runs commands directly. Works with Bun -- Husky is runtime-agnostic (just shell scripts).
- **lint-staged**: Config in `package.json` under `"lint-staged"` key. Maps glob patterns to commands. When used with Biome's `--staged` flag, lint-staged passes matched filenames and Biome operates on them. Pattern: `"*.{ts,tsx,js,jsx}": ["biome check --write"]`.

### Known Gotchas

- `tsc --noEmit` must target each tsconfig separately. `spacebridge/ui/tsconfig.json` already sets `noEmit: true`, so `cd spacebridge/ui && bunx tsc` works. `spacebridge/tsconfig.json` does NOT set `noEmit`, so must pass `--noEmit` explicitly: `cd spacebridge && bunx tsc --noEmit`.
- Biome's `--staged` flag was renamed from `--apply --staged` in earlier versions. Current Biome (1.9+) uses `biome check --staged` directly.
- lint-staged passes filenames as arguments to configured commands. When using `biome check --write`, lint-staged appends the file list. This works correctly with Biome -- Biome accepts file paths as positional args.
- `.husky/` must be at git root (not subdirectory). Since `spacebridge/` is a subdirectory, the pre-commit hook must `cd spacebridge` before running lint-staged. Conditional check: `git diff --cached --name-only | grep -q '^spacebridge/'` to skip for non-spacebridge commits.

### Reference Examples

- No existing lint/format configuration in codebase to reference.
- Standard monorepo pattern: conditional pre-commit hook checks staged file paths, runs tooling only in the relevant subdirectory.

## PLAN

Goal: Set up Biome linter/formatter + Husky precommit hooks for spacebridge with zero overhead for non-spacebridge commits.

<task id="task-1" model="haiku" wave="1">
  <read_first>
    - spacebridge/package.json
  </read_first>

  <action>
  Create `spacebridge/biome.json` with the following configuration:
  - `$schema`: `"https://biomejs.dev/schemas/1.9.4/schema.json"` (latest stable)
  - `vcs.enabled`: true, `vcs.clientKind`: "git", `vcs.useIgnoreFile`: true
  - `organizeImports.enabled`: true
  - `formatter.enabled`: true, `formatter.indentStyle`: "space", `formatter.indentWidth`: 2, `formatter.lineWidth`: 100
  - `linter.enabled`: true, `linter.rules.recommended`: true
  - `files.include`: `["src/**", "ui/**/*.ts", "ui/**/*.tsx", "ui/**/*.js", "bin/**"]`
  - `files.ignore`: `["node_modules", "dist", ".next", "ui/.next", "drizzle"]`
  - `javascript.formatter.quoteStyle`: "double"

  Install Biome, Husky, and lint-staged as devDependencies:
  - Run `cd spacebridge && bun add -D @biomejs/biome husky lint-staged`

  Add scripts and lint-staged config to `spacebridge/package.json`:
  - `"scripts"` section:
    - `"lint"`: `"biome check ."`
    - `"lint:fix"`: `"biome check --write ."`
    - `"format"`: `"biome format --write ."`
    - `"format:check"`: `"biome format ."`
    - `"check"`: `"biome check ."`
    - `"prepare"`: `"husky"`
  - `"lint-staged"` section:
    ```json
    "lint-staged": {
      "*.{ts,tsx,js,jsx}": [
        "biome check --write --no-errors-on-unmatched"
      ]
    }
    ```
  </action>

  <acceptance_criteria>
    - `cat spacebridge/biome.json | python3 -m json.tool` exits 0 (valid JSON)
    - `grep "@biomejs/biome" spacebridge/package.json` finds the devDependency
    - `grep "husky" spacebridge/package.json` finds the devDependency
    - `grep "lint-staged" spacebridge/package.json` finds both the devDependency and the config
    - `grep '"check"' spacebridge/package.json` finds the check script
  </acceptance_criteria>

  <files_modified>
    - spacebridge/biome.json
    - spacebridge/package.json
    - spacebridge/bun.lock
  </files_modified>
</task>

<task id="task-2" model="haiku" wave="1">
  <read_first>
    - spacebridge/ui/package.json
  </read_first>

  <action>
  Add lint/format scripts to `spacebridge/ui/package.json` in the `scripts` section:
  - `"lint"`: `"biome check --config-path .. ."`
  - `"lint:fix"`: `"biome check --config-path .. --write ."`
  - `"format"`: `"biome format --config-path .. --write ."`
  - `"format:check"`: `"biome format --config-path .. ."`

  Note: `--config-path ..` points to `spacebridge/biome.json` from the `ui/` directory. Biome resolves config relative to `--config-path`.
  </action>

  <acceptance_criteria>
    - `grep '"lint"' spacebridge/ui/package.json` finds the lint script
    - `grep '"format"' spacebridge/ui/package.json` finds the format script
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/package.json
  </files_modified>
</task>

<task id="task-3" model="haiku" wave="2">
  <read_first>
    - spacebridge/package.json
    - spacebridge/biome.json
  </read_first>

  <action>
  Create `.husky/pre-commit` at the git root with a conditional spacebridge check.

  Create `.husky/` directory: `mkdir -p .husky`

  Write `.husky/pre-commit` with this exact content:
  ```sh
  #!/usr/bin/env sh

  # Only run for commits touching spacebridge/ files
  if git diff --cached --name-only | grep -q '^spacebridge/'; then
    cd spacebridge

    # Lint + format staged files
    bunx lint-staged

    # Type-check both projects
    bunx tsc --noEmit
    bunx tsc --noEmit -p ui/tsconfig.json
  fi
  ```

  Make the hook executable: `chmod +x .husky/pre-commit`
  </action>

  <acceptance_criteria>
    - `test -f .husky/pre-commit && echo exists` prints "exists"
    - `test -x .husky/pre-commit && echo executable` prints "executable"
    - `grep "spacebridge" .husky/pre-commit` finds the conditional check
    - `grep "lint-staged" .husky/pre-commit` finds the lint-staged invocation
    - `grep "tsc --noEmit" .husky/pre-commit` finds both type-check commands
  </acceptance_criteria>

  <files_modified>
    - .husky/pre-commit
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="3">
  <read_first>
    - spacebridge/biome.json
    - .husky/pre-commit
    - spacebridge/package.json
  </read_first>

  <action>
  Verify the full pipeline end-to-end:

  1. Run `cd spacebridge && bun run check` to verify Biome can lint+format the entire spacebridge directory without errors (or only expected warnings on existing code).

  2. Run `cd spacebridge && bunx tsc --noEmit` to verify type-check passes for spacebridge root.

  3. Run `cd spacebridge && bunx tsc --noEmit -p ui/tsconfig.json` to verify type-check passes for spacebridge/ui.

  4. If Biome reports fixable lint/format errors in existing code, run `bun run lint:fix` to auto-fix them and commit the fixes as a separate commit.

  5. If `tsc --noEmit` reports type errors, document them in the stage report but do NOT fix them (out of scope -- entity is about lint/format setup, not type fixes).
  </action>

  <acceptance_criteria>
    - `cd spacebridge && bun run check` exits 0 (or only warnings, no errors)
    - `cd spacebridge && bunx tsc --noEmit` exits 0
    - `cd spacebridge && bunx tsc --noEmit -p ui/tsconfig.json` exits 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/biome.json
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `cd spacebridge && bun run check` exits 0 -- Biome lint+format passes on the full codebase
- [ ] `cd spacebridge && bun run lint` exits 0 -- lint script works
- [ ] `cd spacebridge && bunx tsc --noEmit` exits 0 -- type-check passes for src/bin
- [ ] `cd spacebridge && bunx tsc --noEmit -p ui/tsconfig.json` exits 0 -- type-check passes for ui
- [ ] `.husky/pre-commit` exists and is executable
- [ ] Creating a deliberately malformatted `.ts` file in `spacebridge/src/`, staging it, and running `cd spacebridge && bunx lint-staged` catches the error
- [ ] Committing a file outside `spacebridge/` does not trigger any hook commands (zero overhead)

### API
None

### Interactive
- [ ] Captain confirms precommit hook catches a malformatted staged file and blocks commit

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| `spacebridge/biome.json` exists with lint + format rules covering `.ts`, `.tsx`, `.js` files | task-1 | `cat spacebridge/biome.json \| python3 -m json.tool && grep linter spacebridge/biome.json && grep formatter spacebridge/biome.json` | pending | -- |
| Husky is initialized at spacebridge root with a precommit hook that runs lint-staged | task-3 | `test -f .husky/pre-commit && grep lint-staged .husky/pre-commit` | pending | -- |
| lint-staged config runs `biome check` on staged TypeScript/JavaScript files | task-3 | `grep -A3 lint-staged spacebridge/package.json` | pending | -- |
| `tsc --noEmit` runs as part of the precommit flow | task-3 | `grep "tsc --noEmit" .husky/pre-commit` | pending | -- |
| A deliberately malformatted file is caught by precommit and blocks the commit | task-4 | `cd spacebridge && echo "const   x:string='bad'" > /tmp/test-lint.ts && bunx biome check /tmp/test-lint.ts` | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 5 append calls, covering 4 tasks and 5 files, all successful

### Step 0.5 -- Assumption Evidence Re-Validation
No assumptions had parseable file:line citations. 0 re-validations attempted. 0 contradictions.

### Plan-checker final output
```yaml
issues:
  - dimension: cross_entity_coherence
    severity: warning
    description: "spacebridge/package.json and spacebridge/ui/package.json have recent planned entries from other entities (no in-flight conflicts)"
    fix_hint: "Informational -- planned status entries do not block; execute stage should coordinate if concurrent"
```

### Dispatch Gaps
Research Findings populated via inline serial research (no FO-dispatched researchers available in this context). All 4 topics covered inline using Read/Grep/Glob.

### Checklist
- [x] Load and execute the spacedock:build-plan skill
- [x] Produce ## Research Findings with evidence-backed findings per topic
  5 subsections: Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples
- [x] Produce ## PLAN with task breakdown, wave assignments, files_modified per task, model hints
  4 tasks across 3 waves: task-1 (haiku, w1), task-2 (haiku, w1), task-3 (haiku, w2), task-4 (sonnet, w3)
- [x] Produce ## UAT Spec with testable items
  7 CLI items, 1 Interactive item, 0 Browser, 0 API
- [x] Produce ## Validation Map linking each Acceptance Criterion to plan tasks
  5 rows covering all 5 Acceptance Criteria
- [x] Run self-review + plan-checker (1 revision iteration, 0 blockers, 1 warning)
  Fixed wave overlap: task-2 scripts separated from task-1 package.json install to avoid files_modified overlap
- [x] Append to CONTRACTS.md via workflow-index skill (unconditional)
  5 files: .husky/pre-commit (new section), spacebridge/biome.json (new section), spacebridge/bun.lock (appended), spacebridge/package.json (appended), spacebridge/ui/package.json (appended)
  Commit: 5ebf65b chore(index): add contracts for entity-spacebridge-biome-lint-husky-precommit entering plan (5 files)
- [x] Write ## Stage Report: plan with all checklist items and evidence

### Commits
- 5ebf65b chore(index): add contracts for entity-spacebridge-biome-lint-husky-precommit entering plan (5 files)
- chore(plan): spacebridge-biome-lint-husky-precommit biome + husky + lint-staged setup
