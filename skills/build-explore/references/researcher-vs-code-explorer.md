# Researcher vs Code-Explorer Disambiguation

Both tools Read files. The distinction is **purpose**. Dispatch by purpose, not by capability.

## Tool Profiles

### Code-Explorer (`spacedock:code-explorer`)

- **Purpose**: Breadth-first file mapping subroutine. Discovers which files are affected by an entity's scope.
- **Dispatch trigger**: build-explore Step 2 (Mode A) when SO needs fresh-context file discovery for Large entities (>15 files).
- **Output**: Structured file list with layer classification and 1-line purpose notes per file.
- **Does NOT**: evaluate claims, validate evidence, answer technology questions. Read-only, never edits.
- **Question it answers**: "Which files does this entity touch?"

### Researcher (`spacedock:build-research`)

- **Purpose**: Depth-first claim validation agent. Validates specific technology claims, investigates library behavior, cross-references evidence.
- **Dispatch trigger**: build-brainstorm Step 3.5 (post-brainstorm external tech claims), build-explore Step 5.5 (Likely/Unclear assumptions with external tech dependencies), build-plan Step 2 (implementation-specific research topics after dedup).
- **Output**: Structured finding with 5-domain treatment (Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples).
- **Does NOT**: map files, discover scope, list what files are affected.
- **Question it answers**: "Is this claim true? Does this API work as stated?"

## Dispatch Decision Table

| Phase | Question type | Dispatch |
|-------|---------------|----------|
| Brainstorm (Step 3.5) | "Does library X support feature Y?" | researcher |
| Explore (Step 2) | "Which files does this entity touch?" | code-explorer |
| Explore (Step 5.5) | "Is this Likely assumption correct?" | researcher |
| Clarify (Step 1.5) | "Does this file:line still support claim Z?" | inline Read (no dispatch) |

## Overlap Zone

Both tools Read files to gather evidence. The distinction is purpose:

- Code-explorer asks **"what files are relevant?"** -- breadth over depth, enumerate the landscape.
- Researcher asks **"does X work as stated?"** -- depth over breadth, validate a specific claim.

**When in doubt**: if the question is "which files?" use code-explorer; if the question is "does X work as stated?" use researcher.

## Hard Rules

**Never dispatch both for the same question.** A code-explorer cannot answer "does the API support streaming?" A researcher should not be asked to "list all files in the domain layer."

**Step 1.5 exception**: Clarify Step 1.5 (evidence freshness sub-checks) does NOT dispatch researchers or code-explorers. It uses inline `Read`/`Grep` because evidence freshness checks are small-scope (single `file:line` citations, not broad investigation or novel claim validation).

## Cross-References

- `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` -- Researcher vs Code-Explorer Disambiguation section (dispatch ownership context)
- `agents/science-officer.md` -- Researcher vs Code-Explorer Dispatch Guide section (SO-level dispatch rules)
- `skills/build-explore/SKILL.md` -- Step 2 (Mode A code-explorer dispatch), Step 5.5 (researcher dispatch after classification)
- `skills/build-clarify/SKILL.md` -- Step 1.5 (inline Read evidence freshness, no researcher/code-explorer dispatch)
