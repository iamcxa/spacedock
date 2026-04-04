# Observability Integration (PostHog + Sentry) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in PostHog analytics and Sentry error tracking to the Spacedock dashboard server, codex scripts, and dashboard UI — all no-op when unconfigured, metadata-only for privacy.

**Architecture:** A shared `tools/dashboard/telemetry.py` module provides guarded initialization and helper functions for both PostHog and Sentry. Each SDK is imported only when its env var is set (PostHog: `POSTHOG_API_KEY` + `POSTHOG_HOST`, Sentry: `SENTRY_DSN`). Server-side: Sentry captures request errors via a decorator on handler methods; PostHog tracks API mutation events. Agent-side: codex dispatch/finalize scripts emit PostHog events for workflow lifecycle. Client-side: optional PostHog JS snippet in dashboard HTML for page view analytics.

**Tech Stack:** Python 3 stdlib + optional `posthog` SDK (6 deps) + optional `sentry-sdk` (2 deps). PostHog JS client via CDN script tag. No Langfuse (removed from scope — Spacedock makes no LLM calls).

**Research corrections incorporated:**
1. Sentry has NO auto-instrumentation for `http.server.BaseHTTPRequestHandler` — all error capture uses manual `sentry_sdk.capture_exception()` via a decorator on `do_GET`/`do_POST`.
2. All SDKs use env-var-check-before-import guard pattern — never import if not configured.
3. PostHog `capture()` API supports arbitrary custom events for workflow tracking.
4. Privacy: manual instrumentation only, metadata properties explicitly constructed — never entity body content.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/telemetry.py` | Guarded init + helpers for PostHog and Sentry (~80 lines) |
| Create | `tests/test_telemetry.py` | Unit tests for telemetry module (guard logic, event helpers, Sentry decorator) |
| Modify | `tools/dashboard/serve.py` | Call `telemetry.init()` at startup |
| Modify | `tools/dashboard/handlers.py` | Wrap `do_GET`/`do_POST` with Sentry error capture decorator |
| Modify | `tools/dashboard/api.py` | Emit PostHog events on score/tag mutations |
| Modify | `scripts/codex_prepare_dispatch.py` | Emit PostHog `entity_dispatched` event |
| Modify | `scripts/codex_finalize_terminal_entity.py` | Emit PostHog `entity_completed` event |
| Modify | `tools/dashboard/static/index.html` | Add optional PostHog JS snippet (guarded by server-injected config) |
| Modify | `tools/dashboard/static/detail.html` | Add optional PostHog JS snippet (same pattern) |
| Modify | `tools/dashboard/handlers.py` | Add `/api/config` endpoint to expose PostHog JS key to frontend |
| Create | `tests/test_telemetry_codex.py` | Tests for codex script telemetry integration |
| Modify | `tests/test_dashboard_handlers.py` | Tests for Sentry decorator and /api/config endpoint |
| Modify | `tests/test_api.py` | Tests for PostHog event emission on mutations |
| Create | `requirements-optional.txt` | Optional dependency listing for PostHog + Sentry SDKs |

---

## Task 1: Telemetry Module — Guard Logic and PostHog Helpers

**Files:**
- Create: `tests/test_telemetry.py`
- Create: `tools/dashboard/telemetry.py`

The core module that gates all SDK access behind env var checks. Nothing imports PostHog or Sentry unless the corresponding env var is present.

- [ ] **Step 1: Write tests for guard logic and PostHog helpers**

  Create `tests/test_telemetry.py`:

  ```python
  """Tests for the telemetry module guard logic and helpers."""
  import os
  import unittest
  from unittest.mock import patch, MagicMock


  class TestTelemetryGuard(unittest.TestCase):
      """Verify SDK imports are gated by environment variables."""

      @patch.dict(os.environ, {}, clear=True)
      def test_init_no_env_vars_is_noop(self):
          """With no env vars set, init() does nothing and helpers are no-ops."""
          # Re-import to pick up patched env
          import importlib
          import tools.dashboard.telemetry as mod
          importlib.reload(mod)
          mod.init()
          self.assertFalse(mod.posthog_enabled())
          self.assertFalse(mod.sentry_enabled())

      @patch.dict(os.environ, {}, clear=True)
      def test_capture_event_noop_without_posthog(self):
          """capture_event() silently does nothing when PostHog is not configured."""
          import importlib
          import tools.dashboard.telemetry as mod
          importlib.reload(mod)
          mod.init()
          # Should not raise
          mod.capture_event('test_event', {'key': 'value'})

      @patch.dict(os.environ, {'POSTHOG_API_KEY': 'phc_test123', 'POSTHOG_HOST': 'https://app.posthog.com'}, clear=True)
      def test_posthog_enabled_with_env_var(self):
          """posthog_enabled() returns True when POSTHOG_API_KEY is set."""
          import importlib
          import tools.dashboard.telemetry as mod
          importlib.reload(mod)
          # Mock the actual posthog import since SDK may not be installed
          mock_posthog = MagicMock()
          with patch.dict('sys.modules', {'posthog': mock_posthog}):
              importlib.reload(mod)
              mod.init()
              self.assertTrue(mod.posthog_enabled())

      @patch.dict(os.environ, {'POSTHOG_API_KEY': 'phc_test123', 'POSTHOG_HOST': 'https://app.posthog.com'}, clear=True)
      def test_capture_event_calls_posthog(self):
          """capture_event() calls posthog.capture() with correct args."""
          import importlib
          import tools.dashboard.telemetry as mod
          mock_posthog = MagicMock()
          with patch.dict('sys.modules', {'posthog': mock_posthog}):
              importlib.reload(mod)
              mod.init()
              mod.capture_event('entity_dispatched', {'stage': 'execute', 'slug': 'my-entity'})
              mock_posthog.capture.assert_called_once_with(
                  'spacedock-server',
                  'entity_dispatched',
                  {'stage': 'execute', 'slug': 'my-entity'},
              )

      @patch.dict(os.environ, {'POSTHOG_API_KEY': 'phc_test123', 'POSTHOG_HOST': 'https://app.posthog.com'}, clear=True)
      def test_posthog_import_error_graceful(self):
          """If posthog package is not installed, init() logs warning and stays disabled."""
          import importlib
          import tools.dashboard.telemetry as mod
          # Simulate ImportError by removing posthog from sys.modules and patching import
          with patch.dict('sys.modules', {'posthog': None}):
              importlib.reload(mod)
              mod.init()
              self.assertFalse(mod.posthog_enabled())


  if __name__ == '__main__':
      unittest.main()
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry.py -v
  ```

  Expected: ModuleNotFoundError or ImportError for `tools.dashboard.telemetry`.

- [ ] **Step 3: Implement `tools/dashboard/telemetry.py` — guard logic and PostHog helpers**

  ```python
  """Observability integration — opt-in PostHog analytics and Sentry error tracking.

  All SDK imports are gated behind environment variable checks. When the
  corresponding env var is absent, helpers are silent no-ops. This module
  is the ONLY place that imports posthog or sentry_sdk.

  Environment variables:
      POSTHOG_API_KEY  — PostHog project API key (enables analytics)
      POSTHOG_HOST     — PostHog instance URL (default: https://us.i.posthog.com)
      SENTRY_DSN       — Sentry DSN (enables error tracking)
  """

  import os
  import sys

  # Module-level state — set by init()
  _posthog = None
  _sentry_sdk = None


  def init():
      """Initialize enabled SDKs. Call once at server startup.

      Safe to call multiple times — re-initializes from current env vars.
      """
      global _posthog, _sentry_sdk
      _posthog = None
      _sentry_sdk = None

      # PostHog — analytics
      api_key = os.environ.get('POSTHOG_API_KEY')
      if api_key:
          try:
              import posthog
              posthog.project_api_key = api_key
              posthog.host = os.environ.get('POSTHOG_HOST', 'https://us.i.posthog.com')
              _posthog = posthog
          except (ImportError, Exception) as exc:
              print('[telemetry] PostHog configured but SDK not available: %s' % exc, file=sys.stderr)

      # Sentry — error tracking
      dsn = os.environ.get('SENTRY_DSN')
      if dsn:
          try:
              import sentry_sdk
              sentry_sdk.init(dsn=dsn, send_default_pii=False, traces_sample_rate=0.0)
              _sentry_sdk = sentry_sdk
          except (ImportError, Exception) as exc:
              print('[telemetry] Sentry configured but SDK not available: %s' % exc, file=sys.stderr)


  def posthog_enabled():
      """Return True if PostHog is initialized and ready."""
      return _posthog is not None


  def sentry_enabled():
      """Return True if Sentry is initialized and ready."""
      return _sentry_sdk is not None


  def capture_event(event_name, properties=None):
      """Send a PostHog event. No-op if PostHog is not configured.

      Args:
          event_name: Event name (e.g. 'entity_dispatched', 'score_updated').
          properties: Dict of metadata properties. MUST NOT contain entity body
                      content — only slugs, stage names, counts, durations.
      """
      if _posthog is None:
          return
      _posthog.capture('spacedock-server', event_name, properties or {})


  def capture_exception(exc=None):
      """Send an exception to Sentry. No-op if Sentry is not configured.

      Args:
          exc: Exception instance. If None, captures current exception from sys.exc_info().
      """
      if _sentry_sdk is None:
          return
      _sentry_sdk.capture_exception(exc)


  def get_posthog_js_config():
      """Return PostHog JS config dict for frontend, or None if not configured.

      Returns dict with 'apiKey' and 'host' for the frontend PostHog JS snippet.
      Only returns the API key (which is a public project key, safe for frontend).
      """
      api_key = os.environ.get('POSTHOG_API_KEY')
      if not api_key:
          return None
      return {
          'apiKey': api_key,
          'host': os.environ.get('POSTHOG_HOST', 'https://us.i.posthog.com'),
      }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry.py -v
  ```

  Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/telemetry.py tests/test_telemetry.py
  git commit -m "feat: add telemetry module with env-var-gated PostHog helpers"
  ```

---

## Task 2: Telemetry Module — Sentry Error Capture Decorator

**Files:**
- Modify: `tests/test_telemetry.py` (add Sentry tests)
- Modify: `tools/dashboard/telemetry.py` (add Sentry decorator)

Add the `sentry_wrap` decorator for handler methods. Research confirmed Sentry has NO auto-instrumentation for `BaseHTTPRequestHandler`, so this decorator provides manual `capture_exception()` wrapping.

- [ ] **Step 1: Add Sentry decorator tests to `tests/test_telemetry.py`**

  Append to the existing test file:

  ```python
  class TestSentryDecorator(unittest.TestCase):
      """Test the sentry_wrap decorator for request handler methods."""

      @patch.dict(os.environ, {}, clear=True)
      def test_sentry_wrap_noop_without_sentry(self):
          """When Sentry is not configured, sentry_wrap passes through exceptions unchanged."""
          import importlib
          import tools.dashboard.telemetry as mod
          importlib.reload(mod)
          mod.init()

          @mod.sentry_wrap
          def failing_handler(self_arg):
              raise ValueError('test error')

          with self.assertRaises(ValueError):
              failing_handler(None)

      @patch.dict(os.environ, {'SENTRY_DSN': 'https://key@sentry.io/123'}, clear=True)
      def test_sentry_wrap_captures_and_reraises(self):
          """When Sentry is configured, sentry_wrap captures the exception and re-raises."""
          import importlib
          import tools.dashboard.telemetry as mod
          mock_sentry = MagicMock()
          with patch.dict('sys.modules', {'sentry_sdk': mock_sentry}):
              importlib.reload(mod)
              mod.init()

              @mod.sentry_wrap
              def failing_handler(self_arg):
                  raise ValueError('test error')

              with self.assertRaises(ValueError):
                  failing_handler(None)

              mock_sentry.capture_exception.assert_called_once()

      @patch.dict(os.environ, {'SENTRY_DSN': 'https://key@sentry.io/123'}, clear=True)
      def test_sentry_wrap_no_exception_passes_through(self):
          """When no exception, sentry_wrap is transparent."""
          import importlib
          import tools.dashboard.telemetry as mod
          mock_sentry = MagicMock()
          with patch.dict('sys.modules', {'sentry_sdk': mock_sentry}):
              importlib.reload(mod)
              mod.init()

              @mod.sentry_wrap
              def ok_handler(self_arg):
                  return 'ok'

              result = ok_handler(None)
              self.assertEqual(result, 'ok')
              mock_sentry.capture_exception.assert_not_called()
  ```

- [ ] **Step 2: Run tests to verify the new tests fail**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry.py::TestSentryDecorator -v
  ```

  Expected: AttributeError — `sentry_wrap` not defined.

- [ ] **Step 3: Add `sentry_wrap` decorator to `tools/dashboard/telemetry.py`**

  Add after the `capture_exception` function:

  ```python
  import functools


  def sentry_wrap(method):
      """Decorator for HTTP handler methods. Captures exceptions to Sentry then re-raises.

      Usage:
          @sentry_wrap
          def do_GET(self):
              ...

      When Sentry is not configured, this is a transparent pass-through.
      The exception is always re-raised so the handler's normal error
      response logic still fires.
      """
      @functools.wraps(method)
      def wrapper(*args, **kwargs):
          try:
              return method(*args, **kwargs)
          except Exception:
              capture_exception()
              raise
      return wrapper
  ```

  Move the `import functools` to the top of the file alongside the other stdlib imports.

- [ ] **Step 4: Run all telemetry tests**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry.py -v
  ```

  Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/telemetry.py tests/test_telemetry.py
  git commit -m "feat: add sentry_wrap decorator for manual exception capture"
  ```

---

## Task 3: Wire Telemetry into Dashboard Server

**Files:**
- Modify: `tools/dashboard/serve.py:21-58`
- Modify: `tools/dashboard/handlers.py:42,60` (do_GET, do_POST)
- Modify: `tests/test_dashboard_handlers.py` (add Sentry integration tests)

Initialize telemetry at server startup and wrap handler methods with Sentry error capture.

- [ ] **Step 1: Add handler Sentry integration tests**

  Add to `tests/test_dashboard_handlers.py`:

  ```python
  class TestHandlerSentryIntegration(unittest.TestCase):
      """Verify that handler errors are captured by Sentry decorator."""

      def test_do_get_has_sentry_wrap(self):
          """do_GET and do_POST should be decorated with sentry_wrap."""
          from tools.dashboard.handlers import make_handler
          handler_cls = make_handler('/tmp', '/tmp')
          # The decorated function should have __wrapped__ attribute
          self.assertTrue(
              hasattr(handler_cls.do_GET, '__wrapped__'),
              'do_GET should be decorated with sentry_wrap'
          )
          self.assertTrue(
              hasattr(handler_cls.do_POST, '__wrapped__'),
              'do_POST should be decorated with sentry_wrap'
          )
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_dashboard_handlers.py::TestHandlerSentryIntegration -v
  ```

  Expected: FAIL — `do_GET` does not have `__wrapped__`.

- [ ] **Step 3: Add `sentry_wrap` to handler methods in `handlers.py`**

  At the top of `tools/dashboard/handlers.py`, add the import:

  ```python
  from tools.dashboard.telemetry import sentry_wrap
  ```

  Inside `make_handler()`, decorate `do_GET` and `do_POST`:

  ```python
  @sentry_wrap
  def do_GET(self):
      parsed = urllib.parse.urlparse(self.path)
      # ... rest unchanged
  ```

  ```python
  @sentry_wrap
  def do_POST(self):
      parsed = urllib.parse.urlparse(self.path)
      # ... rest unchanged
  ```

- [ ] **Step 4: Add telemetry init to `serve.py`**

  In `tools/dashboard/serve.py`, add the import:

  ```python
  from tools.dashboard.telemetry import init as telemetry_init
  ```

  In the `main()` function, call `telemetry_init()` right before creating the handler class (around line 42):

  ```python
  # Initialize optional observability (PostHog analytics, Sentry error tracking)
  telemetry_init()

  handler_class = make_handler(project_root=project_root, static_dir=static_dir, log_file=args.log_file)
  ```

- [ ] **Step 5: Run all handler tests**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_dashboard_handlers.py -v
  ```

  Expected: All tests pass (existing + new Sentry integration test).

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/serve.py tools/dashboard/handlers.py tests/test_dashboard_handlers.py
  git commit -m "feat: wire Sentry error capture into dashboard request handlers"
  ```

---

## Task 4: PostHog Events for API Mutations

**Files:**
- Modify: `tools/dashboard/api.py:31-51`
- Modify: `tests/test_api.py` (add telemetry tests)

Emit PostHog events when entities are mutated (score update, tag update). Only metadata is sent — slug and new values, never entity body content.

- [ ] **Step 1: Add telemetry event tests to `tests/test_api.py`**

  ```python
  class TestApiTelemetry(unittest.TestCase):
      """Verify PostHog events are emitted on entity mutations."""

      def setUp(self):
          self.tmpdir = tempfile.mkdtemp()
          self.entity_path = os.path.join(self.tmpdir, 'test-entity.md')
          with open(self.entity_path, 'w') as f:
              f.write('---\ntitle: Test Entity\nscore: 0.5\ntags:\n---\n\nBody text.\n')

      def tearDown(self):
          import shutil
          shutil.rmtree(self.tmpdir)

      @patch('tools.dashboard.api.capture_event')
      def test_update_score_emits_event(self, mock_capture):
          from tools.dashboard.api import update_score
          update_score(self.entity_path, 0.9)
          mock_capture.assert_called_once_with('score_updated', {
              'slug': 'test-entity',
              'new_score': 0.9,
          })

      @patch('tools.dashboard.api.capture_event')
      def test_update_tags_emits_event(self, mock_capture):
          from tools.dashboard.api import update_tags
          update_tags(self.entity_path, 'urgent,important')
          mock_capture.assert_called_once_with('tags_updated', {
              'slug': 'test-entity',
              'tag_count': 2,
          })
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_api.py::TestApiTelemetry -v
  ```

  Expected: FAIL — `capture_event` not imported in `api.py`.

- [ ] **Step 3: Add PostHog events to `tools/dashboard/api.py`**

  Add import at the top of `api.py`:

  ```python
  from tools.dashboard.telemetry import capture_event
  ```

  In `update_score()`, after the file write, add:

  ```python
  def update_score(filepath, new_score):
      """Update the score field in an entity file."""
      with open(filepath) as f:
          text = f.read()
      updated = update_entity_score(text, new_score)
      with open(filepath, 'w') as f:
          f.write(updated)
      slug = os.path.splitext(os.path.basename(filepath))[0]
      capture_event('score_updated', {'slug': slug, 'new_score': new_score})
  ```

  In `update_tags()`, after the file write, add:

  ```python
  def update_tags(filepath, tags):
      """Update the tags field in an entity file."""
      with open(filepath) as f:
          text = f.read()
      updated = update_entity_tags(text, tags)
      with open(filepath, 'w') as f:
          f.write(updated)
      slug = os.path.splitext(os.path.basename(filepath))[0]
      tag_list = [t.strip() for t in tags.split(',') if t.strip()] if tags else []
      capture_event('tags_updated', {'slug': slug, 'tag_count': len(tag_list)})
  ```

- [ ] **Step 4: Run API tests**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_api.py -v
  ```

  Expected: All tests pass (existing + new telemetry tests).

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/api.py tests/test_api.py
  git commit -m "feat: emit PostHog events on entity score and tag updates"
  ```

---

## Task 5: Codex Script Telemetry — Dispatch and Finalization Events

**Files:**
- Modify: `scripts/codex_prepare_dispatch.py`
- Modify: `scripts/codex_finalize_terminal_entity.py`
- Create: `tests/test_telemetry_codex.py`

These scripts are the agent-side telemetry emission points. When an entity is dispatched or finalized, emit a PostHog event with workflow metadata only.

- [ ] **Step 1: Write tests for codex script telemetry**

  Create `tests/test_telemetry_codex.py`:

  ```python
  """Tests for telemetry integration in codex dispatch/finalize scripts."""
  import os
  import unittest
  from unittest.mock import patch, MagicMock


  class TestDispatchTelemetry(unittest.TestCase):
      """Verify entity_dispatched event is emitted during dispatch."""

      @patch('tools.dashboard.telemetry.capture_event')
      @patch('tools.dashboard.telemetry.init')
      def test_emit_dispatch_event(self, mock_init, mock_capture):
          """emit_dispatch_event sends correct metadata."""
          from scripts.codex_prepare_dispatch import emit_dispatch_event
          emit_dispatch_event(
              entity_path='/path/to/my-feature.md',
              stage_name='execute',
              agent_id='ensign-my-feature',
          )
          mock_capture.assert_called_once_with('entity_dispatched', {
              'slug': 'my-feature',
              'stage': 'execute',
              'agent_id': 'ensign-my-feature',
          })

      @patch.dict(os.environ, {}, clear=True)
      def test_emit_dispatch_event_noop_without_config(self):
          """Without POSTHOG_API_KEY, emit_dispatch_event is silent."""
          import importlib
          import tools.dashboard.telemetry as tel
          importlib.reload(tel)
          tel.init()
          # Should not raise
          from scripts.codex_prepare_dispatch import emit_dispatch_event
          emit_dispatch_event('/path/to/entity.md', 'plan', 'ensign-entity')


  class TestFinalizeTelemetry(unittest.TestCase):
      """Verify entity_completed event is emitted during finalization."""

      @patch('tools.dashboard.telemetry.capture_event')
      @patch('tools.dashboard.telemetry.init')
      def test_emit_finalize_event(self, mock_init, mock_capture):
          """emit_finalize_event sends correct metadata."""
          from scripts.codex_finalize_terminal_entity import emit_finalize_event
          emit_finalize_event(
              entity_path='/path/to/my-feature.md',
              verdict='accepted',
          )
          mock_capture.assert_called_once_with('entity_completed', {
              'slug': 'my-feature',
              'verdict': 'accepted',
          })


  if __name__ == '__main__':
      unittest.main()
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry_codex.py -v
  ```

  Expected: ImportError — `emit_dispatch_event` not defined.

- [ ] **Step 3: Add `emit_dispatch_event` to `scripts/codex_prepare_dispatch.py`**

  Add at the top of the file (after existing imports):

  ```python
  import os
  ```

  Add the telemetry helper function (before `main()` or at module level):

  ```python
  def emit_dispatch_event(entity_path, stage_name, agent_id):
      """Emit a PostHog event for entity dispatch. No-op if unconfigured."""
      if not os.environ.get('POSTHOG_API_KEY'):
          return
      try:
          from tools.dashboard.telemetry import init, capture_event
          init()
          slug = Path(entity_path).stem
          capture_event('entity_dispatched', {
              'slug': slug,
              'stage': stage_name,
              'agent_id': agent_id,
          })
      except Exception:
          pass  # Telemetry must never block dispatch
  ```

  Call it in the main flow, after the dispatch JSON is output but before the script exits. Find the point where the script prints its JSON output and add:

  ```python
  emit_dispatch_event(str(entity_path), stage_name, dispatch_agent_id)
  ```

- [ ] **Step 4: Add `emit_finalize_event` to `scripts/codex_finalize_terminal_entity.py`**

  Same pattern. Add the helper function:

  ```python
  def emit_finalize_event(entity_path, verdict):
      """Emit a PostHog event for entity completion. No-op if unconfigured."""
      if not os.environ.get('POSTHOG_API_KEY'):
          return
      try:
          from tools.dashboard.telemetry import init, capture_event
          init()
          slug = Path(entity_path).stem
          capture_event('entity_completed', {
              'slug': slug,
              'verdict': verdict,
          })
      except Exception:
          pass  # Telemetry must never block finalization
  ```

  Call it in the main flow after the finalization JSON is output:

  ```python
  emit_finalize_event(str(entity_path), verdict)
  ```

- [ ] **Step 5: Run codex telemetry tests**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_telemetry_codex.py -v
  ```

  Expected: All 3 tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add scripts/codex_prepare_dispatch.py scripts/codex_finalize_terminal_entity.py tests/test_telemetry_codex.py
  git commit -m "feat: emit PostHog events on entity dispatch and finalization"
  ```

---

## Task 6: Frontend PostHog JS Integration

**Files:**
- Modify: `tools/dashboard/handlers.py` (add `/api/config` endpoint)
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/detail.html`
- Modify: `tests/test_dashboard_handlers.py` (test /api/config)

Add optional client-side PostHog analytics. The server exposes a `/api/config` endpoint that returns the PostHog JS key (if configured). Frontend pages load PostHog JS conditionally based on this config.

- [ ] **Step 1: Add tests for `/api/config` endpoint**

  Add to `tests/test_dashboard_handlers.py`:

  ```python
  class TestConfigEndpoint(unittest.TestCase):
      """Tests for the /api/config endpoint."""

      def setUp(self):
          self.tmpdir = tempfile.mkdtemp()
          handler_cls = make_handler(self.tmpdir, os.path.join(self.tmpdir, 'static'))
          self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_cls)
          self.port = self.server.server_address[1]
          self.thread = threading.Thread(target=self.server.serve_forever)
          self.thread.start()

      def tearDown(self):
          self.server.shutdown()
          self.thread.join()
          import shutil
          shutil.rmtree(self.tmpdir)

      @patch.dict(os.environ, {}, clear=True)
      def test_config_no_posthog(self):
          """Without POSTHOG_API_KEY, config returns empty posthog field."""
          import importlib
          import tools.dashboard.telemetry as tel
          importlib.reload(tel)

          resp = urllib.request.urlopen('http://127.0.0.1:%d/api/config' % self.port)
          data = json.loads(resp.read())
          self.assertIsNone(data.get('posthog'))

      @patch.dict(os.environ, {'POSTHOG_API_KEY': 'phc_test', 'POSTHOG_HOST': 'https://app.posthog.com'}, clear=True)
      def test_config_with_posthog(self):
          """With POSTHOG_API_KEY, config returns key and host."""
          import importlib
          import tools.dashboard.telemetry as tel
          importlib.reload(tel)

          resp = urllib.request.urlopen('http://127.0.0.1:%d/api/config' % self.port)
          data = json.loads(resp.read())
          self.assertEqual(data['posthog']['apiKey'], 'phc_test')
          self.assertEqual(data['posthog']['host'], 'https://app.posthog.com')
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_dashboard_handlers.py::TestConfigEndpoint -v
  ```

  Expected: FAIL — 404 or route not found.

- [ ] **Step 3: Add `/api/config` route to `handlers.py`**

  Add import at top of `handlers.py`:

  ```python
  from tools.dashboard.telemetry import get_posthog_js_config
  ```

  In `do_GET`, add a new route before the static file fallback:

  ```python
  elif path == '/api/config':
      self._handle_config()
  ```

  Add the handler method inside `DashboardHandler`:

  ```python
  def _handle_config(self):
      config = {
          'posthog': get_posthog_js_config(),
      }
      self._send_json(config)
  ```

- [ ] **Step 4: Add PostHog JS snippet to `index.html`**

  Before the closing `</body>` tag in `tools/dashboard/static/index.html`, add:

  ```html
  <script>
  // Optional PostHog analytics — loaded only when server has PostHog configured
  fetch('/api/config').then(r => r.json()).then(config => {
      if (!config.posthog) return;
      const script = document.createElement('script');
      script.src = 'https://us-assets.i.posthog.com/static/array.js';
      script.onload = () => {
          posthog.init(config.posthog.apiKey, {
              api_host: config.posthog.host,
              autocapture: false,
              capture_pageview: true,
          });
      };
      document.head.appendChild(script);
  }).catch(() => {});  // Silently skip if config unavailable
  </script>
  ```

- [ ] **Step 5: Add the same PostHog JS snippet to `detail.html`**

  Add the identical `<script>` block before `</body>` in `tools/dashboard/static/detail.html`.

- [ ] **Step 6: Run handler tests**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/test_dashboard_handlers.py -v
  ```

  Expected: All tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add tools/dashboard/handlers.py tools/dashboard/static/index.html tools/dashboard/static/detail.html tests/test_dashboard_handlers.py
  git commit -m "feat: add /api/config endpoint and optional PostHog JS for frontend analytics"
  ```

---

## Task 7: Optional Dependencies File and Documentation

**Files:**
- Create: `requirements-optional.txt`

This is the project's first dependency file. It lists only the optional observability SDKs. The project continues to work without them installed.

- [ ] **Step 1: Create `requirements-optional.txt`**

  ```
  # Optional observability dependencies for Spacedock dashboard.
  # Install with: pip install -r requirements-optional.txt
  # The dashboard works without these — all integrations are no-op when unconfigured.

  posthog>=3.0,<4.0
  sentry-sdk>=2.0,<3.0
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add requirements-optional.txt
  git commit -m "feat: add optional dependency listing for PostHog and Sentry SDKs"
  ```

---

## Task 8: Full Test Suite and Quality Gates

**Files:** All test files.

Run the complete test suite and verify all quality gates pass.

- [ ] **Step 1: Run the full test suite**

  ```bash
  cd /path/to/spacedock && python3 -m pytest tests/ -v
  ```

  Expected: All tests pass. Fix any failures before proceeding.

- [ ] **Step 2: Verify no-op behavior without SDKs**

  ```bash
  # Unset all observability env vars and start the server
  unset POSTHOG_API_KEY POSTHOG_HOST SENTRY_DSN
  python3 -m tools.dashboard.serve --port 8421 --root .
  # Verify: server starts normally, no errors, no telemetry warnings
  # Ctrl+C to stop
  ```

  Expected: Clean startup with no telemetry messages. All existing functionality works identically.

- [ ] **Step 3: Verify guard pattern — import without SDK installed**

  ```bash
  # With env vars set but SDKs NOT pip-installed
  POSTHOG_API_KEY=phc_test SENTRY_DSN=https://key@sentry.io/123 python3 -c "
  from tools.dashboard.telemetry import init, posthog_enabled, sentry_enabled
  init()
  print('PostHog enabled:', posthog_enabled())
  print('Sentry enabled:', sentry_enabled())
  "
  ```

  Expected: Both print `False`. Stderr shows `[telemetry] ... SDK not available` messages. No crash.

- [ ] **Step 4: Privacy verification — grep for body content leaks**

  ```bash
  # Verify that telemetry calls never send entity body content
  grep -rn 'capture_event\|capture_exception\|posthog\.capture' tools/ scripts/ | grep -v test | grep -v '.pyc'
  ```

  Review output: every `capture_event` call should only pass metadata keys (slug, stage, score, tag_count, verdict, agent_id). No file content, body text, or user data.

- [ ] **Step 5: Commit (if any fixes were needed)**

  ```bash
  git add -A && git commit -m "fix: address quality gate findings"
  ```

  Skip this step if no fixes were needed.

---

## Quality Gates

These gates must pass before the feature is considered complete:

1. **Unit tests pass:** `python3 -m pytest tests/ -v` — all tests green
2. **No-op verification:** Server starts and runs normally with no observability env vars set
3. **Guard verification:** With env vars set but SDKs not installed, server starts with warning messages (not crashes)
4. **Privacy audit:** All `capture_event` calls send only metadata (slugs, stage names, counts, durations) — never entity body content
5. **Dependency isolation:** `requirements-optional.txt` lists only `posthog` and `sentry-sdk` — no Langfuse
6. **Frontend conditional:** `/api/config` returns `null` posthog when `POSTHOG_API_KEY` is unset; PostHog JS only loads when config is present
7. **Backward compatibility:** All existing tests pass without modification. No existing behavior changed.
