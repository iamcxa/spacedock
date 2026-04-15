# Build-Review Learned Patterns

Patterns discovered during review stages. Auto-appended by knowledge-capture capture mode.

---

### [2026-04-15] spacedock — Intermediary wrapper prop-threading gap

**Pattern**: When a React component (leaf) gains new props that change its rendered output, every intermediary Client Component wrapper that renders the leaf must also receive and forward those props. Review scan should check: for each new prop added to a component in the diff, find all render sites (`grep -r "ComponentName"`) and verify the prop is threaded through.

**Applies to**: Any project using React Server Components with client-wrapper intermediaries (Next.js App Router pattern)

**Example**: EntityBody gained `status` and `autoAdvance` props (entity 099). EntityDetailClient renders EntityBody but was not updated to accept/forward them -- gate buttons were silently never shown despite correct EntityBody implementation.

**Action**: In goal-backward pre-scan (Step 1e), after confirming a new prop is added to a component, grep for all render sites of that component and verify the prop appears at each site. Render sites that omit the prop silently fall back to `undefined`, which may produce subtly wrong behavior rather than a type error (if the prop is optional).

---
