# DataAgentBench — Spacedock Commission Prompts

Incremental phases for solving DataAgentBench with spacedock-managed data agents.

## Project Setup

```bash
mkdir dataagentbench && cd dataagentbench && git init
git submodule add https://github.com/ucbepic/DataAgentBench data
# set up Python env with benchmark dependencies
git commit -m "init: add DataAgentBench as submodule"
```

## Phase 1: Run the benchmark

Get baseline scores. Each dataset is an entity. The agent reads the schema,
connects to the database, solves the 4 queries, and self-validates using the
provided validate.py scripts. No strategy tuning yet — just get numbers.

```
/spacedock:commission

All inputs for this workflow:
- Mission: Solve DataAgentBench datasets — an AI data agent reads each dataset's
  schema and database config, connects to the database, answers 4 analytical
  queries, and self-validates answers using the benchmark's validate.py scripts.
- Entity: A dataset from the DataAgentBench benchmark
- Stages: pending → solve → done
  - pending: initial holding state, no work
  - solve: worktree stage. The agent reads data/{slug}/db_description.txt for
    schema documentation and data/{slug}/db_config.yaml for connection details.
    For each query (data/{slug}/query1/ through query4/), the agent reads
    query.json for the question, explores the database, writes and executes
    Python analysis code, produces an answer, then runs validate.py to
    self-check against ground_truth.csv. Agent records pass/fail per query and
    the approach taken. Results are written to _results/{slug}.json with fields:
    { q1: {pass: bool, answer: str}, q2: ..., q3: ..., q4: ... }
  - done: terminal
- Approval gates: solve (captain reviews results before closing)
- Seed entities:
  1. agnews — News article classification dataset (MongoDB + SQLite)
  2. bookreview — Book review analysis dataset
  3. GITHUB_REPOS — GitHub repository metadata
  4. PATENTS — Patent document analysis
  5. stockindex — Stock index historical data
  6. stockmarket — Stock market trading data
  7. googlelocal — Google local business reviews
  8. crmarenapro — CRM arena professional dataset
  9. yelp — Yelp business and review data
  10. music_brainz_20k — Music metadata (MusicBrainz)
  11. DEPS_DEV_V1 — Software dependency graph data
  12. PANCANCER_ATLAS — Pan-cancer biomedical dataset
- Location: ./benchmark/

Skip interactive questions and confirmation.
```

### Phase 1 deliverables
- Baseline Pass@1 scores per dataset
- Understanding of which datasets/queries are easy vs hard
- Working database connectivity and execution environment

---

## Phase 2: Structured data-modeling-analytics workflow

Replace the single `solve` stage with a structured pipeline. The agent now
works through explicit phases: understand the data, model it, then analyze.
This gives gate checkpoints and reusable intermediate artifacts.

```
/spacedock:commission

All inputs for this workflow:
- Mission: Solve DataAgentBench datasets through a structured data analysis
  pipeline. Each dataset goes through schema understanding, data modeling,
  query analysis, and result verification. The workflow produces validated
  answers and captures the analytical approach for each dataset.
- Entity: A dataset from the DataAgentBench benchmark
- Stages: pending → model → analyze → verify → done
  - pending: initial holding state
  - model: worktree stage. Agent reads data/{slug}/db_description.txt and
    db_config.yaml. Connects to the database, explores tables/collections,
    documents key relationships, data types, join keys, and any data quality
    issues. Produces a modeling report in the entity file: schema summary,
    relationship map, notable patterns, and recommended query strategies.
  - analyze: worktree stage (same worktree as model). Agent reads the modeling
    report from the prior stage, then solves all 4 queries
    (data/{slug}/query{1-4}/query.json). For each query: plan the approach,
    write and execute Python code, capture the answer. Write results to
    _results/{slug}.json.
  - verify: worktree stage, fresh: true, feedback-to: analyze. Independent
    validator runs each query's validate.py against the answers in
    _results/{slug}.json. Reports pass/fail per query with evidence. If any
    query fails, REJECTED with specific findings for the analyze agent to fix.
  - done: terminal
- Approval gates: verify (captain reviews before closing)
- Strategy file: The agent reads _config/strategy.md before starting the model
  and analyze stages. This file describes the analytical approach, prompting
  style, and tool usage conventions the agent should follow. If the file does
  not exist, the agent uses its default approach.
- Seed entities:
  1. agnews — News article classification dataset (MongoDB + SQLite)
  2. bookreview — Book review analysis dataset
  3. GITHUB_REPOS — GitHub repository metadata
  4. PATENTS — Patent document analysis
  5. stockindex — Stock index historical data
  6. stockmarket — Stock market trading data
  7. googlelocal — Google local business reviews
  8. crmarenapro — CRM arena professional dataset
  9. yelp — Yelp business and review data
  10. music_brainz_20k — Music metadata (MusicBrainz)
  11. DEPS_DEV_V1 — Software dependency graph data
  12. PANCANCER_ATLAS — Pan-cancer biomedical dataset
- Location: ./benchmark/

Skip interactive questions and confirmation.
```

### Phase 2 deliverables
- Structured analysis artifacts (modeling reports, query plans)
- feedback-to loop between verify and analyze catches wrong answers
- _config/strategy.md exists as the tuning surface for Phase 3

---

## Phase 3: Strategy tuning (no new commission)

Phase 3 is not a new commission — it evolves Phase 2 by editing
`_config/strategy.md`. Example strategies to try:

```markdown
# _config/strategy.md — Schema-first with chain-of-thought

## Modeling approach
- Always enumerate all tables/collections before writing any query
- Document column types and sample values for every table
- Identify foreign keys and join conditions explicitly

## Query approach
- Think step by step: decompose each question into sub-questions
- Write exploratory queries first (SELECT * LIMIT 5) before analytical ones
- For multi-database queries, solve each database independently then combine

## Tool usage
- Prefer pandas for data manipulation after extraction
- Use SQL for filtering/aggregation, Python for transformation/formatting
- Always validate intermediate results before combining
```

Re-run the workflow with a different strategy.md, compare _results/ across runs.
Track what works in a manual log or use Phase 4.

---

## Phase 4: Experiment workflow

A second workflow in the same project that systematically tests strategy
variants against the benchmark. Each experiment captures a hypothesis,
runs the Phase 2 workflow with modified settings, and compares results.

```
/spacedock:commission

All inputs for this workflow:
- Mission: Experiment with data agent strategies for DataAgentBench. Each
  experiment defines a hypothesis about what agent behavior change will improve
  benchmark scores, applies the change, runs the data-analytics workflow
  against a test set of datasets, and analyzes the results. The goal is
  systematic agent tuning with tracked hypotheses and measured outcomes.
- Entity: An experiment (a specific strategy variant with a hypothesis)
- Stages: hypothesis → run → analyze → done
  - hypothesis: initial, gate. Define what's being changed
    (_config/strategy.md diff or agent prompt change), why it should help,
    which datasets are most likely affected, and predicted score impact. Gate
    ensures the captain approves the experiment before burning benchmark budget.
  - run: worktree stage. Apply the variant's strategy changes (write the
    modified _config/strategy.md). Run the benchmark/ workflow's first officer
    against a test set of datasets (default: 3 representative datasets chosen
    in hypothesis stage). Collect _results/ output. Record total token usage
    and wall-clock time.
  - analyze: gate. Compare this variant's scores against
    _experiments/_baseline.json and any prior experiments. Report: per-query
    delta, aggregate Pass@1 change, cost difference, qualitative observations
    about where the variant helped or hurt. Recommend: adopt, reject, or
    iterate.
  - done: terminal
- Approval gates: hypothesis, analyze
- Results storage: _experiments/{slug}/ directory containing strategy.md
  (frozen copy), results.json (scores), and analysis.md (comparison report).
  _experiments/_baseline.json holds the Phase 1 baseline scores for reference.
- Seed entities:
  1. baseline — Run Phase 2 workflow with default strategy, establish reference
     scores (score: 1.0)
  2. schema-first-cot — Schema-first approach with chain-of-thought
     decomposition (score: 0.8)
  3. explore-then-query — Mandatory exploratory queries before analytical ones
     (score: 0.7)
- Location: ./experiments/

Skip interactive questions and confirmation.
```

### Phase 4 deliverables
- Tracked experiment history with hypotheses and measured outcomes
- Reproducible variant configs frozen in _experiments/{slug}/
- Cross-variant comparison at each analyze gate
- Data-driven agent improvement loop
