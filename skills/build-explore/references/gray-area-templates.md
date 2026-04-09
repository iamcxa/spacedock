# Gray Area Templates

Domain-specific templates for identifying gray areas during codebase exploration. Each domain lists common ambiguities that build-explore should assess when the entity touches that domain.

## Skip Rules

Before generating gray area items, skip any that meet these conditions:

1. **Already decided.** The brainstorming spec contains a D-01 (or similar) decision marker that resolves the gray area. Do not re-raise settled decisions.
2. **Clear codebase precedent.** The codebase has 2+ consistent usages of the same pattern. If every existing page uses `Bun.serve` with the same middleware chain, "which server framework" is not a gray area.
3. **Solved by a related entity.** Another entity in the same workflow already addresses the gray area (check entity cross-references in the pipeline status). Do not duplicate work across entities.

## Multi-Domain Rule

A single entity often spans multiple domains. Apply ALL matching domain templates, then deduplicate -- if two domains surface the same gray area (e.g., both Visual and Behavioral flag "auth boundary"), keep one instance and note both domains.

---

## 1. User-facing Visual

Gray areas for features the user sees -- UI components, pages, layouts, styling.

| Gray Area | What to Assess | Example |
|---|---|---|
| New page vs. existing modification | Whether the feature requires a new route/page or extends an existing view | "Add entity timeline" -- new `/entity/:slug/timeline` page, or a tab within the existing detail page? |
| Layout integration | How the feature fits into the existing shell (sidebar, header, tabs) | Dashboard widget -- does it go in the main grid, a new sidebar panel, or a collapsible section? |
| Responsive behavior | Whether mobile/narrow viewports need distinct treatment | Activity feed table -- collapse to card layout on mobile, or scroll horizontally? |
| Empty / loading / error states | What the user sees before data arrives, when data is absent, or when a fetch fails | Stage report section -- skeleton loader, spinner, or "No report yet" placeholder? |
| Shared component impact | Whether changes to shared UI components affect other pages | Modifying the `<EntityCard>` component -- does the change propagate to the pipeline overview grid? |

---

## 2. Behavioral / Callable

Gray areas for functions, APIs, event handlers, and state management logic.

| Gray Area | What to Assess | Example |
|---|---|---|
| New endpoint vs. existing extension | Whether to add a new API route or extend an existing handler | "Fetch entity history" -- new `GET /api/entities/:slug/history` or add a `?include=history` param to the existing entity endpoint? |
| Caller surface | What invokes this logic -- UI, CLI, another service, cron, WebSocket message | Stage transition handler -- called by the FO dispatch, the dashboard UI, or both? |
| Error contract | What errors are possible and how they surface to callers | SQLite write fails mid-transaction -- return 500 with rollback, or queue for retry? |
| Auth / permission boundary | Whether the callable requires authentication or role checks | Entity update endpoint -- open to all dashboard viewers, or restricted to the captain? |
| Idempotency | Whether repeated calls produce the same result or cause side effects | "Mark entity as shipped" -- safe to call twice, or does it create duplicate events? |

---

## 3. Runnable / Invokable

Gray areas for scripts, CLI commands, agents, skills, pipelines, and jobs.

| Gray Area | What to Assess | Example |
|---|---|---|
| Interactive vs. headless | Whether the runnable requires user input or runs unattended | Build-explore skill -- interactive prompts to the captain, or fully autonomous with output written to entity body? |
| Trigger mechanism | What starts execution -- manual invocation, schedule, event, dispatch | Quality check -- triggered by FO dispatch after stage transition, or manually via `/build quality`? |
| Failure mode | What happens on error -- retry, skip, abort, partial output | Pipeline stage fails mid-entity -- abort the whole dispatch, skip and flag, or retry once? |
| Output destination | Where results are written -- stdout, file, entity body, database, dashboard | Explore stage report -- appended to entity markdown, written to a separate `.report` file, or posted to dashboard API? |

---

## 4. Readable / Textual

Gray areas for documentation, configuration, templates, schemas, and specs.

| Gray Area | What to Assess | Example |
|---|---|---|
| Human-only vs. machine-parsed | Whether the content is purely for reading or also consumed by code | Entity frontmatter -- read by humans in the markdown, and also parsed by the status script for pipeline state? |
| Contract scope | Whether the format defines a contract other code depends on | Stage report format -- is it free-form markdown, or does the FO parse specific fields like `files_mapped:` and `scale:`? |
| Validation rules | Whether the format needs schema validation or is freeform | New YAML config section -- validated by Zod at load time, or just documented conventions? |
| Maintenance ownership | Who updates it -- humans, automation, or both | Entity body assumptions section -- written by build-explore, then edited by the captain during clarify? |
| Versioning / migration | Whether format changes require migrating existing instances | Adding a new required field to entity frontmatter -- do existing entities need backfill? |

---

## 5. Organizational / Data-transforming

Gray areas for data flow, storage, state machines, migrations, and architecture restructuring.

| Gray Area | What to Assess | Example |
|---|---|---|
| Schema change vs. query-only | Whether the feature requires new tables/columns or just new queries | "Show stage duration" -- compute from existing `entered_at` timestamps, or add a new `duration_seconds` column? |
| Migration strategy | How existing data transitions to the new structure | Adding `decomposition` field to entity files -- backfill existing entities with empty arrays, or only populate on new entities? |
| Ordering / consistency constraints | Whether operations must happen in a specific sequence | Entity state transitions -- can stages be skipped, or must they follow the profile's `effective_stages` order? |
| Scale assessment | Whether the feature is a localized change or a structural refactor | "Split entity file into sections" -- move from single markdown to a directory with multiple files, or keep single file with new headers? |
| Cross-entity dependencies | Whether changes to one entity's data affect others | Parent entity decomposition -- do child entities inherit the parent's assumptions, or start fresh? |
