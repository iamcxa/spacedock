---
id: 062
title: Use "the captain" as literal role name, not a template variable
status: done
source: CL
started:
completed: 2026-03-27T22:30:00Z
verdict: REJECTED
score: 0.80
worktree:
issue: "#3"
pr:
---

The first-officer template uses `__CAPTAIN__` as a template variable that gets substituted with the human's name (e.g., "CL") at commission/refit time. But in most places it appears, the template means "the captain" as a role — "report to the captain", "ask the captain", "only the captain can approve". The role name should be literal, not substituted.

After refit, "report to __CAPTAIN__" becomes "report to CL", which is:
1. Not portable — another user gets addressed as "CL"
2. Loses the hierarchical framing — "report to the captain" carries authority that "report to CL" doesn't
3. Inconsistent — sometimes the role is meant, sometimes the actual person

## Proposed fix

Remove `__CAPTAIN__` from the first-officer template entirely. Replace all occurrences with the literal string "the captain" (or "CL" where the commission skill should inject the actual user address — but audit first, there may be zero places where the actual name is needed).

The commission skill's `__CAPTAIN__` sed substitution can be removed if no template uses it.

Audit all templates (first-officer, ensign, pr-lieutenant) and the commission/refit skills for `__CAPTAIN__` usage.

## Acceptance criteria

1. The first-officer template uses "the captain" literally — no `__CAPTAIN__` variable
2. The ensign and pr-lieutenant templates use "the captain" literally where applicable
3. The commission skill no longer substitutes `__CAPTAIN__` (or only does so if a specific addressed-by-name use case is identified)
4. Refit produces the same result — "the captain" in the generated agent files
5. GitHub issue #3 is resolved
