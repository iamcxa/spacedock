---
id: 060
title: "Cutover — delete engine tools/dashboard/static"
status: clarify
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [059]
---

## Directive

> Once the spacebridge plugin reaches full feature parity with the old static dashboard and users have migrated, the legacy `tools/dashboard/static/*` files in the engine repo become dead code. They add maintenance burden, confuse contributors about which UI is authoritative, and bloat the engine. This entity is the final cleanup: remove the old static UI from the engine, keeping only the data-layer code that serves as the in-process default `ChannelProvider` implementation.

## Captain Context Snapshot

- **Repo**: main @ bd0e83d
- **Session**: 2026-04-11 journal — entity 060 was drafted alongside 049-059 as a spacebridge Phase F stub (commit bebe7e2) following the engine/bridge split design (commit 517d5db).
- **Domain**: Behavioral/Callable (in-process `ChannelProvider` default), Readable/Textual (docs + migration note), Organizational/Data-transforming (engine surface-area reduction)
- **Scope flag**: ⚠️ likely-decomposable (2 signals: "migrate" verb in scope + 3 domains tagged — explore should verify this stays atomic)
- **Related entities**: 059 -- Standalone directory distribution + wrapper CLI (clarify, context_status: ready); 053 -- Next.js warroom + SSE feed (plan, ready); 058 -- share tunnel rebuild (clarify, ready); 047 -- entity body rendering hotfixes (shipped)
- **Created**: 2026-04-13T14:55:00Z

## Brainstorming Spec

**APPROACH**: One atomic PR targeting clkao/spacedock upstream that (a) deletes `tools/dashboard/static/*` wholesale (✓ confirmed by explore: 14 files present in static/ at bd0e83d), (b) refactors `server.ts` (currently 9 `staticDir` references at lines 26, 51, 745, 809, 878, 1170, 1179, 1182-1183) (✓ confirmed by explore: 9 matches verified — ⚠ SCOPE EXPANSION: channel.ts has 4 additional refs at lines 61, 137, 604, 610 that also need refactoring — see A-4) so static-serving becomes opt-in — the default `ChannelProvider` runs headless (API-only), and external consumers that want a UI pass their own `staticDir` option (✓ confirmed by explore: server.ts:26 and channel.ts:61 already declare `staticDir?:` optional — backward-compatible refactor), (c) updates engine tests that assert on HTML responses to target the new headless contract or mock a `staticDir` (✓ confirmed by explore: `tools/dashboard/src/server.test.ts` has 9 staticDir setup refs; `tests/dashboard/server.test.ts` has 13 — see A-5), and (d) adds a short migration note to the engine README pointing users to the spacebridge plugin for UI. The in-process `ChannelProvider` when no `staticDir` is provided should return a JSON 404 with a `migration_guide_url` field (needs clarification -- deferred to explore -- see Q-1) on HTML-expecting routes, while preserving all `/api/*` routes unchanged.

**ALTERNATIVE**: Phased removal — ship a release that logs a deprecation warning when `staticDir` is active, wait N release cycles, then delete in a follow-up. -- D-01 Rejected because the design doc §2.4 already scheduled the deprecation phase at the *release-pipeline* level: 059 ships the new distribution channel (spacebridge plugin), users migrate during the 059-060 gap window, and 060 is specifically the final Long-term step. Running another deprecation cycle inside 060 double-gates work already gated, and bloats an upstream PR that reviewers want atomic.

**GUARDRAILS**:
- PR targets clkao/spacedock (upstream engine repo), not a Kent fork — coordination with upstream maintainer required before merge (⚠ gray area: coordination protocol undefined — see Q-3)
- Data-layer code must be preserved verbatim: `db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts` (public API surface consumed by spacebridge and any other downstream) (✓ confirmed by explore: design doc §2.4 explicit + all 6 files present in engine at bd0e83d)
- 059 (standalone directory distribution + wrapper CLI) **must be shipped** before this entity's PR opens — it is the distribution channel replacement (✓ confirmed by explore: 059 status=clarify, context_status=ready; design doc §2.4 "final cleanup PR happens after bridge reaches feature parity")
- 4 additional parity entities must be created and shipped before 060 PR opens — see A-7. Candidate slugs: `spacebridge-dependency-graph-view`, `spacebridge-workflow-visualizer`, `spacebridge-entity-body-editor`, `spacebridge-version-history`. 060 gates on all four reaching `shipped` status.
- Post-cutover engine `bun test` must pass in headless mode (no browser fixtures, no static-file 200-assertions)
- Migration note should be concise — users who followed the design-doc timeline already migrated; this is a pointer, not a tutorial
- "Users have migrated" precondition must be verifiable before PR opens — see Q-2

**RATIONALE**: Atomic deletion is cleaner than phased removal because the migration *already happened* in the 059 → 060 release window — the deprecation ritual belongs upstream in the lifecycle, not inside this entity. Keeping 060 atomic also respects upstream reviewer ergonomics: a single PR that says "delete N files, refactor one, update docs" is reviewable in one pass, whereas a phased variant forces upstream to accept a deprecation warning PR now and a deletion PR later, doubling the coordination burden for a project Kent doesn't own. The opt-in `staticDir` refactor (vs. removing the parameter entirely) also preserves optionality — if a third-party consumer wants to self-host HTML, they still can, which reduces upstream's surface-area risk in accepting the change.

## Acceptance Criteria

- Given `tools/dashboard/static/` is deleted, when `bun test` runs in the engine repo, then all tests pass with zero failures in headless mode (how to verify: `bun test` in engine checkout, assert exit code 0)
- Given the default `ChannelProvider` is constructed without a `staticDir` option, when a request hits `/` or `/detail.html`, then the response is JSON-shaped (either 404 + migration pointer, or a redirect to the spacebridge plugin docs) — NOT HTML (how to verify: `curl -sI localhost:${port}/` asserting `content-type: application/json` or 3xx redirect; `curl -s localhost:${port}/ | jq .migration_guide_url` returns non-null)
- Given the engine README after 060, when a reader searches for "spacebridge" or "migrated", then the README surfaces a migration note (how to verify: `grep -ic "spacebridge\|migrated" tools/dashboard/README.md` returns ≥1)
- Given the pre-060 data-layer API surface, when an external TypeScript consumer imports `db.ts`/`snapshots.ts`/`api.ts`/`entity-resolver.ts`/`frontmatter-io.ts`/`events.ts` after 060, then all exported type signatures are byte-identical (how to verify: `tsc --noEmit` against a consumer fixture; zero type errors; `git diff bd0e83d..HEAD -- tools/dashboard/src/{db,snapshots,api,entity-resolver,frontmatter-io,events}.ts` shows zero substantive changes)
- Given the upstream PR on clkao/spacedock is opened, when upstream CI runs, then all required checks pass (how to verify: `gh pr checks {pr_number}` shows green for all required contexts)

## References

- Design doc §2.4 (What happens to tools/dashboard/): phased removal plan (short/medium/long term)
- Upstream repo: clkao/spacedock
- Engine server refactor target: `tools/dashboard/src/server.ts` (9 `staticDir` references at lines 26, 51, 745, 809, 878, 1170, 1179, 1182-1183 as of bd0e83d)
- Engine data-layer preservation set: `db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`
- Prior-session journal entry: 2026-04-11 09-24-15-842829.md (spacebridge track, Phase F stub creation)

## Assumptions

A-1: After 060, the data-layer modules (`db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`) continue to be consumed by spacebridge via the in-process `ChannelProvider` default path. No module is deleted, renamed, or re-exported.
Confidence: 🟢 Confident (0.95)
Evidence: Design doc §2.4 explicitly states "Data-layer code (db.ts, snapshots.ts, api.ts, entity-resolver.ts, frontmatter-io.ts, events.ts) stays in the engine as the in-process default implementation." All 6 files present at `tools/dashboard/src/` as of bd0e83d. Design doc §2.2 invariant 1 reinforces: engine is headless-capable with data-layer intact.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: The `staticDir` parameter is already typed as optional in both `server.ts` and `channel.ts` — making static-serving opt-in is a default-value refactor, not a breaking API change.
Confidence: 🟢 Confident (0.95)
Evidence: `tools/dashboard/src/server.ts:26` declares `staticDir?: string`. `tools/dashboard/src/channel.ts:61` declares the same. The current default at `server.ts:51` (`opts.staticDir ?? join(dirname(import.meta.dir), "static")`) just needs to become `opts.staticDir ?? undefined` with downstream route handlers checking for presence.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: The `/share/:token` route in engine becomes non-functional after 060 (share.html is deleted). This is acceptable because entity 058 (share tunnel rebuild) moves sharing into spacebridge with its own UI.
Confidence: 🟢 Confident (0.90)
Evidence: `server.ts:1170` serves `share.html` from staticDir; `static/share.html` (5.9K) + `static/share.js` (31.9K) are part of the deletion set. Entity 058 (`spacebridge-share-tunnel-rebuild`, context_status: ready) owns the replacement path. Engine users without spacebridge lose share UX — acceptable per design doc §2.4 gate ("users have migrated").
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Both `server.ts` AND `channel.ts` need refactoring. `channel.ts` has 4 additional `staticDir` references (lines 61, 137, 604, 610) that are NOT in the brainstorm spec's file count — the refactor surface is larger than the APPROACH claimed.
Confidence: 🟢 Confident (0.95)
Evidence: `grep -n "static" tools/dashboard/src/channel.ts` returned 4 matches: line 61 `staticDir?:` option type, line 137 `staticDir: opts.staticDir` passthrough to createServer, line 604 hardcoded fallback `const staticDir = join(dirname(import.meta.dir), "static")`, line 610 `staticDir` passed into Bun.serve. channel.ts is a separate entry point (launched by `ctl.sh start --channel`) — parallel refactor required to keep behavior consistent.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Engine tests live in TWO locations — `tools/dashboard/src/server.test.ts` (572L, 9 staticDir setup refs) AND `tests/dashboard/server.test.ts` (634L, 13 staticDir setup refs). Both need updates per MEMORY.md "Test Suite Scope — Repo Root vs Tool Dir" lesson from entity 045.
Confidence: 🟢 Confident (0.95)
Evidence: Direct grep confirms both files; MEMORY.md memory file `test-suite-scope-repo-root-vs-tool-dir.md` documents the 2-location test pattern discovered during entity 045 pr-review (12 failures in `tests/dashboard/ctl.test.ts` after tools/dashboard/ bun test reported clean).
→ Confirmed: captain, 2026-04-13 (batch)

A-6: Design doc invariant 1 ("zero behavior change when no bridge present") applied to the PRE-cutover timeline (short/medium term per §2.4). Post-cutover (long term, i.e., 060), engine-only installs DO see a behavior change by design — HTML routes stop serving HTML. This is not a contradiction; it's the whole point of 060.
Confidence: 🟢 Confident (0.90)
Evidence: Design doc §2.4 explicitly sequences "Short term (through PR1): unchanged" → "Medium term: parallel" → "Long term (post Phase F cutover): deleted". The "zero behavior change" phrasing in §2.2 invariant 1 is scoped to the bridge-introduction changes themselves (interface additions, FO prompt tweaks), not to perpetual engine surface.
→ Confirmed: captain, 2026-04-13 (batch)

A-7: 060 merge is gated on 4 additional parity entities being shipped into spacebridge first. The deleted static UI included modules with no current spacebridge replacement: `dependency-graph.js` (DAG view), `visualizer.js`, `editor.js` (inline entity body editing), and `version-history.js`. Without parity, v2.0 upgrade strands users who rely on these features. Four new entities must be created and shipped before 060 opens its upstream PR.
Confidence: 🟢 Confident (0.95)
Evidence: `ls tools/dashboard/static/*.js` enumerates 9 modules; grep of 053/054/058/089 shows only 5 covered (app, detail, activity, share via `share.js`, plus 089 extending comments). The 4 missing modules were confirmed via parity check during clarify Step 4.5 open exploration loop.
→ Confirmed: captain, 2026-04-14 (interactive) -- decision: create 4 new parity entities and 060 waits for them; v2.0 cutover date pushed back accordingly.

## Option Comparisons

### O-1: Lifecycle of `staticDir` parameter — keep as opt-in vs remove entirely

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Keep `staticDir?:` parameter; change default to `undefined` (no auto-fallback to `../static`) | Backward-compatible: third-party consumers can still self-host HTML by passing their own path. Minimal diff to server.ts/channel.ts (~10 lines changed). Upstream reviewers see a conservative surface. | Slightly larger API surface to maintain forever. Documentation needs to explain "unused by default, here if you want it." | Low | ✅ Recommended |
| Remove `staticDir` parameter entirely from ServerOptions / channel.ts options | Smaller API surface. Simpler type signatures. Unambiguous: engine no longer serves static files, period. | Breaks anyone self-hosting HTML via the engine (even if no one currently does). Forces callers to fork if they want UI. Larger diff (remove parameter everywhere). Harder upstream sell ("why remove optionality?"). | Medium | Viable |

Return value trace (Behavioral/Callable): `channel.ts:137` passes `opts.staticDir` through to `createServer`. If we remove the parameter, channel.ts loses passthrough capability too. Third-party consumers using channel.ts directly lose opt-in. No internal caller in this repo actually passes `staticDir` — only test files. So removing would simplify internal code but constrain external flexibility.

Design doc invariant check: §2.2 invariant 1 says engine is "headless-capable" — it must RUN headless, not REFUSE to serve HTML. Keeping the parameter is compatible with this invariant. §2.2 invariant 3 says Next.js/SSE/etc. are "private to bridge" — this is about the NEW stack, not about removing legacy optionality.

→ Selected: Keep `staticDir?:` parameter; change default to `undefined` (captain, 2026-04-14, interactive)

### O-2: Test strategy for HTML-serving paths

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Keep HTML-serving tests (rescope them to assert the opt-in path) + add headless-default tests | Coverage of both branches (opt-in and default). Tests document the new contract explicitly. Existing tmp-static-dir setup (`mkdirSync` + `writeFileSync` in server.test.ts:32-38 and tests/dashboard/server.test.ts:32-42) already mocks a staticDir — keep that pattern. | Slightly larger test surface. Two code paths to maintain. | Low | ✅ Recommended |
| Delete all HTML-serving tests; keep only JSON/API tests | Smaller test file. Simpler maintenance. | Loses regression coverage for third-party consumers who DO pass staticDir. No assertion that the opt-in path still works. | Low | Viable |
| Delete ALL staticDir tests AND remove the parameter (combines O-2 with O-1 removal) | Maximum simplification. | Cascades the O-1 break. Not compatible with Recommended O-1 choice. | Low | Not recommended |

Return value trace: `tests/dashboard/server.test.ts:32-42` creates a tmp static dir with fake index.html, detail.html, style.css, app.js, then asserts HTTP 200 responses for GET `/`, `/detail`, `/style.css`. These tests ARE the documentation of the opt-in path. Deleting them removes the contract documentation too.

Design doc invariant check: No invariant mandates test deletion. Invariant 1 (headless-capable) is satisfied by adding new headless tests alongside the rescoped opt-in tests, not by deleting the opt-in tests.

→ Selected: Keep HTML-serving tests (rescope to opt-in path) + add headless-default tests (captain, 2026-04-14, interactive -- confirmed after second-round review of deletion costs)

## Open Questions

Q-1: When default `ChannelProvider` is constructed without a `staticDir`, what is the exact response shape for HTML-expecting routes (`/`, `/detail`, `/share/:token`, and the fallback static handler)?

Domain: Behavioral/Callable, Readable/Textual

Why it matters: The brainstorm APPROACH said "JSON 404 with a `migration_guide_url` field" but that was an α marker. The actual shape affects (a) Acceptance Criterion 2's verification command (what does `curl -s localhost:${port}/ | jq` expect), (b) how external tooling like gsd-debug or pressure tests probe a headless engine, and (c) whether upstream maintainers accept the change as "reasonable default behavior" vs "opinionated migration marketing." The four HTML-serving routes may even deserve different responses (e.g., `/` could 301-redirect to spacebridge docs; `/detail` and `/share/:token` could 404 JSON).

Suggested options:
- (a) JSON 404 with `{ error: "HTML UI removed; install spacebridge plugin", migration_guide_url: "https://github.com/kentcdodds/spacedock/blob/main/SPACEBRIDGE_MIGRATION.md" }` on all 4 routes. Uniform, discoverable via curl.
- (b) 301 redirect on `/` to spacebridge docs; JSON 404 on `/detail` and `/share/:token` (too specific to redirect meaningfully); fallback static handler returns plain 404.
- (c) Plain-text 410 Gone with one-line pointer: "Static UI removed. See: [URL]". Simplest, but not machine-readable.
- (d) Remove the routes entirely — `/`, `/detail`, `/share/:token` no longer registered, so they fall through to the default 404 fallback. Most minimal change; least helpful for human users who hit an old bookmark.

→ Answer: (a) JSON 404 with `{ error, migration_guide_url }` on all 4 HTML routes — uniform, curl/script-parseable, testable (captain, 2026-04-14, interactive)

Q-2: How is the "users have migrated" precondition verified before opening the upstream PR?

Domain: Organizational/Data-transforming

Why it matters: Design doc §2.4 gates 060 on "bridge reaches feature parity and users have migrated." Bridge feature parity is knowable (ship 053 + 054 + 058 + QA). "Users have migrated" is fuzzier — there is no telemetry in the engine, and clkao/spacedock has other users beyond Kent. Without a definition, the PR description can't argue "this is safe to merge now."

Suggested options:
- (a) Time-based: announce deprecation (e.g., CHANGELOG + README banner) N weeks before 060 PR. Merge PR after N weeks regardless of usage data. (Requires a small "announce deprecation" sub-entity before 060.)
- (b) Telemetry-based: add usage telemetry to the current static UI (route hits on `/`, `/detail.html`) for K weeks; delete when hit rate drops below threshold. (Feature addition just before deletion — awkward.)
- (c) Consensus-based: Kent + clkao discuss, agree it's time, PR opens. No formal gate. (Simplest, most honest — but doesn't scale if there are other active users.)
- (d) Release-version-gated: open PR targeting the NEXT major version release of engine (e.g., v2.0). Users who don't want the change stay on v1.x. (Uses semver as the migration signal.)

→ Answer: (d) Release-version gated — PR targets the next major release (e.g., v2.0); users who stay on v1.x keep the static UI. Semver is the migration signal. (captain, 2026-04-14, interactive)

Q-3: PR coordination protocol — who opens the upstream PR, on what timeline, and what are the acceptance criteria beyond CI green?

Domain: Organizational/Data-transforming

Why it matters: Acceptance Criterion 5 says "upstream CI passes" but that's necessary, not sufficient. Upstream maintainers (clkao) may have additional conditions: pre-review discussion issue, CHANGELOG entry format, version bump, compatibility testing, etc. Without knowing these, 060 could ship a PR that's technically correct but gets bounced for procedural reasons.

Suggested options:
- (a) Kent opens the PR directly after coordinating 1:1 with clkao (DM or issue). Informal but fast given the relationship.
- (b) Open a tracking issue on clkao/spacedock first describing the cutover plan; wait for clkao's approval comment; then open PR referencing the issue. Formal, defensible, slower.
- (c) Coordinate in a shared channel (Discord, Slack) with a proposal doc; PR after explicit green light. Async-friendly.
- (d) Bundle 060 with the engine-side interface PR from §2.2 invariant 2 (the tiny bridge-enabling changes) so one PR covers both "enable bridge" and "clean up old UI." More coherent narrative for reviewers.

→ Answer: (a) Kent opens the PR directly after coordinating 1:1 with clkao (DM or issue). Informal but fast given the relationship. (captain, 2026-04-14, interactive)

## Stage Report: explore

- [x] Files mapped: 19 across static (14 delete), server (1 modify), channel (1 modify), tests (2 modify), docs (1 modify)
  delete: tools/dashboard/static/*.{html,js,css} (14 files); modify: tools/dashboard/src/server.ts (9 refs), tools/dashboard/src/channel.ts (4 refs), tools/dashboard/src/server.test.ts (9 refs), tests/dashboard/server.test.ts (13 refs), tools/dashboard/README.md (migration note)
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 data-layer preservation (0.95, design doc §2.4 explicit), A-2 staticDir already optional (0.95, server.ts:26 + channel.ts:61), A-3 /share/:token breaks in engine-only (0.90, entity 058 owns replacement), A-4 ⚠ channel.ts refactor required alongside server.ts (0.95, 4 additional refs discovered), A-5 two test locations need updates (0.95, MEMORY.md lesson from 045), A-6 behavior change is by design post-cutover (0.90, §2.4 timeline sequencing)
- [x] Options surfaced: 2
  O-1 staticDir parameter lifecycle (keep opt-in ✅ vs remove entirely), O-2 test strategy (rescope + add headless ✅ vs delete)
- [x] Questions generated: 3
  Q-1 response shape for HTML routes without staticDir (α-1 carryover), Q-2 "users have migrated" verification gate, Q-3 PR coordination protocol with upstream
- [x] α markers resolved: 0 / 1
  α-1 (JSON 404 response shape) escalated to Q-1 — genuinely a captain design choice, not resolvable from codebase
- [x] Scale assessment: revised from Small to Medium
  Initial Small estimate undercounted: 14-file deletion + 5 modifications = 19 files touched. Scope flag present but decomposition NOT warranted — all work is a single cohesive "remove static UI surface" operation. One atomic PR remains the correct framing.
- [x] Research dispatched: 0 researchers (skipped -- all claims validated by codebase grep + design doc §2.4 + parent entity 059 decisions; no external technology involved)

## Canonical References

- `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` §2.2 (three invariants), §2.4 (What happens to tools/dashboard/) — authoritative scope gate
- `tools/dashboard/src/server.ts:26,51,745,809,878,1170,1179,1182-1183` — 9 staticDir references (A-2, A-4)
- `tools/dashboard/src/channel.ts:61,137,604,610` — 4 staticDir references (A-4)
- `tools/dashboard/src/server.test.ts:25,57,100,145,194,241,312,511,548` — 9 test setup references (A-5)
- `tests/dashboard/server.test.ts:32-42,148,498-500` — 13 test setup references (A-5)
- `tools/dashboard/src/channel.ts:1-40` — ChannelProvider class + options interface (A-2)
- `tools/dashboard/README.md:1-40` — current architecture doc (needs migration note append)
- `docs/build-pipeline/spacebridge-standalone-dir-distribution.md` (entity 059, context_status: ready) — distribution replacement path, Q-1 answer established: users run `bun spacebridge/bin/cli.ts start` (no global command)
- `docs/build-pipeline/spacebridge-share-tunnel-rebuild.md` (entity 058, context_status: ready) — replacement for /share/:token route (A-3)
- MEMORY.md: "Test Suite Scope — Repo Root vs Tool Dir" (entity 045 lesson) — mandates updating both `tools/dashboard/src/*.test.ts` and `tests/dashboard/*.test.ts` (A-5)
- Parity gap candidate entities (A-7, to be created): `spacebridge-dependency-graph-view`, `spacebridge-workflow-visualizer`, `spacebridge-entity-body-editor`, `spacebridge-version-history` — all must reach `shipped` before 060 PR opens

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Scope flag present in explore but resolved there as atomic; clarify did not revisit decomposition
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps filled in 1.5, 0 research re-validated
  All 6 A-1..A-6 evidence cites lines verified in same session (~5 min delta from explore write); no intervening commits to targeted files
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1..A-6 batch-confirmed as-is; A-7 added during open exploration loop (parity gap) and confirmed in-line
- [x] Options selected: 2 / 2
  O-1 keep `staticDir?:` parameter with default undefined (backward-compat + upstream reviewer trust); O-2 keep HTML-serving tests as opt-in contract doc + add headless default tests (after 2nd-round review of deletion costs)
- [x] Questions answered: 3 / 3 (0 deferred)
  Q-1 JSON 404 with {error, migration_guide_url} on all 4 HTML routes; Q-2 release-version gate (v2.0 target); Q-3 Kent opens PR directly after 1:1 with clkao
- [x] Open exploration: 1 gray area surfaced (1 from CONTRACTS via parity analysis, 0 from templates, 0 from directive, 0 via freeform)
  Parity check vs sibling entities 053/054/058/089 revealed 4 modules without spacebridge replacement → A-7 + GUARDRAILS gate + 4 candidate parity entities in References
- [x] Canonical refs added: 1
  Parity gap candidate entities (A-7) appended to Canonical References
- [x] Context status: ready
  Gate passed: 7 assumptions confirmed, 2 options selected, 3 questions answered, acceptance criteria α-clean
- [x] Handoff mode: loose
  No `auto_advance: true` in frontmatter; captain must say "execute 060" to FO to advance status from clarify → plan
- [x] Clarify duration: 8 AskUserQuestion calls + 1 assumption batch + 1 freeform explanation (deletion-cost Q&A)
  Plan batch(1) + O-1(1) + O-2(2, second round after captain asked "刪除有什麼壞處？") + Q-1(1) + Q-2(1) + Q-3(1) + exploration(2, parity check + Complete)
