# build-clarify Forge Fixtures

Pre-recorded captain responses for solo regression testing of the build-clarify skill. These
fixtures address the Class 3 interactive skill limitation documented in MEMORY.md -- build-clarify
requires live captain input via AskUserQuestion, making it impossible to smoke-test without a
human in the loop.

Forge loads these fixtures in place of the live AskUserQuestion harness, feeds them to the skill
in order, and asserts the final entity state matches expectations.

## Fixture format

- `minimal-entity.md` -- a small fixture entity with 1 assumption, 1 option, and 1 open question.
  Pre-populated via build-explore output format (checklist Stage Report, blank-line Open Questions).
- `captain-responses.yaml` -- ordered list of captain responses, keyed by step number.

## How forge uses them

1. Forge copies `minimal-entity.md` to a temporary location under a test slug.
2. Forge invokes build-clarify against the temp entity.
3. Each AskUserQuestion call is intercepted and satisfied by the next entry in
   `captain-responses.yaml`.
4. After build-clarify returns, forge compares the entity body against the expected post-clarify
   snapshot (stored here as `expected-post-clarify.md` when created).

## Updating fixtures

When build-clarify's AskUserQuestion sequence changes (new question type, reordered flow), update
both `captain-responses.yaml` and any expected-output snapshots in the same commit. Fixtures are
contract tests -- drift between fixture and skill is a regression signal.
