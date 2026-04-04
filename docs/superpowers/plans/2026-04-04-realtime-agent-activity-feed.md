# Real-time Agent Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream agent lifecycle events (dispatch, completion, gate, feedback) from the First Officer to the dashboard UI in real-time via WebSocket, so the captain sees a live activity feed of what each agent is working on.

**Architecture:** The FO (an AI agent, not a Python process) emits events via `curl -X POST /api/events` to the dashboard server. The dashboard server runs a `websockets` asyncio server in a background thread alongside the existing `ThreadingHTTPServer`. The REST event endpoint bridges to WebSocket by scheduling broadcasts via `asyncio.run_coroutine_threadsafe()`. Browser JS opens a WebSocket connection with manual reconnection (exponential backoff) and renders events in a live feed panel.

**Tech Stack:** Python 3 (`websockets` library -- first external dependency), asyncio, stdlib `http.server`, vanilla JavaScript WebSocket API.

**Research corrections incorporated:**
1. JavaScript WebSocket has NO auto-reconnect -- must implement manually with exponential backoff (~20-30 LOC)
2. `websockets.broadcast()` is NOT thread-safe -- must call via `asyncio.run_coroutine_threadsafe()` from HTTP handler thread
3. Architecture: FO -> REST POST `/api/events` -> Dashboard server -> WebSocket broadcast -> Browser

**First external dependency:**
The `websockets` library is the first non-stdlib Python dependency in this project. This plan adds a `requirements.txt` at the project root with installation instructions. The dependency is optional -- the dashboard starts without it (WebSocket feature disabled, REST-only mode).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `requirements.txt` | First external dependency declaration (`websockets>=15.0`) |
| Create | `tools/dashboard/websocket_server.py` | Asyncio WebSocket server thread: start, broadcast, event buffer, client management |
| Create | `tools/dashboard/events.py` | Event data model, in-memory ring buffer, sequence numbering |
| Modify | `tools/dashboard/handlers.py` | Add `POST /api/events` route, wire broadcast via WS server reference |
| Modify | `tools/dashboard/serve.py` | Start WebSocket thread alongside HTTP server, add `--ws-port` argument |
| Create | `tools/dashboard/static/activity.js` | WebSocket client: connect, reconnect with backoff, render activity feed |
| Modify | `tools/dashboard/static/index.html` | Add activity feed panel and `activity.js` script tag |
| Modify | `tools/dashboard/static/style.css` | Activity feed panel styling (dark theme consistent) |
| Modify | `references/first-officer-shared-core.md` | Add event emission instructions at 6 lifecycle injection points |
| Create | `tests/test_events.py` | Unit tests for event buffer, sequence numbering |
| Create | `tests/test_websocket_server.py` | Integration tests for WebSocket server thread + broadcast |
| Modify | `tests/test_dashboard_handlers.py` | Add tests for `POST /api/events` endpoint |

---

## Task 1: Dependency Management -- requirements.txt

**Files:**
- Create: `requirements.txt`

This is the first external Python dependency in the project. Keep it minimal.

- [ ] **Step 1: Create `requirements.txt`**

  ```
  websockets>=15.0
  ```

- [ ] **Step 2: Verify installation**

  Run: `pip3 install -r requirements.txt`
  Expected: `websockets` installs (or "already satisfied" if present).

- [ ] **Step 3: Verify import works**

  Run: `python3 -c "import websockets; print(websockets.__version__)"`
  Expected: prints version (15.x).

- [ ] **Step 4: Commit**

  ```bash
  git add requirements.txt
  git commit -m "feat: add requirements.txt with websockets dependency"
  ```

---

## Task 2: Event Data Model and Ring Buffer -- events.py

**Files:**
- Create: `tools/dashboard/events.py`
- Create: `tests/test_events.py`

The event buffer stores events in memory with sequence numbers. Clients reconnect with `?since=N` and replay missed events. Buffer is bounded (default 500 events) -- oldest are dropped when full.

- [ ] **Step 1: Write tests for EventBuffer**

  Create `tests/test_events.py`:

  ```python
  """Tests for event buffer and sequence numbering."""

  import unittest

  from tools.dashboard.events import EventBuffer, make_event


  class TestMakeEvent(unittest.TestCase):
      """Test event creation."""

      def test_make_event_includes_all_fields(self):
          event = make_event(
              event_type="dispatch",
              entity="dashboard-persistent-daemon",
              stage="execute",
              agent="ensign",
          )
          self.assertEqual(event["type"], "dispatch")
          self.assertEqual(event["entity"], "dashboard-persistent-daemon")
          self.assertEqual(event["stage"], "execute")
          self.assertEqual(event["agent"], "ensign")
          self.assertIn("timestamp", event)

      def test_make_event_optional_message(self):
          event = make_event(
              event_type="gate",
              entity="feat-x",
              stage="quality",
              agent="ensign",
              message="3 done, 0 skipped, 0 failed",
          )
          self.assertEqual(event["message"], "3 done, 0 skipped, 0 failed")

      def test_make_event_without_message(self):
          event = make_event(
              event_type="dispatch",
              entity="feat-x",
              stage="execute",
              agent="ensign",
          )
          self.assertNotIn("message", event)


  class TestEventBuffer(unittest.TestCase):
      """Test ring buffer with sequence numbers."""

      def test_append_assigns_sequential_ids(self):
          buf = EventBuffer(max_size=10)
          e1 = make_event("dispatch", "a", "execute", "ensign")
          e2 = make_event("completion", "a", "execute", "ensign")
          buf.append(e1)
          buf.append(e2)
          events = buf.since(0)
          self.assertEqual(len(events), 2)
          self.assertEqual(events[0]["seq"], 1)
          self.assertEqual(events[1]["seq"], 2)

      def test_since_returns_events_after_seq(self):
          buf = EventBuffer(max_size=10)
          for i in range(5):
              buf.append(make_event("dispatch", "e%d" % i, "plan", "ensign"))
          events = buf.since(3)
          self.assertEqual(len(events), 2)
          self.assertEqual(events[0]["seq"], 4)
          self.assertEqual(events[1]["seq"], 5)

      def test_since_zero_returns_all(self):
          buf = EventBuffer(max_size=10)
          buf.append(make_event("dispatch", "a", "plan", "ensign"))
          buf.append(make_event("dispatch", "b", "plan", "ensign"))
          events = buf.since(0)
          self.assertEqual(len(events), 2)

      def test_ring_buffer_drops_oldest(self):
          buf = EventBuffer(max_size=3)
          for i in range(5):
              buf.append(make_event("dispatch", "e%d" % i, "plan", "ensign"))
          events = buf.since(0)
          self.assertEqual(len(events), 3)
          self.assertEqual(events[0]["seq"], 3)
          self.assertEqual(events[2]["seq"], 5)

      def test_empty_buffer_returns_empty(self):
          buf = EventBuffer(max_size=10)
          events = buf.since(0)
          self.assertEqual(events, [])

      def test_all_returns_copy(self):
          buf = EventBuffer(max_size=10)
          buf.append(make_event("dispatch", "a", "plan", "ensign"))
          all_events = buf.all()
          self.assertEqual(len(all_events), 1)
          all_events.clear()
          self.assertEqual(len(buf.all()), 1)


  if __name__ == "__main__":
      unittest.main()
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `python3 -m pytest tests/test_events.py -v`
  Expected: ImportError -- `tools.dashboard.events` does not exist yet.

- [ ] **Step 3: Implement events.py**

  Create `tools/dashboard/events.py`:

  ```python
  """Event data model and in-memory ring buffer for activity feed.

  Events are structured dicts with sequence numbers assigned by the buffer.
  The buffer is bounded -- oldest events are dropped when full.
  Clients reconnect with ?since=N to replay missed events.
  """

  import threading
  import time


  def make_event(event_type, entity, stage, agent, message=None):
      """Create a structured event dict.

      Args:
          event_type: One of "dispatch", "completion", "gate", "feedback".
          entity: Entity slug (e.g., "dashboard-persistent-daemon").
          stage: Stage name (e.g., "execute", "quality").
          agent: Agent identifier (e.g., "ensign").
          message: Optional human-readable detail.

      Returns:
          Dict with type, entity, stage, agent, timestamp, and optional message.
      """
      event = {
          "type": event_type,
          "entity": entity,
          "stage": stage,
          "agent": agent,
          "timestamp": time.time(),
      }
      if message is not None:
          event["message"] = message
      return event


  class EventBuffer:
      """Thread-safe bounded ring buffer with sequence numbers.

      Each appended event gets a monotonically increasing seq number.
      since(N) returns all events with seq > N.
      """

      def __init__(self, max_size=500):
          self._events = []
          self._seq = 0
          self._max_size = max_size
          self._lock = threading.Lock()

      def append(self, event):
          """Add an event and assign it a sequence number.

          Returns the assigned sequence number.
          """
          with self._lock:
              self._seq += 1
              event["seq"] = self._seq
              self._events.append(event)
              if len(self._events) > self._max_size:
                  self._events = self._events[-self._max_size:]
              return self._seq

      def since(self, seq):
          """Return events with seq > the given value.

          Args:
              seq: Return events after this sequence number. 0 returns all.

          Returns:
              List of event dicts (copies safe for mutation).
          """
          with self._lock:
              return [e for e in self._events if e["seq"] > seq]

      def all(self):
          """Return a copy of all buffered events."""
          with self._lock:
              return list(self._events)
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `python3 -m pytest tests/test_events.py -v`
  Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/events.py tests/test_events.py
  git commit -m "feat: event data model and ring buffer for activity feed"
  ```

---

## Task 3: WebSocket Server Thread -- websocket_server.py

**Files:**
- Create: `tools/dashboard/websocket_server.py`
- Create: `tests/test_websocket_server.py`

Runs a `websockets` asyncio server in a daemon thread. Provides `broadcast()` callable from any thread (HTTP handler) via `asyncio.run_coroutine_threadsafe()`. Manages connected clients set. On new connection, replays buffered events since client's `?since=N` query parameter.

- [ ] **Step 1: Write tests for WebSocket server**

  Create `tests/test_websocket_server.py`:

  ```python
  """Tests for WebSocket server thread and broadcast."""

  import asyncio
  import json
  import threading
  import time
  import unittest

  try:
      import websockets
      from websockets.asyncio.client import connect
      HAS_WEBSOCKETS = True
  except ImportError:
      HAS_WEBSOCKETS = False

  from tools.dashboard.events import EventBuffer, make_event


  @unittest.skipUnless(HAS_WEBSOCKETS, "websockets not installed")
  class TestWebSocketServer(unittest.TestCase):
      """Integration tests for the WebSocket server thread."""

      def setUp(self):
          from tools.dashboard.websocket_server import start_ws_server
          self.buffer = EventBuffer(max_size=100)
          self.ws_server, self.ws_loop, self.ws_port = start_ws_server(
              host="127.0.0.1",
              port=0,
              event_buffer=self.buffer,
          )

      def tearDown(self):
          self.ws_server.close()
          asyncio.run_coroutine_threadsafe(
              self.ws_server.wait_closed(), self.ws_loop
          ).result(timeout=5)

      def _run_async(self, coro):
          """Run an async coroutine from the test thread."""
          loop = asyncio.new_event_loop()
          try:
              return loop.run_until_complete(coro)
          finally:
              loop.close()

      def test_client_connects(self):
          async def check():
              async with connect("ws://127.0.0.1:%d" % self.ws_port) as ws:
                  self.assertTrue(ws.open)
          self._run_async(check())

      def test_broadcast_delivers_event(self):
          from tools.dashboard.websocket_server import broadcast_event
          async def check():
              async with connect("ws://127.0.0.1:%d" % self.ws_port) as ws:
                  event = make_event("dispatch", "feat-x", "execute", "ensign")
                  broadcast_event(self.ws_loop, event, self.buffer)
                  msg = await asyncio.wait_for(ws.recv(), timeout=3)
                  data = json.loads(msg)
                  self.assertEqual(data["type"], "dispatch")
                  self.assertEqual(data["entity"], "feat-x")
                  self.assertIn("seq", data)
          self._run_async(check())

      def test_replay_on_connect_with_since(self):
          from tools.dashboard.websocket_server import broadcast_event
          # Pre-populate buffer with events
          for i in range(3):
              event = make_event("dispatch", "e%d" % i, "plan", "ensign")
              self.buffer.append(event)

          async def check():
              async with connect("ws://127.0.0.1:%d?since=1" % self.ws_port) as ws:
                  # Should receive events 2 and 3 (seq > 1)
                  msgs = []
                  for _ in range(2):
                      msg = await asyncio.wait_for(ws.recv(), timeout=3)
                      msgs.append(json.loads(msg))
                  seqs = [m["seq"] for m in msgs]
                  self.assertEqual(seqs, [2, 3])
          self._run_async(check())

      def test_replay_on_connect_without_since(self):
          # Pre-populate buffer
          for i in range(2):
              event = make_event("dispatch", "e%d" % i, "plan", "ensign")
              self.buffer.append(event)

          async def check():
              async with connect("ws://127.0.0.1:%d" % self.ws_port) as ws:
                  # Should receive all 2 events
                  msgs = []
                  for _ in range(2):
                      msg = await asyncio.wait_for(ws.recv(), timeout=3)
                      msgs.append(json.loads(msg))
                  self.assertEqual(len(msgs), 2)
          self._run_async(check())

      def test_multiple_clients_receive_broadcast(self):
          from tools.dashboard.websocket_server import broadcast_event
          async def check():
              async with connect("ws://127.0.0.1:%d" % self.ws_port) as ws1:
                  async with connect("ws://127.0.0.1:%d" % self.ws_port) as ws2:
                      event = make_event("completion", "feat-y", "quality", "ensign")
                      broadcast_event(self.ws_loop, event, self.buffer)
                      msg1 = await asyncio.wait_for(ws1.recv(), timeout=3)
                      msg2 = await asyncio.wait_for(ws2.recv(), timeout=3)
                      self.assertEqual(json.loads(msg1)["entity"], "feat-y")
                      self.assertEqual(json.loads(msg2)["entity"], "feat-y")
          self._run_async(check())


  if __name__ == "__main__":
      unittest.main()
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `python3 -m pytest tests/test_websocket_server.py -v`
  Expected: ImportError -- `tools.dashboard.websocket_server` does not exist.

- [ ] **Step 3: Implement websocket_server.py**

  Create `tools/dashboard/websocket_server.py`:

  ```python
  """WebSocket server for real-time event broadcasting.

  Runs a websockets asyncio server in a daemon thread alongside the
  existing ThreadingHTTPServer. HTTP handlers call broadcast_event()
  to push events to all connected WebSocket clients.

  Thread safety: broadcast_event() uses asyncio.run_coroutine_threadsafe()
  to schedule the broadcast on the WebSocket event loop. websockets.broadcast()
  is NOT thread-safe and must only be called from the asyncio thread.
  """

  import asyncio
  import json
  import threading
  import urllib.parse

  try:
      import websockets
      from websockets import broadcast
      HAS_WEBSOCKETS = True
  except ImportError:
      HAS_WEBSOCKETS = False


  # Module-level set of connected clients, managed by the asyncio thread only.
  _connected = set()


  def start_ws_server(host="127.0.0.1", port=8421, event_buffer=None):
      """Start a WebSocket server in a background daemon thread.

      Args:
          host: Bind address.
          port: Port number. Use 0 for auto-select.
          event_buffer: EventBuffer instance for replay on reconnect.

      Returns:
          Tuple of (server, loop, actual_port).
          - server: the websockets server (call server.close() to shut down)
          - loop: the asyncio event loop (for scheduling broadcasts)
          - actual_port: the port the server is listening on
      """
      if not HAS_WEBSOCKETS:
          raise RuntimeError("websockets library not installed. Run: pip install websockets")

      loop = asyncio.new_event_loop()
      started = threading.Event()
      result = {}

      async def handler(ws):
          _connected.add(ws)
          try:
              # Replay buffered events on connect
              if event_buffer is not None:
                  query = urllib.parse.urlparse(ws.request.path).query
                  params = urllib.parse.parse_qs(query)
                  since = int(params.get("since", [0])[0])
                  for event in event_buffer.since(since):
                      await ws.send(json.dumps(event))
              # Keep connection open, ignore incoming messages
              async for _ in ws:
                  pass
          finally:
              _connected.discard(ws)

      async def run():
          server = await websockets.serve(handler, host, port)
          actual_port = server.sockets[0].getsockname()[1]
          result["server"] = server
          result["port"] = actual_port
          started.set()
          await asyncio.Future()  # run forever

      def thread_target():
          asyncio.set_event_loop(loop)
          loop.run_until_complete(run())

      t = threading.Thread(target=thread_target, daemon=True)
      t.start()
      started.wait(timeout=10)

      return result["server"], loop, result["port"]


  def broadcast_event(ws_loop, event, event_buffer):
      """Broadcast an event to all connected WebSocket clients.

      Thread-safe: can be called from any thread (e.g., HTTP handler thread).
      The broadcast is scheduled on the WebSocket event loop via
      asyncio.run_coroutine_threadsafe().

      Args:
          ws_loop: The asyncio event loop running the WebSocket server.
          event: Event dict to broadcast. Will be appended to event_buffer
                 (which assigns a seq number) and then JSON-serialized.
          event_buffer: EventBuffer instance.
      """
      seq = event_buffer.append(event)

      async def _do_broadcast():
          if _connected:
              data = json.dumps(event)
              broadcast(_connected, data)

      future = asyncio.run_coroutine_threadsafe(_do_broadcast(), ws_loop)
      future.result(timeout=5)
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `python3 -m pytest tests/test_websocket_server.py -v`
  Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/websocket_server.py tests/test_websocket_server.py
  git commit -m "feat: WebSocket server thread with broadcast and replay"
  ```

---

## Task 4: REST Event Endpoint -- handlers.py Modification

**Files:**
- Modify: `tools/dashboard/handlers.py`
- Modify: `tests/test_dashboard_handlers.py`

Add `POST /api/events` route that accepts a structured event, stores it in the buffer, and broadcasts via WebSocket. Also add `GET /api/events?since=N` for polling fallback.

- [ ] **Step 1: Write tests for the event endpoint**

  Add to `tests/test_dashboard_handlers.py`:

  ```python
  class TestEventEndpoint(unittest.TestCase):
      """Test POST /api/events and GET /api/events."""

      def setUp(self):
          self.tmpdir = tempfile.mkdtemp()
          wf_dir = os.path.join(self.tmpdir, 'my-workflow')
          os.makedirs(wf_dir)
          with open(os.path.join(wf_dir, 'README.md'), 'w') as f:
              f.write(README_CONTENT)

          self.static_dir = tempfile.mkdtemp()
          with open(os.path.join(self.static_dir, 'index.html'), 'w') as f:
              f.write('<html><body>Dashboard</body></html>')

          from tools.dashboard.events import EventBuffer
          self.event_buffer = EventBuffer(max_size=100)

          handler_class = make_handler(
              project_root=self.tmpdir,
              static_dir=self.static_dir,
              event_buffer=self.event_buffer,
          )
          self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_class)
          self.port = self.server.server_address[1]
          self.thread = threading.Thread(target=self.server.serve_forever)
          self.thread.daemon = True
          self.thread.start()

      def tearDown(self):
          self.server.shutdown()
          self.thread.join(timeout=5)
          shutil.rmtree(self.tmpdir)
          shutil.rmtree(self.static_dir)

      def _post(self, path, data):
          url = 'http://127.0.0.1:%d%s' % (self.port, path)
          body = json.dumps(data).encode('utf-8')
          req = urllib.request.Request(url, data=body, method='POST')
          req.add_header('Content-Type', 'application/json')
          with urllib.request.urlopen(req) as resp:
              return resp.status, json.loads(resp.read())

      def _get(self, path):
          url = 'http://127.0.0.1:%d%s' % (self.port, path)
          req = urllib.request.Request(url)
          with urllib.request.urlopen(req) as resp:
              return resp.status, json.loads(resp.read())

      def test_post_event_returns_ok(self):
          status, data = self._post('/api/events', {
              'type': 'dispatch',
              'entity': 'feat-x',
              'stage': 'execute',
              'agent': 'ensign',
          })
          self.assertEqual(status, 200)
          self.assertTrue(data['ok'])
          self.assertIn('seq', data)

      def test_post_event_stores_in_buffer(self):
          self._post('/api/events', {
              'type': 'dispatch',
              'entity': 'feat-x',
              'stage': 'execute',
              'agent': 'ensign',
          })
          events = self.event_buffer.all()
          self.assertEqual(len(events), 1)
          self.assertEqual(events[0]['entity'], 'feat-x')

      def test_post_event_rejects_missing_type(self):
          try:
              self._post('/api/events', {
                  'entity': 'feat-x',
                  'stage': 'execute',
                  'agent': 'ensign',
              })
              self.fail('Expected 400')
          except urllib.error.HTTPError as e:
              self.assertEqual(e.code, 400)

      def test_get_events_returns_buffered(self):
          self._post('/api/events', {
              'type': 'dispatch',
              'entity': 'feat-x',
              'stage': 'execute',
              'agent': 'ensign',
          })
          self._post('/api/events', {
              'type': 'completion',
              'entity': 'feat-x',
              'stage': 'execute',
              'agent': 'ensign',
          })
          status, data = self._get('/api/events')
          self.assertEqual(status, 200)
          self.assertEqual(len(data), 2)

      def test_get_events_since_filters(self):
          self._post('/api/events', {
              'type': 'dispatch',
              'entity': 'a',
              'stage': 'plan',
              'agent': 'ensign',
          })
          self._post('/api/events', {
              'type': 'dispatch',
              'entity': 'b',
              'stage': 'plan',
              'agent': 'ensign',
          })
          status, data = self._get('/api/events?since=1')
          self.assertEqual(len(data), 1)
          self.assertEqual(data[0]['entity'], 'b')
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `python3 -m pytest tests/test_dashboard_handlers.py::TestEventEndpoint -v`
  Expected: TypeError -- `make_handler()` does not accept `event_buffer` yet.

- [ ] **Step 3: Modify handlers.py to add event_buffer parameter and event routes**

  In `tools/dashboard/handlers.py`, change the `make_handler` signature:

  ```python
  def make_handler(project_root, static_dir, log_file=None, event_buffer=None, ws_broadcast=None):
  ```

  Add to `do_GET` routing (after the `/api/entities` branch):

  ```python
  elif path == '/api/events':
      self._handle_get_events(query)
  ```

  Add to `do_POST` routing (after the `/api/entity/tags` branch):

  ```python
  elif path == '/api/events':
      self._handle_post_event()
  ```

  Add handler methods inside `DashboardHandler`:

  ```python
  def _handle_post_event(self):
      if event_buffer is None:
          self._send_json({'error': 'Events not enabled'}, 503)
          return
      body = json.loads(self._read_body())
      required = ('type', 'entity', 'stage', 'agent')
      for field in required:
          if field not in body:
              self._send_json({'error': 'Missing field: %s' % field}, 400)
              return
      from tools.dashboard.events import make_event
      event = make_event(
          event_type=body['type'],
          entity=body['entity'],
          stage=body['stage'],
          agent=body['agent'],
          message=body.get('message'),
      )
      seq = event_buffer.append(event)
      if ws_broadcast is not None:
          ws_broadcast(event)
      self._send_json({'ok': True, 'seq': seq})

  def _handle_get_events(self, query):
      if event_buffer is None:
          self._send_json({'error': 'Events not enabled'}, 503)
          return
      since = int(query.get('since', [0])[0])
      events = event_buffer.since(since)
      self._send_json(events)
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `python3 -m pytest tests/test_dashboard_handlers.py -v`
  Expected: all tests pass (existing + new TestEventEndpoint tests).

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/handlers.py tests/test_dashboard_handlers.py
  git commit -m "feat: REST event endpoint (POST/GET /api/events)"
  ```

---

## Task 5: Wire WebSocket into Dashboard Server -- serve.py Modification

**Files:**
- Modify: `tools/dashboard/serve.py`

Start the WebSocket server thread alongside the HTTP server. Pass the event buffer and a broadcast callback to `make_handler()`. Add `--ws-port` argument. Gracefully degrade if `websockets` is not installed.

- [ ] **Step 1: Write test for serve.py --ws-port argument**

  Add to `tests/test_dashboard_handlers.py` `TestServeArgparse` class:

  ```python
  def test_serve_accepts_ws_port_arg(self):
      """--ws-port is accepted by argparse without error."""
      import subprocess
      import sys
      result = subprocess.run(
          [sys.executable, '-m', 'tools.dashboard.serve', '--help'],
          capture_output=True, text=True,
          cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
      )
      self.assertIn('--ws-port', result.stdout)
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `python3 -m pytest tests/test_dashboard_handlers.py::TestServeArgparse::test_serve_accepts_ws_port_arg -v`
  Expected: FAIL -- `--ws-port` not in help output.

- [ ] **Step 3: Modify serve.py**

  In `tools/dashboard/serve.py`:

  ```python
  #!/usr/bin/env python3
  """Spacedock Workflow Status Dashboard -- local development server.

  Usage:
      python3 -m tools.dashboard.serve [--port PORT] [--ws-port WS_PORT] [--root PROJECT_ROOT]

  Serves a web dashboard at http://localhost:PORT that displays all
  Spacedock workflows discovered under PROJECT_ROOT.

  If the websockets library is installed, a WebSocket server starts on
  WS_PORT (default: HTTP_PORT + 1) for real-time event streaming.
  """

  import argparse
  import os
  import subprocess
  import sys
  from datetime import datetime
  from http.server import ThreadingHTTPServer

  from tools.dashboard.events import EventBuffer
  from tools.dashboard.handlers import make_handler

  try:
      from tools.dashboard.websocket_server import start_ws_server, broadcast_event, HAS_WEBSOCKETS
  except ImportError:
      HAS_WEBSOCKETS = False


  def main():
      parser = argparse.ArgumentParser(description='Spacedock Workflow Status Dashboard')
      parser.add_argument('--port', type=int, default=8420, help='Port to serve on (default: 8420)')
      parser.add_argument('--ws-port', type=int, default=None, help='WebSocket port (default: HTTP port + 1)')
      parser.add_argument('--root', default=None, help='Project root to scan (default: git toplevel or cwd)')
      parser.add_argument('--log-file', default=None, help='Write access logs to this file')
      args = parser.parse_args()

      project_root = args.root
      if project_root is None:
          try:
              result = subprocess.run(
                  ['git', 'rev-parse', '--show-toplevel'],
                  capture_output=True, text=True, check=True,
              )
              project_root = result.stdout.strip()
          except (subprocess.CalledProcessError, FileNotFoundError):
              project_root = os.getcwd()

      project_root = os.path.abspath(project_root)
      static_dir = os.path.join(os.path.dirname(__file__), 'static')

      event_buffer = EventBuffer(max_size=500)
      ws_broadcast = None
      ws_loop = None
      ws_port = args.ws_port or (args.port + 1)

      if HAS_WEBSOCKETS:
          try:
              ws_server, ws_loop, actual_ws_port = start_ws_server(
                  host='127.0.0.1',
                  port=ws_port,
                  event_buffer=event_buffer,
              )
              ws_port = actual_ws_port

              def ws_broadcast(event):
                  broadcast_event(ws_loop, event, event_buffer)

              ws_msg = ' | WebSocket: ws://127.0.0.1:%d/' % ws_port
          except Exception as e:
              ws_msg = ' | WebSocket: failed to start (%s)' % e
      else:
          ws_msg = ' | WebSocket: disabled (pip install websockets)'

      handler_class = make_handler(
          project_root=project_root,
          static_dir=static_dir,
          log_file=args.log_file,
          event_buffer=event_buffer,
          ws_broadcast=ws_broadcast,
      )
      server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_class)

      banner = '[%s] Spacedock Dashboard started on http://127.0.0.1:%d/ (root: %s)%s' % (
          datetime.now().strftime('%Y-%m-%d %H:%M:%S'), args.port, project_root, ws_msg)
      print(banner)
      if args.log_file:
          with open(args.log_file, 'a') as f:
              f.write(banner + '\n')
      print('Press Ctrl+C to stop.')

      try:
          server.serve_forever()
      except KeyboardInterrupt:
          print('\nShutting down.')
          server.shutdown()


  if __name__ == '__main__':
      main()
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `python3 -m pytest tests/test_dashboard_handlers.py -v`
  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/serve.py
  git commit -m "feat: wire WebSocket server into dashboard startup"
  ```

---

## Task 6: Frontend Activity Feed -- activity.js, index.html, style.css

**Files:**
- Create: `tools/dashboard/static/activity.js`
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/style.css`

WebSocket client with manual reconnection (exponential backoff), event rendering in an activity feed panel on the dashboard page.

- [ ] **Step 1: Create activity.js with WebSocket client and reconnection**

  Create `tools/dashboard/static/activity.js`:

  ```javascript
  (function () {
    "use strict";

    var WS_RECONNECT_BASE = 500;
    var WS_RECONNECT_MAX = 30000;
    var WS_MAX_RETRIES = 10;
    var MAX_FEED_ITEMS = 100;

    var feedContainer = document.getElementById("activity-feed");
    var wsIndicator = document.getElementById("ws-indicator");
    var ws = null;
    var lastSeq = 0;
    var retryCount = 0;
    var retryTimer = null;

    function getWsUrl() {
      // WebSocket port is HTTP port + 1 by convention
      var httpPort = parseInt(window.location.port, 10) || 8420;
      return "ws://127.0.0.1:" + (httpPort + 1) + "/?since=" + lastSeq;
    }

    function setStatus(status) {
      if (!wsIndicator) return;
      if (status === "connected") {
        wsIndicator.textContent = "Live";
        wsIndicator.className = "indicator";
      } else if (status === "reconnecting") {
        wsIndicator.textContent = "Reconnecting...";
        wsIndicator.className = "indicator paused";
      } else {
        wsIndicator.textContent = "Disconnected";
        wsIndicator.className = "indicator disconnected";
      }
    }

    function connect() {
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
      }
      try {
        ws = new WebSocket(getWsUrl());
      } catch (e) {
        scheduleReconnect();
        return;
      }

      ws.onopen = function () {
        retryCount = 0;
        setStatus("connected");
      };

      ws.onmessage = function (evt) {
        try {
          var event = JSON.parse(evt.data);
          if (event.seq && event.seq > lastSeq) {
            lastSeq = event.seq;
          }
          renderEvent(event);
        } catch (e) {
          // ignore malformed messages
        }
      };

      ws.onclose = function () {
        setStatus("reconnecting");
        scheduleReconnect();
      };

      ws.onerror = function () {
        // onclose will fire after onerror
      };
    }

    function scheduleReconnect() {
      if (retryCount >= WS_MAX_RETRIES) {
        setStatus("disconnected");
        return;
      }
      var delay = Math.min(
        WS_RECONNECT_BASE * Math.pow(2, retryCount),
        WS_RECONNECT_MAX
      );
      // Add jitter: +/- 25%
      delay = delay * (0.75 + Math.random() * 0.5);
      retryCount++;
      retryTimer = setTimeout(connect, delay);
    }

    function eventTypeColor(type) {
      var colors = {
        dispatch: "#58a6ff",
        completion: "#3fb950",
        gate: "#f0883e",
        feedback: "#d2a8ff",
      };
      return colors[type] || "#8b949e";
    }

    function formatTime(timestamp) {
      var d = new Date(timestamp * 1000);
      var h = String(d.getHours()).padStart(2, "0");
      var m = String(d.getMinutes()).padStart(2, "0");
      var s = String(d.getSeconds()).padStart(2, "0");
      return h + ":" + m + ":" + s;
    }

    function renderEvent(event) {
      if (!feedContainer) return;

      var item = document.createElement("div");
      item.className = "feed-item";

      var badge = document.createElement("span");
      badge.className = "feed-badge";
      badge.style.background = eventTypeColor(event.type) + "22";
      badge.style.color = eventTypeColor(event.type);
      badge.textContent = event.type;

      var entity = document.createElement("span");
      entity.className = "feed-entity";
      entity.textContent = event.entity;

      var stage = document.createElement("span");
      stage.className = "feed-stage";
      stage.textContent = event.stage;

      var agent = document.createElement("span");
      agent.className = "feed-agent";
      agent.textContent = event.agent;

      var time = document.createElement("span");
      time.className = "feed-time";
      time.textContent = formatTime(event.timestamp);

      item.appendChild(time);
      item.appendChild(badge);
      item.appendChild(entity);
      item.appendChild(stage);
      item.appendChild(agent);

      if (event.message) {
        var msg = document.createElement("span");
        msg.className = "feed-message";
        msg.textContent = event.message;
        item.appendChild(msg);
      }

      // Newest at top
      feedContainer.insertBefore(item, feedContainer.firstChild);

      // Trim old items
      while (feedContainer.children.length > MAX_FEED_ITEMS) {
        feedContainer.removeChild(feedContainer.lastChild);
      }
    }

    // Bootstrap: try to load existing events via REST, then connect WebSocket
    fetch("/api/events?since=0")
      .then(function (res) { return res.json(); })
      .then(function (events) {
        events.forEach(function (e) {
          if (e.seq && e.seq > lastSeq) {
            lastSeq = e.seq;
          }
          renderEvent(e);
        });
        // Reverse so newest is on top (REST returns oldest-first)
        if (feedContainer) {
          var items = Array.from(feedContainer.children);
          items.reverse().forEach(function (item) {
            feedContainer.appendChild(item);
          });
        }
      })
      .catch(function () { /* events endpoint not available yet */ })
      .finally(function () { connect(); });
  })();
  ```

- [ ] **Step 2: Modify index.html to add activity feed panel**

  In `tools/dashboard/static/index.html`, add the activity feed section and script:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spacedock Dashboard</title>
      <link rel="stylesheet" href="style.css">
  </head>
  <body>
      <header>
          <h1>Spacedock Dashboard</h1>
          <div class="header-indicators">
              <span id="ws-indicator" class="indicator paused">Connecting...</span>
              <span id="refresh-indicator" class="indicator">Auto-refresh: ON</span>
          </div>
      </header>
      <div class="dashboard-layout">
          <main id="workflows-container">
              <p class="loading">Loading workflows...</p>
          </main>
          <aside id="activity-panel">
              <h3>Activity Feed</h3>
              <div id="activity-feed"></div>
          </aside>
      </div>
      <script src="app.js"></script>
      <script src="activity.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 3: Add activity feed styles to style.css**

  Append to `tools/dashboard/static/style.css`:

  ```css
  /* --- Activity Feed --- */

  .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;
  }

  @media (max-width: 900px) {
      .dashboard-layout {
          grid-template-columns: 1fr;
      }
  }

  .header-indicators {
      display: flex;
      gap: 0.5rem;
  }

  .indicator.disconnected { background: #3d1f1f; color: #d73a49; }

  #activity-panel {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 1rem;
      max-height: calc(100vh - 6rem);
      overflow-y: auto;
  }

  #activity-panel h3 {
      font-size: 0.9rem;
      color: #f0f6fc;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #21262d;
  }

  .feed-item {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px solid #21262d;
      font-size: 0.75rem;
  }

  .feed-item:last-child { border-bottom: none; }

  .feed-badge {
      display: inline-block;
      font-size: 0.65rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-weight: 500;
      text-transform: uppercase;
  }

  .feed-entity {
      color: #58a6ff;
      font-weight: 500;
  }

  .feed-stage {
      color: #8b949e;
  }

  .feed-agent {
      color: #8b949e;
      font-style: italic;
  }

  .feed-time {
      color: #484f58;
      font-family: monospace;
      font-size: 0.7rem;
  }

  .feed-message {
      width: 100%;
      color: #8b949e;
      font-size: 0.7rem;
      padding-left: 3.5rem;
  }
  ```

- [ ] **Step 4: Verify static files load correctly**

  Start the dashboard manually:
  ```bash
  python3 -m tools.dashboard.serve --port 8420 --root .
  ```
  Open `http://127.0.0.1:8420/` in a browser. Verify:
  - Activity feed panel appears on the right side
  - WebSocket indicator shows "Live" (if websockets installed) or "Reconnecting..." (graceful)
  - Existing workflow table still renders correctly

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/static/activity.js tools/dashboard/static/index.html tools/dashboard/static/style.css
  git commit -m "feat: frontend activity feed with WebSocket client and reconnection"
  ```

---

## Task 7: FO Event Emission -- first-officer-shared-core.md

**Files:**
- Modify: `references/first-officer-shared-core.md`

Add event emission instructions at 6 lifecycle injection points. FO emits events by calling `curl -s -X POST` to the dashboard server's `/api/events` endpoint via the Bash tool.

- [ ] **Step 1: Add event emission section to FO shared core**

  In `references/first-officer-shared-core.md`, add a new section after `## Mod Hook Convention` and before `## Clarification and Communication`:

  ```markdown
  ## Activity Feed Events

  When the dashboard is running, emit structured events at lifecycle boundaries. Use the Bash tool to POST to the dashboard event endpoint. If the dashboard is not running, skip silently (curl will fail and that is fine).

  Event format:
  ```
  curl -s -X POST http://127.0.0.1:{dashboard_port}/api/events \
    -H 'Content-Type: application/json' \
    -d '{"type":"{event_type}","entity":"{slug}","stage":"{stage}","agent":"{agent}","message":"{detail}"}'
  ```

  Emit events at these lifecycle points:

  1. **Dispatch** (Dispatch step 6, after commit): `type: "dispatch"`, message: "entering {stage}"
  2. **Completion** (Completion step 2, after reviewing stage report): `type: "completion"`, message: "{N} done, {N} skipped, {N} failed"
  3. **Gate presentation** (when presenting to captain): `type: "gate"`, message: "awaiting captain review"
  4. **Gate resolution** (after captain approves/rejects): `type: "gate"`, message: "approved" or "rejected"
  5. **Feedback rejection** (Feedback step 4, routing back): `type: "feedback"`, message: "cycle {N}: routing to {target_stage}"
  6. **Merge/cleanup** (Merge step 4, after setting verdict): `type: "completion"`, message: "verdict: {verdict}"

  The dashboard port is read from `~/.spacedock/dashboard/{project_hash}/port`. If the port file does not exist, the dashboard is not running and events should not be emitted.

  Resolve the dashboard port once at startup (step 6.5) and reuse it for all event calls. Do not look it up on every event.
  ```

- [ ] **Step 2: Add dashboard port resolution to startup step 6.5**

  Modify the existing step 6.5 in `references/first-officer-shared-core.md` to also capture the port:

  ```markdown
  6.5. Check dashboard — run `tools/dashboard/ctl.sh status --root {project_root}`. If not running, prompt captain: "Dashboard is not running. Start it? (http://localhost:8420/)" Wait for captain response. Yes — run `tools/dashboard/ctl.sh start --root {project_root}`. No — skip.
       After dashboard check, resolve the event port: read the port file at `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)/port`. Store this as `dashboard_port` for event emission. If the file does not exist, set `dashboard_port` to empty (events disabled).
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add references/first-officer-shared-core.md
  git commit -m "feat: add activity feed event emission to FO lifecycle"
  ```

---

## Task 8: Full Integration Test

**Files:**
- No new files. Run existing tests and manual verification.

- [ ] **Step 1: Run full test suite**

  ```bash
  python3 -m pytest tests/ -v
  ```

  Expected: all tests pass, no regressions.

- [ ] **Step 2: Manual end-to-end smoke test**

  1. Start dashboard:
     ```bash
     tools/dashboard/ctl.sh start --root .
     ```

  2. Open `http://127.0.0.1:8420/` in browser. Verify activity feed panel appears.

  3. Post a test event:
     ```bash
     curl -s -X POST http://127.0.0.1:8420/api/events \
       -H 'Content-Type: application/json' \
       -d '{"type":"dispatch","entity":"test-entity","stage":"execute","agent":"ensign","message":"entering execute"}'
     ```

  4. Verify the event appears in the activity feed panel in real-time.

  5. Refresh the page. Verify the event is replayed from the buffer.

  6. Stop dashboard:
     ```bash
     tools/dashboard/ctl.sh stop
     ```

- [ ] **Step 3: Verify graceful degradation without websockets**

  ```bash
  python3 -c "
  import sys
  # Temporarily hide websockets
  sys.modules['websockets'] = None
  from tools.dashboard.serve import main
  print('serve.py imports without error when websockets unavailable')
  "
  ```

  Expected: no ImportError. The server starts in REST-only mode.

- [ ] **Step 4: Final commit**

  ```bash
  git add -A
  git commit -m "test: integration tests and smoke test verification"
  ```

---

## Quality Gates

These gates must pass before the feature is considered complete:

1. **Unit tests pass:** `python3 -m pytest tests/ -v` -- all tests green
2. **WebSocket server starts:** Dashboard banner shows `WebSocket: ws://127.0.0.1:8421/`
3. **Event POST works:** `curl -X POST /api/events` returns `{"ok": true, "seq": N}`
4. **Event GET works:** `GET /api/events?since=0` returns buffered events
5. **WebSocket receives broadcast:** Browser console shows events arriving via WebSocket
6. **Reconnection works:** Kill and restart the dashboard -- browser reconnects and replays missed events
7. **Graceful degradation:** Without `websockets` installed, dashboard starts in REST-only mode with clear message
8. **No regressions:** All existing dashboard tests continue to pass
9. **FO instructions updated:** `references/first-officer-shared-core.md` has event emission at 6 lifecycle points
10. **Dependency documented:** `requirements.txt` exists with `websockets>=15.0`
