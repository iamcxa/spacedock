---
id: 096
title: "Biome lint + Husky precommit hooks for spacebridge"
status: clarify
context_status: ready
source: captain (2026-04-14)
created: 2026-04-14T18:00:00+08:00
started:
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
