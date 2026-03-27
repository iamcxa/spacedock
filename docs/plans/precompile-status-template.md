---
id: 055
title: Ship pre-compiled status template instead of LLM-materialized stub
status: implementation
source: CL
started: 2026-03-27T07:45:00Z
completed:
verdict:
score:
worktree: .worktrees/ensign-precompile-status
---

The status template (`templates/status`) is a stub that prints "Not compiled" and exits. During commission, the LLM materializes it by reading the description header and generating a Python implementation. This wastes tokens regenerating the same logic every time.

## Fix

Replace the stub with the working implementation from `docs/plans/status` (the live materialized version), parameterized for sed substitution. Remove the materialization step from the commission skill.

## What changes

1. `templates/status` — replace stub body with working Python, keeping `{spacedock_version}`, `{entity_label}`, and stage list as sed variables
2. `skills/commission/SKILL.md` — remove the materialization step (step 5 in section 2b) since the template is already compiled
3. `tests/test_status_script.py` — update to test against the template (with variables substituted) rather than the live instance, so CI can run without a commissioned pipeline

## Acceptance Criteria

- [ ] `templates/status` contains a working Python implementation (not a stub)
- [ ] Commission skill no longer asks the LLM to materialize the status script
- [ ] `python3 -m unittest tests.test_status_script` passes against the template with test variables substituted
- [ ] Existing `docs/plans/status` continues to work (no regression)

## Stage Report: implementation

- [x] `templates/status` contains a working Python implementation with template variables (not a stub)
  Full implementation from docs/plans/status ported to template with {spacedock_version}, {entity_label}, and stage list variables
- [x] Commission skill no longer has a materialization step for the status script
  Removed step 5 from section 2b in skills/commission/SKILL.md; steps now end at "Make it executable"
- [x] `tests/test_status_script.py` tests against the template with substituted variables
  Tests use build_status_script() helper that seds template variables before running; no dependency on docs/plans/status
- [x] All 22 unit tests pass
  Ran python3 -m unittest tests.test_status_script -v: 22 tests, all OK
- [x] All changes committed
  Commit eacd057 on ensign/precompile-status branch

### Summary

Replaced the stub body in `templates/status` with the full working Python implementation, keeping `{spacedock_version}`, `{entity_label}`, and `{stage1}, {stage2}, ..., {last_stage}` as template variables for sed substitution at commission time. Removed the LLM materialization step (step 5) from the commission skill's section 2b. Updated tests to build a runnable script from the template via variable substitution rather than pointing at the live `docs/plans/status` instance.
