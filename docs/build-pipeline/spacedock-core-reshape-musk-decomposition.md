# Musk-perspective decomposition — spacedock core reshape

**Source**: Pre-build stress test of `musk-perspective` skill dry-run (2026-04-16)
**Target problem**: `spacedock-core-reshape-workflow-as-plugin.md` (Entity 123)
**Captain's stated pain**: *「重構時程太久太花 token 成本遲遲不見效」*
**Epistemic status**: Advisory. Output from a fresh subagent given only research corpus + shape doc problem statement. Not official shape output; not replacement for captain judgment.

---

## Part 1 — Does the algorithm even apply?

Short answer: **maybe 40%.** The core constraint is social, not physical.

Routing heuristic (from `05-decisions.md`): *is the loss function physical and measurable?*

Decomposed loss function:

- **"Ship spacebridge SaaS on top of an engine"** — physical. Measurable in users, latency, $/month. Algorithm applies.
- **"Fork features become clean plugins registering via hook points"** — physical-ish. Measurable in lines of coupling, # of monkey-patches, install-from-zero time. Algorithm applies.
- **"clkao merges my upstream PRs introducing those hook points"** — social/reflexive. Loss function lives inside another human's head, on his schedule, with his aesthetic. Algorithm does **not** apply — this is the Twitter failure mode from `05-decisions.md §6`. ~80% confident this is the real bottleneck, not token cost.

When captain wrote *"重構時程太久太花 token 成本遲遲不見效"* — the token cost is a symptom. The disease is that shipping schedule is coupled to an upstream maintainer's merge queue. That's a dependency captain does not own and cannot force. **Delete that dependency from the critical path** — that's the Musk move here, and it's Step 1, not Step 4.

---

## Part 2 — Running the algorithm on the parts it fits

### Step 1 — Question requirements (which are dumb?)

Walk the shape doc line by line, demand a named human for each "must":

- **"Every fork feature must land upstream via PR before it's usable"** — dumb. Inherited from open-source etiquette, not from physics. Fork features already work in your fork. Users of spacebridge do not care which git remote the hook point lives on. **Delete.**
- **"spacebridge must be built on *vanilla upstream* spacedock"** — dumb to first order. The real requirement is *"spacebridge must be built on a spacedock that clkao-the-community keeps improving"*. Different. You can run spacebridge on `iamcxa/spacedock` indefinitely and rebase from upstream weekly — 95% of the benefit at 5% of the coordination cost. ~70% confident this is the single biggest dumb requirement in the plan.
- **"Interim shim layer"** — delete-bait. If the end state is "fork features are plugins against upstream hooks," and the interim is "shim layer bridging fork and upstream," you're building *three* things instead of two (fork, shim, final). The shim only exists to serve the upstream-PR timeline. Kill the upstream-PR-first requirement → shim evaporates.
- **"PR #54 / #55"** — apply the test: *if clkao merged them tomorrow, does a spacebridge user notice?* If no — ceremonial. Park them. If yes — keep one, kill the other.

### Step 2 — Delete

- The hook-point-extraction-as-upstream-PR-campaign, as currently scoped. Not the hook points themselves — the *ceremony around merging them upstream before shipping*.
- The interim shim layer.
- Any "manifest schema / protocol artifact" work without a running user at the end of it.
- At least one of PR #54 / #55, probably both, until spacebridge ships.

Expect to add back ~10-20%. That's fine.

### Step 3 — Simplify

What survives: **spacebridge ships against fork. Fork features stay in fork. Hook points get extracted — but into your fork first, as a clean internal API.** When the internal API has been used by spacebridge for ~4-6 weeks and proved out, *then* open the upstream PR — with a working implementation and a real consumer as evidence. That's a much stronger PR than a speculative one.

**This inverts the power dynamic with clkao.** To first order, maintainers merge PRs with production-proven implementations 5-10x faster than speculative refactors. You're not asking for permission — you're submitting evidence.

### Step 4 — Accelerate cycle time

Current cycle: "design hook → PR upstream → wait → interim shim → eventually use in spacebridge." Weeks-to-quarters, gated on someone else's inbox. Token cost high because each agent run reasons across three layers (fork / shim / upstream-target) simultaneously.

New cycle: "design hook in fork → use in spacebridge same day → rebase from upstream weekly." Cycle time drops from weeks to days. Token cost per cycle drops because reasoning surface is smaller — no shim layer to reconcile.

### Step 5 — Automate (last)

Only candidate worth automating now: weekly rebase from upstream + smoke test that spacebridge still boots against `main-of-fork + rebased-upstream`. Everything else, hand-run until shipped.

---

## Part 3 — Idiot index on the plan itself

- **Raw material**: ~6 fork features (Event Emission, Dashboard, Channel Awareness, Confidence Gate, Layered Mods, etc.) + spacebridge UI. The thing Kent-the-user actually wants.
- **Finished product in plan**: multi-stage refactor with hook extraction, upstream PR negotiation, shim layer, plugin manifest work, protocol artifacts.

**Idiot index here is ~5-10x.** Roughly 80-90% of the planned work does not move a spacebridge user one millimeter. It moves the *abstract cleanliness* of the architecture. Those are not the same loss function — and the captain, like Twitter-era Musk, may be optimizing the wrong one. **Highest-confidence finding in this whole pass.**

---

## Part 4 — Where Musk runs out

Honest limits of this methodology on this problem:

1. **clkao's merge decisions.** Nothing in the algorithm helps. Relational. Have an actual human conversation — tell him the end state, ask what shape of PR he'd accept, build trust over 2-3 small merges before the big one. **Shotwell work, not Musk work.**
2. **Open-source community legitimacy.** If spacebridge ships on fork-only indefinitely, some portion of the community reads captain as "that guy who forked and never came back." Algorithm treats this as a deletable requirement; it isn't — it's reflexive (`04-external-views §2`). Price it in.
3. **Token burn as a felt problem.** Part of captain's pain (*"遲遲不見效"*) is emotional/motivational, not technical. Algorithm is silent on morale. Captain needs visible progress for their own reasons — which is exactly why Part 5 matters more than parts 1-4.

---

## Part 5 — Next 7 days

**Smallest physics-bound thing that produces visible progress and depends on zero upstream acceptance:**

**Ship spacebridge end-to-end against `iamcxa/spacedock` as-is. By Friday.** Not a refactor. Not a hook extraction. A booting, usable spacebridge running one real workflow against the fork. No shim, no plugin manifest, no upstream PR.

### Concrete sequence

| Day | Action |
|-----|--------|
| 1-2 | Pick **one** fork feature spacebridge most needs (guess: **Event Emission**, because everything else hangs off it). Wire spacebridge to consume it directly from the fork. Hard-code the import path. It's ugly. Ship it. |
| 3-4 | Get one end-to-end flow working — captain kicks off a workflow in spacebridge UI → fork's pipeline runs → events stream back → UI renders. **Record a video.** That's the "visible progress" asset. |
| 5 | Behind the working thing, extract **one** internal interface — the Event Emission boundary — as a clean function-call surface in the fork. Not a plugin, not a hook registry yet. Just a named module that spacebridge imports. This is the seed of the eventual hook point. |
| 6-7 | Write the upstream PR for **only** that one interface, with the working spacebridge video as motivation. One PR, narrow, proven. Then stop and let it sit in clkao's queue while shipping continues. |

### Net after 7 days

- Running spacebridge
- One proven internal boundary
- One well-motivated upstream PR in flight
- Zero shim layer
- Token cost per day drops ~2-3x (reasoning across one file at a time against a running system, not three abstract layers)

### Confidence

- ~65% confident on this **specific sequencing**
- ~90% confident on the **shape** (ship against fork first, abstract second, upstream third, in that order)
- Order is load-bearing, same way Step 5 being last is load-bearing — reversing it produces the Model 3 tent.

---

## One last thing

If after all this captain still feels stuck, it's probably not the algorithm. It's probably that captain is lonely in the decision and wants someone to tell them it's OK to deprioritize the upstream-PR aesthetic.

**Consider this that permission. Ship the thing.**

---

## Provenance

- Generated by: fresh subagent, given only `musk-perspective/references/research/{01..06}.md` + shape doc problem statement
- Research corpus status at time of generation: pre-cleanup (pseudo-verbatim quotes not yet stripped; structural claims robust)
- This memo served dual purpose: (1) stress test of Musk research sufficiency for skill building, (2) real advisory output for captain's decision
- Voice check: 0/20 kill-switch patterns triggered; passed authenticity bar
