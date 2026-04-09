# Domain Classification Heuristic

Five domains for classifying feature directives. Used by build-brainstorm to tag each directive, giving build-explore structured context for question generation.

## Domains

### 1. User-facing Visual

**What it is:** Anything the user sees — UI components, pages, layouts, styling, dashboard widgets.

**Signal words:** page, screen, view, layout, component, widget, button, form, modal, toast, tab, panel, sidebar, header, card, table, list, badge, icon, theme, color, responsive, mobile, desktop.

**Gray areas for explore:**
- Is this a new page or modification to an existing one?
- Does it require new routes or navigation changes?
- Are there responsive/mobile considerations?
- Does it touch shared layout components that affect other pages?

---

### 2. Behavioral / Callable

**What it is:** Functions, APIs, hooks, event handlers, state management — logic that gets called.

**Signal words:** function, method, API, endpoint, route, handler, hook, callback, middleware, service, controller, action, dispatch, trigger, emit, subscribe, listener, validate, transform, parse, serialize.

**Gray areas for explore:**
- Is this a new API or extension of an existing one?
- What calls this — UI, CLI, another service, cron?
- Does it need error handling or retry logic?
- Are there auth/permission boundaries?

---

### 3. Runnable / Invokable

**What it is:** Scripts, CLI commands, agents, skills, pipelines, jobs — things you run.

**Signal words:** script, command, CLI, agent, skill, pipeline, job, task, worker, cron, schedule, daemon, process, run, execute, invoke, dispatch, build, deploy, migrate.

**Gray areas for explore:**
- Is this interactive or headless?
- What triggers it — user, schedule, event?
- Does it need idempotency or resumability?
- What's the failure mode — retry, skip, abort?

---

### 4. Readable / Textual

**What it is:** Documentation, configuration, templates, markdown, schemas, specs — content that's read or parsed.

**Signal words:** doc, documentation, README, config, configuration, schema, template, markdown, YAML, JSON, spec, protocol, format, frontmatter, comment, annotation, changelog, manifest.

**Gray areas for explore:**
- Is this human-readable only or machine-parsed too?
- Does it define a contract other code depends on?
- Are there validation rules for the format?
- Who maintains it — humans, automation, or both?

---

### 5. Organizational / Data-transforming

**What it is:** Data flow, storage, migrations, ETL, state machines, file layout, architecture restructuring.

**Signal words:** database, SQLite, migration, storage, persist, cache, state, state machine, workflow, pipeline stage, archive, move, rename, restructure, split, merge, extract, aggregate, index, query, filter, sort.

**Gray areas for explore:**
- Is this a schema change or query-only?
- Does it affect existing data (migration needed)?
- What's the read/write ratio?
- Are there consistency or ordering constraints?

---

## Classification Rules

1. **A directive can match multiple domains.** A feature that "adds a settings page with API integration" is both User-facing Visual and Behavioral/Callable. Record all matching domains.

2. **Record in Captain Context Snapshot.** The brainstorm output includes domain tags for each directive — build-explore uses these to focus its question generation.

3. **Do NOT generate questions.** Domain classification identifies *where gray areas exist*. Generating questions from those gray areas is build-explore's job, not brainstorm's.

4. **When ambiguous, tag broader.** If unsure whether something is Behavioral or Runnable, tag both. Over-tagging is cheap; missing a domain means explore skips relevant questions.

5. **Signal words are heuristics, not rules.** A directive mentioning "button" is likely Visual, but "button to trigger deploy" is Visual + Runnable. Read the full directive.
