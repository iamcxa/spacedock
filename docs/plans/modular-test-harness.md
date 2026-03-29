---
id: 078
title: Modular test harness — shared commission snapshot, reusable E2E phases
status: ideation
source: CL — test duplication observed during model variation runs
started: 2026-03-29T20:30:00Z
completed:
verdict:
score: 0.70
worktree:
---

The commission test harness and checklist E2E test duplicate the commission phase — both create a temp dir, git init, build a prompt, and run `claude -p`. They share zero code. This wastes API budget when running model variation tests (each model re-commissions from scratch).

## Problem

- `scripts/test-commission.sh` — commissions and validates structure (65 checks, ~1-2 min)
- `scripts/test-checklist-e2e.sh` — commissions again separately, then runs FO and validates behavior (9 checks, ~5-6 min)
- Running both = 2 commissions. Running E2E across 4 models = 4 commissions.
- pass/fail/cleanup helpers are duplicated across scripts.

## Proposed design

1. **Shared helpers** — extract pass/fail/cleanup/check to `scripts/test-lib.sh`, sourced by all test scripts.
2. **Commission snapshot** — `test-commission.sh` gets `--snapshot-dir <path>` to preserve the commissioned project.
3. **E2E from snapshot** — `test-checklist-e2e.sh` gets `--from-snapshot <dir>` to skip commission and run FO on an existing snapshot.
4. **Model variation workflow:**
   ```bash
   bash scripts/test-commission.sh --snapshot-dir /tmp/snapshot
   for model in haiku sonnet opus; do
     bash scripts/test-checklist-e2e.sh --from-snapshot /tmp/snapshot --model $model
   done
   ```
   One commission, N model runs on FO phase.
