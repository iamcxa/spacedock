# Workflow Optimization Prior Art

Research into systems that optimize multi-agent workflows — not just individual
prompts, but the orchestration layer: how agents are coordinated, what steps
they follow, how rejection/retry flows work, how work is decomposed across
stages.

## AFlow — Automating Agentic Workflow Generation (ICLR 2025 Oral)

Uses Monte Carlo tree search to explore different workflow topologies and agent
coordination patterns in a code-represented workflow space.

- **Nodes**: Basic LLM invocation units
- **Operators**: Predefined combinations (Generate, Format, Review, Revise,
  Ensemble, Test, Programmer) to accelerate search
- **Search**: Soft mixed-probability selection for node exploration, LLM-driven
  node expansion, execution evaluation, backpropagation of experience
- **Results**: 5.7% average improvement over SOTA across 6 benchmarks; enables
  smaller models to outperform GPT-4o at 4.55% of its inference cost
- **Key insight**: Automatically discovers effective workflow structures

Automated but opaque — MCTS finds a workflow graph that scores well but doesn't
explain why that topology works. Knowledge doesn't transfer across problems.

- Paper: https://arxiv.org/pdf/2410.10762
- Code: https://github.com/FoundationAgents/AFlow

## MaAS — Multi-Agent Architecture Search (ICML 2025 Oral)

Neural architecture search adapted for agent teams.

- Learns a probabilistic distribution over different multi-agent team structures
  rather than committing to one fixed architecture
- Dynamically samples task-dependent agent subnets for each input, trading off
  performance vs cost
- **Results**: Comparable or better performance than handcrafted systems at
  6–45% of inference cost
- **Key insight**: Agent team composition itself is a searchable space

Different problem from orchestration optimization — choosing *which* agents to
deploy per task, not optimizing *how* they coordinate.

- Paper: https://arxiv.org/pdf/2502.04180
- Code: https://github.com/bingreeky/MaAS

## DSPy with MIPROv2 Optimizer

Treats multi-agent workflows as programmable modules with declared structure.

MIPROv2 optimization loop:
1. Bootstrap program across training data to collect I/O traces per module
2. Draft potential instructions for every prompt using those traces
3. Sample mini-batches, propose instruction + trace combinations per module
4. Update surrogate model to guide future proposals

Optimizes both individual module prompts AND wiring/composition between modules.
Stateless module calls — no persistent agents, worktrees, or feedback loops.

- Docs: https://dspy.ai/

## Prompt-Level Optimization (For Reference)

These operate at the single-prompt level, not workflow orchestration:

- **OPRO** (Google) — LLM proposes better prompts conditioned on prior scores.
  Black-box optimization, no hypothesis formation.
- **PromptBreeder** (DeepMind) — Evolutionary prompt mutation/crossover.
  Meta-optimizes the mutation operators themselves.
- **EvoPrompt** — Evolutionary algorithms applied to prompt text. Pure score
  selection, no knowledge capture.

## Feedback Loop Research

Key findings from recent work on agent retry/self-correction:

- **Structured critiques > generic reflection.** Specific failure identification
  drives improvement; "reflect on your performance" degrades it.
- **Bounded retries with escalation** outperform unlimited self-correction.
  Agents over-correct on latest failures (recency bias).
- **Tool errors are misattributed.** Agents blame themselves when tools fail,
  leading to prompt-level "fixes" for infrastructure problems.

## Karpathy Autoresearch Loop

Agent reads source code → forms hypothesis → modifies code → runs experiment →
evaluates results. 700 experiments over 2 days, discovered 20 optimizations.

Hypothesis-driven but implicit — the LLM's chain of thought contains the
reasoning, but it's not a first-class artifact that gets reviewed or recorded.

## VFlow — Domain-Specific Agentic Workflow Discovery (Verilog)

AFlow adapted for hardware design. Extends the MCTS workflow search with
domain-specific operators and multi-objective optimization for Verilog code
generation.

- **Algorithm**: CEPE-MCTS (Cooperative Evolution with Past Experience MCTS) —
  multi-population cooperative evolution that balances multiple hardware
  objectives: functional correctness, area, power, timing, token cost
- **Domain operators**: Hardware-specific verification (syntactic correctness,
  functional behavior, synthesizability) layered on top of AFlow's general
  operators
- **Discovered workflow**: The optimization converged on a 5-step pattern:
  1. Problem analysis
  2. Multiple implementation generation
  3. Ensemble integration
  4. Comprehensive testing
  5. Targeted refinement
- **Results**: 20–30% pass@1 improvement over prompting baselines on VerilogEval
  and RTLLM2.0; matches designer-level area/power efficiency

Key insight: domain-specific operators and multi-objective scoring significantly
improve workflow discovery over generic AFlow. The discovered 5-step pattern
(analyze → generate multiple → ensemble → test → refine) resembles human
engineering workflows and emerged from search rather than being designed.

- Paper: https://arxiv.org/abs/2504.03723
- Based on: AFlow (https://arxiv.org/pdf/2410.10762)

## Backward-Chaining Workflow (Proposed — Unnamed)

A variant approach to workflow execution that works backward from the terminal
gate's approval criteria rather than forward from the initial stage.

### The problem with forward flows

In a forward workflow (intake → model → analyze → verify → approve), each stage
produces work speculatively and hopes the next stage can use it. Acceptance
criteria are written upfront by a human guessing what will matter. The terminal
gate discovers whether the accumulated work is sufficient only at the end.

Wasted work is common: the model stage produces a comprehensive schema analysis,
but the verify stage only needed three specific join relationships. The analyze
stage answers all four questions, but the verify stage discovers the approach for
question 3 was fundamentally wrong and the other three are fine.

### Backward chaining

Start at the terminal gate and decompose backward:

```
approve ← "what evidence?" ← verify ← "what results?" ← analyze ← "what schema?" ← model ← "what data?" ← intake
```

1. Start at the approval stage: "What evidence does the captain need to
   approve this?"
2. Recurse to the prior stage: "To produce that evidence, what do I need?"
3. Continue recursing until hitting a base case (something directly executable)
4. Execute the base case, return the result
5. Each parent resumes with exactly the answer it asked for
6. Terminal stage presents exactly the evidence that was requested

### Implementation via nested subagents

The backward walk maps to nested `Agent()` calls. Each stage is a subagent that
blocks on its child, resumes when the child returns:

```
verify_agent:
  determines evidence requirements
  → dispatches analyze_agent("produce X, Y, Z")
    → analyze_agent determines data needs
      → dispatches model_agent("I need these relationships")
        → model_agent executes against data, returns schema
      ← analyze_agent resumes, produces answers, returns
    ← verify_agent resumes, presents evidence to captain
```

The "fork conversation and inject" happens at subagent call/return boundaries.
Each parent's conversation context is preserved while the child runs. The child's
result is injected into the parent's context when it returns.

### Properties

- **Zero wasted work** — every stage produces exactly what its caller needs, not
  speculative output that may or may not be useful
- **Criteria propagate backward** — the terminal gate's requirements shape every
  preceding stage dynamically
- **Precise contracts** — each agent has a specific request, not "do your best"
- **Failure is localized** — if analyze can't produce what verify needs, that's a
  clear rejection at a specific interface, not a vague "try again"
- **Dynamic decomposition** — unlike forward workflows where stages are fixed at
  commission time, backward chaining discovers the necessary decomposition based
  on the actual problem. The agent at each level says "given what I now know
  about this specific dataset, here's what I need from the previous stage"

### Comparison

| | Forward (current) | AFlow/VFlow | Backward chaining |
|---|---|---|---|
| Direction | intake → done | search over topologies | done → intake |
| Stage definition | Fixed at commission | Discovered by MCTS | Discovered by backward decomposition |
| Work produced | Speculative | Optimized for score | Exactly what's needed |
| Knowledge capture | Stage reports | Search tree backprop | Contracts between stages |
| Human role | Gates between stages | None (automated) | Defines terminal criteria |
| Failure mode | Wasted work, late discovery | Opaque local optima | Deep recursion, over-decomposition |

### Open questions

1. **Coexistence vs replacement** — Is backward chaining a mode that coexists
   with forward workflows (use forward for routine work, backward for hard
   problems), or does it replace the linear stage model entirely?

2. **Recursion depth** — How deep does the backward walk go before hitting a base
   case? A 5-stage workflow could produce a 5-deep call stack, each with full
   agent context. Token cost grows with depth.

3. **Caching and reuse** — If two verify questions need the same schema work from
   the model stage, does the second call reuse the first's result? Memoization
   across the call tree.

4. **Hybrid** — Could a workflow start forward (intake and model are always
   needed) then switch to backward (verify determines what analysis to request)?
   The base cases are pre-computed, the decomposition is dynamic.

5. **Spacedock representation** — Is this a different workflow type
   (`direction: backward` in README frontmatter)? A different FO template? Or
   does it live outside the current entity/stage model entirely?
