---
id: 096
title: "Biome lint + Husky precommit hooks for spacebridge"
status: draft
context_status: pending
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

## Notes

### Spacebridge Stack Context

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui -- at `spacebridge/ui/`
- **Backend/Domain**: TypeScript with Drizzle ORM, fmodel CQRS pattern -- at `spacebridge/src/`
- **Runtime**: Bun (package manager + test runner + bundler)
- **Existing lint**: check what's currently configured (may have eslint from Next.js scaffolding)

### Key Decisions for Brainstorm

1. **Biome vs ESLint**: Biome as full replacement or alongside ESLint? (Biome covers lint + format in one tool, much faster than ESLint + Prettier)
2. **Scope of tsc in precommit**: Full `tsc --noEmit` vs incremental `tsc --noEmit --incremental`? Full is safer but slower.
3. **Test in precommit**: Run affected tests (`bun test --changed`) or defer to CI? Fast precommit = lint + format + typecheck only.
4. **Biome config location**: Root `biome.json` at `spacebridge/` or separate configs per subdirectory?
