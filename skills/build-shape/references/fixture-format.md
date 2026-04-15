# build-shape -- Smoke-Test Fixture Format

## Overview

build-shape smoke-test fixtures follow the kc-plugin-forge smoke-test schema.
Reference implementation: `/Users/kent/.claude/plugins/local/kc-plugin-forge/smoke-tests/kc-plugin-forge.smoke.yaml`

Fixtures live under `skills/build-shape/smoke-tests/` and are consumed by
`kc-plugin-forge` during the RED-to-GREEN validation cycle.

---

## Required Fields

| Field        | Type    | Notes                                      |
|--------------|---------|--------------------------------------------|
| `skill`      | string  | Skill identifier, e.g. `spacedock:build-shape` |
| `trigger`    | string  | Directive text passed verbatim as stdin/arg |
| `timeout`    | integer | Seconds; default is `120` when omitted     |
| `assertions` | list    | One or more assertion objects (see below)  |

---

## Assertion Forms (v1)

v1 supports two assertion forms only -- no regex.

```yaml
assertions:
  - contains: "problem statement"       # output must include this literal string
  - not_contains: "hallucinated scope"  # output must NOT include this literal string
```

`regex` and `json_path` assertion forms are deferred to v2.

---

## trigger Field Handling

The `trigger` value is the raw directive text the captain would supply.
kc-plugin-forge passes it verbatim as stdin or as the first argument to the
skill invocation -- no escaping or templating is applied.

Example:

```yaml
trigger: |
  We need a way for users to export their activity feed as a CSV file.
  The export should respect the current date filter.
```

---

## RED-to-GREEN Iteration Flow

1. **RED** -- Skill absent (or skeleton only). Run `kc-plugin-forge` against the
   fixture. Assertions fail, exit code non-zero. This confirms the fixture is
   non-vacuous and tests real behavior.

2. **GREEN** -- Skill implemented. Run `kc-plugin-forge` again. All assertions
   pass, exit code zero.

3. **Assertion tuning** -- Only in the GREEN cycle. Tighten or broaden
   `contains` / `not_contains` strings to match actual skill output. Do NOT
   change the schema or add new assertion forms during tuning.

Schema changes (new fields, new assertion types) require a separate fixture
version bump and a corresponding kc-plugin-forge engine PR -- they are never
done inline during assertion tuning.

---

## Fixture Naming Convention

```
build-shape-f{N}-{size}-{flavor}.smoke.yaml
```

| Segment   | Description                                      |
|-----------|--------------------------------------------------|
| `f{N}`    | Fixture number, zero-padded (f1, f2, ...)        |
| `{size}`  | Directive complexity: `small`, `medium`, `large` |
| `{flavor}`| Scenario label, lowercase-hyphenated             |

Examples:

```
build-shape-f1-small-csv-export.smoke.yaml
build-shape-f2-medium-auth-redesign.smoke.yaml
build-shape-f3-large-multi-tenant.smoke.yaml
```

---

## Minimal Fixture Example

```yaml
skill: spacedock:build-shape
trigger: |
  Users need to export their activity feed as a CSV file with date filtering.
timeout: 120
assertions:
  - contains: "problem statement"
  - contains: "In scope"
  - contains: "Out of scope"
  - not_contains: "I cannot"
```
