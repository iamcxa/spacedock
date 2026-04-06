# Dashboard Gate Approval — UI Stage Approval & PR-style Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the captain to approve or request changes on gated workflow stages directly from the dashboard UI, with real-time gate status display, channel-based FO notification, and race condition handling between CLI and UI approval paths.

**Architecture:** Gate state is derived client-side by cross-referencing entity `status` against `WorkflowData.stages` (finding stages where `stage.gate === true` and `stage.name === entity.status`). Approve sends a `gate_decision` channel message to the FO via the existing MCP notification path. Request Changes triggers the existing Feature 011 comment flow. The detail page gains a WebSocket connection for real-time gate status updates. Race conditions are handled UI-side (disable buttons after click, poll entity status to detect if gate was resolved elsewhere) — the FO has no built-in dedup mechanism.

**Tech Stack:** Bun (runtime + test runner), TypeScript (backend), vanilla JS (frontend), WebSocket (real-time updates), MCP channel protocol (FO communication)

**Research corrections incorporated:**
1. CLAIM-5: `VALID_EVENT_TYPES` in `events.ts` is missing `"comment"` and `"suggestion"` — fix this pre-existing bug alongside adding `"gate_decision"`
2. CLAIM-6: Gate state requires cross-referencing entity status against workflow stages (`stages.find(s => s.name === entity.status && s.gate)`), not reading from entity frontmatter
3. CLAIM-8: No existing FO dedup mechanism for gate decisions — UI sends via channel, buttons disable immediately, entity status polling detects if gate was already resolved elsewhere

---

## File Structure

### Backend — Modified files

| File | Changes |
|------|---------|
| `tools/dashboard/src/types.ts:78-80` | Add `"gate_decision"` to `AgentEventType` union |
| `tools/dashboard/src/events.ts:3-6` | Add `"gate_decision"`, `"comment"`, `"suggestion"` to `VALID_EVENT_TYPES` set (bug fix + new type) |
| `tools/dashboard/src/server.ts` | Add `POST /api/entity/gate/decision` route |

### Backend — New test file

| File | Responsibility |
|------|---------------|
| `tools/dashboard/src/gate.test.ts` | Unit tests for gate decision event validation and VALID_EVENT_TYPES sync |

### Frontend — Modified files

| File | Changes |
|------|---------|
| `tools/dashboard/static/detail.html` | Add gate action section HTML (approve/request-changes buttons + status badge) |
| `tools/dashboard/static/detail.js` | Add WebSocket connection, gate status derivation, gate action handlers, entity status polling |
| `tools/dashboard/static/detail.css` | Add styles for gate action panel, status badge, confirmation dialog |
| `tools/dashboard/static/activity.js` | Add `gate_decision` event rendering in activity feed |

---

## Task 1: Fix VALID_EVENT_TYPES bug and add gate_decision type

**Files:**
- Modify: `tools/dashboard/src/types.ts:78-80`
- Modify: `tools/dashboard/src/events.ts:3-6`
- Create: `tools/dashboard/src/gate.test.ts`

- [ ] **Step 1: Write the failing test for VALID_EVENT_TYPES sync**

Create `tools/dashboard/src/gate.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { EventBuffer } from "./events";

describe("EventBuffer event type validation", () => {
  test("accepts gate_decision event type", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "gate_decision" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "approved",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("gate_decision");
  });

  test("accepts comment event type (bug fix)", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "comment" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test comment",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
  });

  test("accepts suggestion event type (bug fix)", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "suggestion" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test suggestion",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
  });

  test("rejects unknown event type", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "nonexistent" as any,
      entity: "test",
      stage: "test",
      agent: "test",
      timestamp: new Date().toISOString(),
    };
    expect(() => buffer.push(event)).toThrow("Invalid event type: nonexistent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/dashboard && bun test src/gate.test.ts`
Expected: FAIL — `gate_decision`, `comment`, and `suggestion` are rejected by `VALID_EVENT_TYPES`

- [ ] **Step 3: Add gate_decision to AgentEventType in types.ts**

In `tools/dashboard/src/types.ts`, change line 78-80 from:

```typescript
export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"
  | "channel_message" | "channel_response" | "permission_request" | "permission_response"
  | "comment" | "suggestion";
```

To:

```typescript
export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"
  | "channel_message" | "channel_response" | "permission_request" | "permission_response"
  | "comment" | "suggestion" | "gate_decision";
```

- [ ] **Step 4: Fix VALID_EVENT_TYPES in events.ts — add missing types**

In `tools/dashboard/src/events.ts`, change lines 3-6 from:

```typescript
const VALID_EVENT_TYPES: Set<string> = new Set([
  "dispatch", "completion", "gate", "feedback", "merge", "idle",
  "channel_message", "channel_response", "permission_request", "permission_response",
]);
```

To:

```typescript
const VALID_EVENT_TYPES: Set<string> = new Set([
  "dispatch", "completion", "gate", "feedback", "merge", "idle",
  "channel_message", "channel_response", "permission_request", "permission_response",
  "comment", "suggestion", "gate_decision",
]);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/gate.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 6: Run all existing tests to ensure no regressions**

Run: `cd tools/dashboard && bun test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/src/types.ts tools/dashboard/src/events.ts tools/dashboard/src/gate.test.ts
git commit -m "feat(events): add gate_decision type, fix missing comment/suggestion in VALID_EVENT_TYPES"
```

---

## Task 2: Add POST /api/entity/gate/decision route

**Files:**
- Modify: `tools/dashboard/src/server.ts`
- Modify: `tools/dashboard/src/gate.test.ts`

- [ ] **Step 1: Write the failing test for the gate decision endpoint**

Add to the bottom of `tools/dashboard/src/gate.test.ts`:

```typescript
import { createServer } from "./server";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const TMP = join(import.meta.dir, "__test_gate__");
const WORKFLOW_DIR = join(TMP, "docs", "build-pipeline");
const ENTITY_PATH = join(WORKFLOW_DIR, "test-entity.md");

const ENTITY_CONTENT = [
  "---",
  "id: 001",
  "title: Test Entity",
  "status: plan",
  "score: 0.8",
  "---",
  "",
  "## Body",
  "",
  "Test content.",
].join("\n");

describe("POST /api/entity/gate/decision", () => {
  let server: ReturnType<typeof createServer>;
  let channelMessages: Array<{ content: string; meta?: Record<string, string> }>;

  beforeAll(() => {
    mkdirSync(WORKFLOW_DIR, { recursive: true });
    writeFileSync(ENTITY_PATH, ENTITY_CONTENT);
    channelMessages = [];
    server = createServer({
      port: 0,
      projectRoot: TMP,
      onChannelMessage: (content, meta) => {
        channelMessages.push({ content, meta });
      },
    });
  });

  afterAll(() => {
    server.stop();
    rmSync(TMP, { recursive: true, force: true });
  });

  beforeEach(() => {
    channelMessages = [];
  });

  test("sends gate decision via channel and records event", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.seq).toBeGreaterThan(0);

    // Verify channel message was sent
    expect(channelMessages.length).toBe(1);
    expect(channelMessages[0].meta?.type).toBe("gate_decision");
    expect(channelMessages[0].meta?.decision).toBe("approved");
    expect(channelMessages[0].meta?.entity_path).toBe(ENTITY_PATH);
    expect(channelMessages[0].meta?.stage).toBe("plan");
  });

  test("rejects request missing required fields", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_path: ENTITY_PATH }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects invalid decision value", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "maybe",
      }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects path outside project root", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: "/etc/passwd",
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(403);
  });
});
```

Add imports at the top of the file (merge with existing imports):

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
```

- [ ] **Step 2: Run tests to verify the new endpoint tests fail**

Run: `cd tools/dashboard && bun test src/gate.test.ts`
Expected: EventBuffer tests PASS, endpoint tests FAIL with 404 (route doesn't exist yet)

- [ ] **Step 3: Add the gate decision route to server.ts**

In `tools/dashboard/src/server.ts`, add the following route after the `/api/entity/comment/resolve` route block (after line 237):

```typescript
      "/api/entity/gate/decision": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              entity_path: string;
              entity_slug: string;
              stage: string;
              decision: string;
            };
            if (!body.entity_path || !body.entity_slug || !body.stage || !body.decision) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required fields: entity_path, entity_slug, stage, decision" }, 400);
            }
            if (body.decision !== "approved" && body.decision !== "changes_requested") {
              logRequest(req, 400);
              return jsonResponse({ error: "Invalid decision: must be 'approved' or 'changes_requested'" }, 400);
            }
            if (!validatePath(body.entity_path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            // Record gate_decision event in activity feed
            const event: AgentEvent = {
              type: "gate_decision",
              entity: body.entity_slug,
              stage: body.stage,
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: body.decision,
            };
            const entry = eventBuffer.push(event);
            server.publish("activity", JSON.stringify({ type: "event", data: entry }));
            // Forward gate decision to FO via channel
            if (opts.onChannelMessage) {
              const content = body.decision === "approved"
                ? `Gate approved for ${body.entity_slug} at stage "${body.stage}"`
                : `Changes requested for ${body.entity_slug} at stage "${body.stage}"`;
              opts.onChannelMessage(content, {
                type: "gate_decision",
                decision: body.decision,
                entity_path: body.entity_path,
                entity_slug: body.entity_slug,
                stage: body.stage,
              });
            }
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq: entry.seq });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/gate.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run all tests to ensure no regressions**

Run: `cd tools/dashboard && bun test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add tools/dashboard/src/server.ts tools/dashboard/src/gate.test.ts
git commit -m "feat(server): add POST /api/entity/gate/decision route with channel forwarding"
```

---

## Task 3: Add gate action section to detail.html

**Files:**
- Modify: `tools/dashboard/static/detail.html`

- [ ] **Step 1: Add gate action section HTML**

In `tools/dashboard/static/detail.html`, add the following section inside `<aside class="detail-sidebar">`, after the `<section class="management-panel">` closing `</section>` tag (after the tag editor section, before the comments panel):

```html
            <section class="gate-panel" id="gate-panel" style="display:none;">
                <h3>Gate Review</h3>
                <div id="gate-status" class="gate-status">
                    <span id="gate-status-badge" class="gate-badge pending">Pending Review</span>
                </div>
                <div id="gate-actions" class="gate-actions">
                    <button id="gate-approve-btn" class="btn gate-btn approve">Approve</button>
                    <button id="gate-request-changes-btn" class="btn gate-btn request-changes">Request Changes</button>
                </div>
                <div id="gate-confirm" class="gate-confirm" style="display:none;">
                    <p>Are you sure you want to <strong id="gate-confirm-action"></strong> this gate?</p>
                    <div class="gate-confirm-actions">
                        <button id="gate-confirm-yes" class="btn gate-btn approve">Confirm</button>
                        <button id="gate-confirm-cancel" class="btn btn-small btn-secondary">Cancel</button>
                    </div>
                </div>
                <div id="gate-resolved" class="gate-resolved" style="display:none;">
                    <span id="gate-resolved-text"></span>
                </div>
            </section>
```

- [ ] **Step 2: Verify the HTML is valid**

Open `/detail?path=<any-entity-path>` in browser. The gate panel should be hidden (display:none). No JS errors in console.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/static/detail.html
git commit -m "feat(detail): add gate review panel HTML scaffold"
```

---

## Task 4: Add gate panel CSS styles

**Files:**
- Modify: `tools/dashboard/static/detail.css`

- [ ] **Step 1: Add gate panel styles to detail.css**

Append the following styles at the end of `tools/dashboard/static/detail.css`:

```css
/* --- Gate Review Panel --- */

.gate-panel {
  border-top: 1px solid #30363d;
  padding-top: 1rem;
}

.gate-status {
  margin-bottom: 0.75rem;
}

.gate-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.gate-badge.pending {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.gate-badge.approved {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
}

.gate-badge.changes-requested {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
}

.gate-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.gate-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #30363d;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.gate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gate-btn.approve {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
  border-color: #3fb950;
}

.gate-btn.approve:hover:not(:disabled) {
  background: rgba(63, 185, 80, 0.25);
}

.gate-btn.request-changes {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
  border-color: #f85149;
}

.gate-btn.request-changes:hover:not(:disabled) {
  background: rgba(248, 81, 73, 0.25);
}

.gate-confirm {
  padding: 0.75rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.gate-confirm p {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #c9d1d9;
}

.gate-confirm-actions {
  display: flex;
  gap: 0.5rem;
}

.gate-resolved {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
}
```

- [ ] **Step 2: Verify styles render correctly**

Temporarily set `#gate-panel` display to block in DevTools. Verify the approve/request-changes buttons render correctly with proper colors and spacing.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/static/detail.css
git commit -m "feat(detail): add gate review panel CSS styles"
```

---

## Task 5: Add WebSocket connection and gate status derivation to detail.js

**Files:**
- Modify: `tools/dashboard/static/detail.js`

- [ ] **Step 1: Add WebSocket connection to detail.js**

At the bottom of `tools/dashboard/static/detail.js`, add the gate review logic. This is a self-contained section:

```javascript
// --- Gate Review: WebSocket + Status Derivation + Actions ---

(function initGateReview() {
  var gatePanel = document.getElementById('gate-panel');
  var gateStatusBadge = document.getElementById('gate-status-badge');
  var gateActions = document.getElementById('gate-actions');
  var gateApproveBtn = document.getElementById('gate-approve-btn');
  var gateRequestChangesBtn = document.getElementById('gate-request-changes-btn');
  var gateConfirm = document.getElementById('gate-confirm');
  var gateConfirmAction = document.getElementById('gate-confirm-action');
  var gateConfirmYes = document.getElementById('gate-confirm-yes');
  var gateConfirmCancel = document.getElementById('gate-confirm-cancel');
  var gateResolved = document.getElementById('gate-resolved');
  var gateResolvedText = document.getElementById('gate-resolved-text');

  var workflowStages = null; // cached from /api/workflows
  var currentEntityStatus = null;
  var gateDecisionSent = false;
  var statusPollTimer = null;

  // --- Gate State Derivation ---
  // CLAIM-6 correction: gate state = entity status matches a stage with gate:true
  // Must cross-reference entity status against workflow stage definitions

  function isEntityAtGate(entityStatus, stages) {
    if (!entityStatus || !stages || !stages.length) return false;
    var matchingStage = stages.find(function (s) {
      return s.name === entityStatus && s.gate === true;
    });
    return !!matchingStage;
  }

  function fetchWorkflowStages() {
    return apiFetch('/api/workflows').then(function (workflows) {
      // Find workflow containing our entity by matching entity path
      for (var i = 0; i < workflows.length; i++) {
        var wf = workflows[i];
        for (var j = 0; j < wf.entities.length; j++) {
          if (wf.entities[j].path === entityPath) {
            workflowStages = wf.stages;
            return wf.stages;
          }
        }
      }
      return null;
    });
  }

  function updateGatePanel(entityStatus, stages) {
    currentEntityStatus = entityStatus;
    if (!stages) stages = workflowStages;
    if (!stages) {
      gatePanel.style.display = 'none';
      return;
    }

    var atGate = isEntityAtGate(entityStatus, stages);
    if (!atGate) {
      gatePanel.style.display = 'none';
      return;
    }

    gatePanel.style.display = '';

    if (gateDecisionSent) {
      // Decision was sent from this UI session — keep showing resolved state
      return;
    }

    // Show pending state with action buttons
    gateStatusBadge.textContent = 'Pending Review';
    gateStatusBadge.className = 'gate-badge pending';
    gateActions.style.display = '';
    gateConfirm.style.display = 'none';
    gateResolved.style.display = 'none';
    gateApproveBtn.disabled = false;
    gateRequestChangesBtn.disabled = false;
  }

  // --- Gate Actions with Confirmation ---

  var pendingDecision = null;

  gateApproveBtn.addEventListener('click', function () {
    pendingDecision = 'approved';
    gateConfirmAction.textContent = 'approve';
    gateConfirmYes.className = 'btn gate-btn approve';
    gateActions.style.display = 'none';
    gateConfirm.style.display = '';
  });

  gateRequestChangesBtn.addEventListener('click', function () {
    pendingDecision = 'changes_requested';
    gateConfirmAction.textContent = 'request changes on';
    gateConfirmYes.className = 'btn gate-btn request-changes';
    gateActions.style.display = 'none';
    gateConfirm.style.display = '';
  });

  gateConfirmCancel.addEventListener('click', function () {
    pendingDecision = null;
    gateConfirm.style.display = 'none';
    gateActions.style.display = '';
  });

  gateConfirmYes.addEventListener('click', function () {
    if (!pendingDecision || !entityPath) return;
    var decision = pendingDecision;
    pendingDecision = null;

    // Disable all buttons immediately to prevent double-send
    gateApproveBtn.disabled = true;
    gateRequestChangesBtn.disabled = true;
    gateConfirmYes.disabled = true;
    gateConfirmCancel.disabled = true;

    // Extract entity slug from path (filename without .md)
    var pathParts = entityPath.split('/');
    var filename = pathParts[pathParts.length - 1];
    var entitySlug = filename.replace(/\.md$/, '');

    apiFetch('/api/entity/gate/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_path: entityPath,
        entity_slug: entitySlug,
        stage: currentEntityStatus,
        decision: decision,
      }),
    }).then(function () {
      gateDecisionSent = true;
      gateConfirm.style.display = 'none';
      gateActions.style.display = 'none';
      gateResolved.style.display = '';

      if (decision === 'approved') {
        gateStatusBadge.textContent = 'Approved';
        gateStatusBadge.className = 'gate-badge approved';
        gateResolvedText.textContent = 'Decision sent — waiting for FO to advance.';
      } else {
        gateStatusBadge.textContent = 'Changes Requested';
        gateStatusBadge.className = 'gate-badge changes-requested';
        gateResolvedText.textContent = 'Changes requested — FO will address feedback.';
      }

      // Start polling entity status to detect when FO advances past gate
      startStatusPoll();
    }).catch(function () {
      // Re-enable buttons on failure
      gateApproveBtn.disabled = false;
      gateRequestChangesBtn.disabled = false;
      gateConfirmYes.disabled = false;
      gateConfirmCancel.disabled = false;
      gateConfirm.style.display = 'none';
      gateActions.style.display = '';
    });
  });

  // --- Status Polling for Race Condition Detection ---
  // CLAIM-8 correction: no FO dedup — poll entity status to detect if gate resolved elsewhere

  function startStatusPoll() {
    if (statusPollTimer) return;
    statusPollTimer = setInterval(function () {
      if (!entityPath) return;
      apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function (data) {
          var newStatus = data.frontmatter.status;
          if (newStatus !== currentEntityStatus) {
            // Entity advanced past gate — update UI
            currentEntityStatus = newStatus;
            stopStatusPoll();
            var atGate = isEntityAtGate(newStatus, workflowStages);
            if (!atGate) {
              gateStatusBadge.textContent = 'Advanced';
              gateStatusBadge.className = 'gate-badge approved';
              gateResolvedText.textContent = 'Entity advanced to stage: ' + newStatus;
              gateResolved.style.display = '';
              gateActions.style.display = 'none';
            }
          }
        });
    }, 3000);
  }

  function stopStatusPoll() {
    if (statusPollTimer) {
      clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
  }

  // --- WebSocket for Real-time Gate Status ---

  var detailWs = null;
  var detailRetryCount = 0;
  var detailMaxRetries = 10;

  function getWsUrl() {
    var loc = window.location;
    var proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + loc.host + '/ws/activity';
  }

  function connectDetailWs() {
    detailWs = new WebSocket(getWsUrl());

    detailWs.onopen = function () {
      detailRetryCount = 0;
    };

    detailWs.onmessage = function (ev) {
      var msg = JSON.parse(ev.data);
      if (msg.type === 'event') {
        var event = msg.data.event;
        // If a gate_decision event arrives for our entity from another source
        if (event.type === 'gate_decision' && !gateDecisionSent) {
          // Gate was resolved elsewhere (e.g., CLI) — update UI
          gateDecisionSent = true;
          gateActions.style.display = 'none';
          gateConfirm.style.display = 'none';
          gateResolved.style.display = '';

          if (event.detail === 'approved') {
            gateStatusBadge.textContent = 'Approved (via CLI)';
            gateStatusBadge.className = 'gate-badge approved';
            gateResolvedText.textContent = 'Gate approved via another session.';
          } else {
            gateStatusBadge.textContent = 'Changes Requested (via CLI)';
            gateStatusBadge.className = 'gate-badge changes-requested';
            gateResolvedText.textContent = 'Changes requested via another session.';
          }
          startStatusPoll();
        }
      }
    };

    detailWs.onclose = function () {
      if (detailRetryCount < detailMaxRetries) {
        var delay = Math.min(500 * Math.pow(2, detailRetryCount), 30000);
        delay = delay * (0.75 + Math.random() * 0.5);
        detailRetryCount++;
        setTimeout(connectDetailWs, delay);
      }
    };

    detailWs.onerror = function () {};
  }

  // --- Initialize ---

  // Patch loadEntity to feed gate status after entity loads
  var _originalLoadEntity = loadEntity;
  window.loadEntity = function () {
    if (!entityPath) return;
    apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
      .then(function (data) {
        document.getElementById('entity-title').textContent = data.frontmatter.title || '(untitled)';
        document.title = (data.frontmatter.title || 'Entity') + ' \u2014 Spacedock';
        renderMetadata(data.frontmatter);
        renderBody(data.body);
        renderStageReports(data.stage_reports);
        renderTags(data.tags);
        initScore(data.frontmatter.score || '0');
        if (typeof loadComments === 'function') loadComments();

        // Gate status derivation
        var entityStatus = data.frontmatter.status;
        if (workflowStages) {
          updateGatePanel(entityStatus, workflowStages);
        } else {
          fetchWorkflowStages().then(function (stages) {
            updateGatePanel(entityStatus, stages);
          });
        }
      });
  };

  // Start WebSocket connection for real-time updates
  connectDetailWs();

  // Initial gate check on page load
  if (entityPath) {
    fetchWorkflowStages().then(function (stages) {
      if (!stages) return;
      apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function (data) {
          updateGatePanel(data.frontmatter.status, stages);
        });
    });
  }
})();
```

- [ ] **Step 2: Verify the WebSocket connects and gate panel appears for gated entities**

Open a gated entity detail page in the browser. If the entity's current status matches a gated stage, the gate panel should appear with Approve/Request Changes buttons. For non-gated entities, the panel remains hidden.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/static/detail.js
git commit -m "feat(detail): add WebSocket connection, gate status derivation, and gate actions"
```

---

## Task 6: Add gate_decision rendering to activity feed

**Files:**
- Modify: `tools/dashboard/static/activity.js`

- [ ] **Step 1: Add gate_decision event rendering**

In `tools/dashboard/static/activity.js`, find the `renderEntry` function (around line 108). Add `gate_decision` handling:

Change:

```javascript
  function renderEntry(entry) {
    var e = entry.event;
    if (e.type === "channel_message") {
      renderChannelMessage(entry);
    } else if (e.type === "channel_response") {
      renderChannelResponse(entry);
    } else if (e.type === "permission_request") {
      renderPermissionRequest(entry);
    } else if (e.type === "permission_response") {
      renderPermissionResponse(entry);
    } else {
      renderEvent(entry);
    }
  }
```

To:

```javascript
  function renderEntry(entry) {
    var e = entry.event;
    if (e.type === "channel_message") {
      renderChannelMessage(entry);
    } else if (e.type === "channel_response") {
      renderChannelResponse(entry);
    } else if (e.type === "permission_request") {
      renderPermissionRequest(entry);
    } else if (e.type === "permission_response") {
      renderPermissionResponse(entry);
    } else if (e.type === "gate_decision") {
      renderGateDecision(entry);
    } else {
      renderEvent(entry);
    }
  }
```

- [ ] **Step 2: Add the renderGateDecision function**

Add the following function after the `renderPermissionResponse` function (around line 411):

```javascript
  function renderGateDecision(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var e = entry.event;
    var isApproved = e.detail === "approved";

    var card = document.createElement("div");
    card.className = "permission-card resolved";

    var header = document.createElement("div");
    header.className = "perm-header";
    header.textContent = "Gate Decision";
    card.appendChild(header);

    var detail = document.createElement("div");
    detail.className = "perm-tool";
    detail.textContent = e.entity + " @ " + e.stage;
    card.appendChild(detail);

    var verdict = document.createElement("div");
    verdict.className = "perm-verdict";
    verdict.style.color = isApproved ? "#3fb950" : "#f85149";
    verdict.textContent = isApproved ? "Approved" : "Changes Requested";
    card.appendChild(verdict);

    var time = document.createElement("span");
    time.className = "bubble-time";
    time.textContent = timeAgo(e.timestamp);
    card.appendChild(time);

    feedContainer.insertBefore(card, feedContainer.firstChild);
    capFeedItems();
  }
```

- [ ] **Step 3: Add gate_decision to statusColor**

In the `statusColor` function (around line 89), add `gate_decision`:

Change:

```javascript
  function statusColor(type) {
    var colors = {
      dispatch: "#58a6ff",
      completion: "#3fb950",
      gate: "#f0883e",
      feedback: "#d2a8ff",
      merge: "#79c0ff",
      idle: "#8b949e",
    };
    return colors[type] || "#8b949e";
  }
```

To:

```javascript
  function statusColor(type) {
    var colors = {
      dispatch: "#58a6ff",
      completion: "#3fb950",
      gate: "#f0883e",
      gate_decision: "#f0883e",
      feedback: "#d2a8ff",
      merge: "#79c0ff",
      idle: "#8b949e",
    };
    return colors[type] || "#8b949e";
  }
```

- [ ] **Step 4: Verify gate_decision event renders in the activity feed**

In the browser, navigate to the dashboard main page. Open DevTools console and send a test event:

```javascript
fetch('/api/events', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    type: 'gate_decision',
    entity: 'test-entity',
    stage: 'plan',
    agent: 'captain',
    timestamp: new Date().toISOString(),
    detail: 'approved',
  })
});
```

A gate decision card should appear in the activity feed with "Approved" in green text.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/activity.js
git commit -m "feat(activity): render gate_decision events as resolved cards in feed"
```

---

## Task 7: Integration test — end-to-end gate approval flow

**Files:**
- Modify: `tools/dashboard/src/gate.test.ts`

- [ ] **Step 1: Add integration test for full gate decision flow**

Add the following test to the existing `POST /api/entity/gate/decision` describe block in `tools/dashboard/src/gate.test.ts`:

```typescript
  test("gate decision event appears in event buffer", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(200);

    // Verify event is in the buffer via GET /api/events
    const eventsRes = await fetch(`http://127.0.0.1:${server.port}/api/events`);
    const eventsData = await eventsRes.json() as { events: Array<{ event: { type: string; detail?: string } }> };
    const gateEvents = eventsData.events.filter(
      (e: { event: { type: string } }) => e.event.type === "gate_decision"
    );
    expect(gateEvents.length).toBeGreaterThan(0);
    expect(gateEvents[gateEvents.length - 1].event.detail).toBe("approved");
  });

  test("changes_requested decision is accepted", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "changes_requested",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify channel message has correct meta
    expect(channelMessages.length).toBe(1);
    expect(channelMessages[0].meta?.decision).toBe("changes_requested");
  });
```

- [ ] **Step 2: Run all gate tests**

Run: `cd tools/dashboard && bun test src/gate.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

Run: `cd tools/dashboard && bun test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/src/gate.test.ts
git commit -m "test(gate): add integration tests for gate decision event flow"
```

---

## Quality Gate Steps

After all tasks are complete, perform these verification steps:

- [ ] **QG-1: Type check** — Run: `cd tools/dashboard && bunx tsc --noEmit` — Expected: No errors
- [ ] **QG-2: Full test suite** — Run: `cd tools/dashboard && bun test` — Expected: All tests PASS
- [ ] **QG-3: Manual E2E — Gate panel visibility** — Navigate to an entity detail page where entity.status matches a gated stage. Verify the gate panel is visible with Approve/Request Changes buttons.
- [ ] **QG-4: Manual E2E — Approval flow** — Click Approve, confirm in the confirmation dialog. Verify: (1) buttons disable, (2) status badge changes to "Approved", (3) gate_decision event appears in activity feed, (4) channel message is sent to FO.
- [ ] **QG-5: Manual E2E — Non-gated entity** — Navigate to an entity whose status does NOT match a gated stage. Verify the gate panel is hidden.
- [ ] **QG-6: Manual E2E — Race condition detection** — After sending a gate decision, verify the status poll detects when the FO advances the entity past the gate (status changes).
