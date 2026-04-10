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
