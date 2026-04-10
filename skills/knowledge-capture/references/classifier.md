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
