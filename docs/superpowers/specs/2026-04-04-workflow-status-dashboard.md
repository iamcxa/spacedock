# Workflow Status Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost web dashboard that discovers Spacedock workflows, parses entity YAML frontmatter, and renders an auto-refreshing status overview in the browser.

**Architecture:** A Python 3 stdlib HTTP server (`http.server.ThreadingHTTPServer`) serves both a JSON API and static HTML/CSS/JS assets. The backend copies the proven parsing functions from `skills/commission/bin/status` into its own module, adds workflow discovery (recursive search for `commissioned-by: spacedock@` in README.md frontmatter), and exposes `/api/workflows` as JSON. The frontend is vanilla HTML/CSS/JS with client-side polling via `setInterval` + `fetch()`.

**Tech Stack:** Python 3 stdlib only (server), vanilla HTML/CSS/JS (frontend), no dependencies.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/parsing.py` | Copied and adapted `parse_frontmatter()`, `parse_stages_block()`, `scan_entities()` from `skills/commission/bin/status` |
| Create | `tools/dashboard/discovery.py` | Workflow discovery (recursive search for `commissioned-by: spacedock@` READMEs) + entity aggregation |
| Create | `tools/dashboard/handlers.py` | `BaseHTTPRequestHandler` subclass -- routes `/api/workflows` (JSON) and `/` (static files) |
| Create | `tools/dashboard/serve.py` | HTTP server entry point -- parses CLI args, starts `ThreadingHTTPServer` |
| Create | `tools/dashboard/static/index.html` | Dashboard UI -- workflow cards, entity tables, auto-refresh indicator |
| Create | `tools/dashboard/static/style.css` | Dashboard styles -- layout, color-coded status badges, responsive table |
| Create | `tools/dashboard/static/app.js` | Client-side logic -- fetch API, render workflows, `setInterval` polling |
| Create | `tests/test_dashboard_parsing.py` | Tests for copied parsing functions against known fixtures |
| Create | `tests/test_dashboard_discovery.py` | Tests for workflow discovery and entity aggregation |
| Create | `tests/test_dashboard_handlers.py` | Tests for HTTP handler routing and JSON API responses |

**Why `tools/dashboard/` not `skills/`:** The dashboard is a developer tool, not a commission skill. `tools/` is the natural home for standalone utilities. The `parsing.py` module copies functions from `skills/commission/bin/status` because that script has no `.py` extension and cannot be imported (research correction CLAIM-2).

---

## Task 1: Parsing Module -- Copy and Adapt Core Functions

**Files:**
- Create: `tools/dashboard/__init__.py`
- Create: `tools/dashboard/parsing.py`
- Create: `tests/test_dashboard_parsing.py`
- Reference: `skills/commission/bin/status` (source of functions to copy)

This task copies `parse_frontmatter()`, `parse_stages_block()`, and `scan_entities()` from the status script into a proper importable Python module. The functions are copied verbatim -- no modifications to logic.

**Why copy, not import:** The status script at `skills/commission/bin/status` has no `.py` extension. `importlib.util.spec_from_file_location()` returns `None` for extensionless files. Copying the ~120 lines is cleaner than `exec()` hacks (research correction CLAIM-2).

- [ ] **Step 1: Create the parsing module with copied functions**

Create `tools/dashboard/__init__.py` (empty) and `tools/dashboard/parsing.py`:

```python
"""Parsing functions for Spacedock YAML frontmatter and entity scanning.

Copied from skills/commission/bin/status (which has no .py extension and
cannot be imported). Keep in sync manually if the source changes.
"""

import glob
import os


def parse_frontmatter(filepath):
    """Extract YAML frontmatter fields from a markdown file."""
    fields = {}
    in_fm = False
    with open(filepath, 'r') as f:
        for line in f:
            line = line.rstrip('\n')
            if line == '---':
                if in_fm:
                    break
                in_fm = True
                continue
            if in_fm:
                if ':' in line:
                    key, _, val = line.partition(':')
                    key = key.strip()
                    val = val.strip()
                    if not line[0].isspace():
                        fields[key] = val
    return fields


def parse_stages_block(filepath):
    """Parse the stages block from README frontmatter."""
    lines = []
    in_fm = False
    with open(filepath, 'r') as f:
        for line in f:
            line = line.rstrip('\n')
            if line == '---':
                if in_fm:
                    break
                in_fm = True
                continue
            if in_fm:
                lines.append(line)

    stages_start = None
    for i, line in enumerate(lines):
        if line.rstrip() == 'stages:':
            stages_start = i
            break

    if stages_start is None:
        return None

    defaults = {}
    states = []
    i = stages_start + 1
    stages_indent = None
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()
        if not stripped:
            i += 1
            continue
        indent = len(line) - len(stripped)
        if stages_indent is None:
            stages_indent = indent
        elif indent < stages_indent:
            break

        if indent == stages_indent:
            if stripped == 'defaults:':
                i += 1
                while i < len(lines):
                    dline = lines[i]
                    dstripped = dline.lstrip()
                    if not dstripped:
                        i += 1
                        continue
                    dindent = len(dline) - len(dstripped)
                    if dindent <= stages_indent:
                        break
                    if ':' in dstripped:
                        k, _, v = dstripped.partition(':')
                        defaults[k.strip()] = v.strip()
                    i += 1
                continue
            elif stripped == 'states:':
                i += 1
                current_state = None
                while i < len(lines):
                    sline = lines[i]
                    sstripped = sline.lstrip()
                    if not sstripped:
                        i += 1
                        continue
                    sindent = len(sline) - len(sstripped)
                    if sindent <= stages_indent:
                        break
                    if sstripped.startswith('- name:'):
                        _, _, name = sstripped.partition('- name:')
                        current_state = {'name': name.strip()}
                        states.append(current_state)
                    elif current_state is not None and ':' in sstripped and not sstripped.startswith('- '):
                        k, _, v = sstripped.partition(':')
                        current_state[k.strip()] = v.strip()
                    i += 1
                continue
        i += 1

    if not states:
        return None

    default_worktree = defaults.get('worktree', 'false').lower() == 'true'
    default_concurrency = int(defaults.get('concurrency', '2'))

    result = []
    for state in states:
        stage = {
            'name': state['name'],
            'worktree': state.get('worktree', str(default_worktree)).lower() == 'true',
            'concurrency': int(state.get('concurrency', str(default_concurrency))),
            'gate': state.get('gate', 'false').lower() == 'true',
            'terminal': state.get('terminal', 'false').lower() == 'true',
            'initial': state.get('initial', 'false').lower() == 'true',
        }
        result.append(stage)

    return result


def scan_entities(directory):
    """Scan a directory for .md entity files (excluding README.md)."""
    entities = []
    pattern = os.path.join(directory, '*.md')
    for filepath in sorted(glob.glob(pattern)):
        if os.path.basename(filepath) == 'README.md':
            continue
        slug = os.path.splitext(os.path.basename(filepath))[0]
        fields = parse_frontmatter(filepath)
        entity = {k: v for k, v in fields.items()}
        entity['slug'] = slug
        for key in ('id', 'status', 'title', 'score', 'source', 'worktree'):
            entity.setdefault(key, '')
        entities.append(entity)
    return entities
```

- [ ] **Step 2: Write tests that verify parity with the original status script**

Create `tests/test_dashboard_parsing.py`:

```python
"""Tests for dashboard parsing module -- verifies parity with skills/commission/bin/status."""

import os
import tempfile
import textwrap
import unittest

from tools.dashboard.parsing import parse_frontmatter, parse_stages_block, scan_entities


class TestParseFrontmatter(unittest.TestCase):
    """Test parse_frontmatter() extracts all entity fields correctly."""

    def test_basic_fields(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(textwrap.dedent("""\
                ---
                id: 001
                title: Test Entity
                status: backlog
                score: 0.9
                source: user
                started:
                completed:
                verdict:
                worktree:
                ---

                Body text.
            """))
            f.flush()
            fields = parse_frontmatter(f.name)
        os.unlink(f.name)
        self.assertEqual(fields['id'], '001')
        self.assertEqual(fields['title'], 'Test Entity')
        self.assertEqual(fields['status'], 'backlog')
        self.assertEqual(fields['score'], '0.9')
        self.assertEqual(fields['source'], 'user')
        self.assertEqual(fields['started'], '')
        self.assertEqual(fields['completed'], '')
        self.assertEqual(fields['worktree'], '')

    def test_empty_file_returns_empty_dict(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write('No frontmatter here.\n')
            f.flush()
            fields = parse_frontmatter(f.name)
        os.unlink(f.name)
        self.assertEqual(fields, {})

    def test_skips_indented_lines(self):
        """Indented lines (nested YAML like stages block) are skipped."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(textwrap.dedent("""\
                ---
                id: 001
                stages:
                  defaults:
                    worktree: false
                title: After Nested
                ---
            """))
            f.flush()
            fields = parse_frontmatter(f.name)
        os.unlink(f.name)
        self.assertEqual(fields['id'], '001')
        self.assertEqual(fields['title'], 'After Nested')
        self.assertNotIn('worktree', fields)


class TestParseStagesBlock(unittest.TestCase):
    """Test parse_stages_block() extracts stage metadata."""

    def _write_readme(self, content):
        f = tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False)
        f.write(textwrap.dedent(content))
        f.flush()
        f.close()
        return f.name

    def test_basic_stages(self):
        path = self._write_readme("""\
            ---
            stages:
              defaults:
                worktree: false
                concurrency: 2
              states:
                - name: backlog
                  initial: true
                - name: implementation
                  worktree: true
                - name: done
                  terminal: true
            ---
        """)
        stages = parse_stages_block(path)
        os.unlink(path)
        self.assertEqual(len(stages), 3)
        self.assertEqual(stages[0]['name'], 'backlog')
        self.assertTrue(stages[0]['initial'])
        self.assertFalse(stages[0]['worktree'])
        self.assertTrue(stages[1]['worktree'])
        self.assertTrue(stages[2]['terminal'])

    def test_no_stages_returns_none(self):
        path = self._write_readme("""\
            ---
            id: 001
            title: No Stages
            ---
        """)
        result = parse_stages_block(path)
        os.unlink(path)
        self.assertIsNone(result)


class TestScanEntities(unittest.TestCase):
    """Test scan_entities() finds .md files excluding README.md."""

    def test_finds_entities_excludes_readme(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'README.md'), 'w') as f:
                f.write('---\nid: readme\n---\n')
            for name in ('alpha.md', 'beta.md'):
                with open(os.path.join(tmpdir, name), 'w') as f:
                    f.write('---\nid: 001\ntitle: %s\nstatus: backlog\n---\n' % name)
            entities = scan_entities(tmpdir)
        self.assertEqual(len(entities), 2)
        slugs = [e['slug'] for e in entities]
        self.assertIn('alpha', slugs)
        self.assertIn('beta', slugs)
        self.assertNotIn('README', slugs)

    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            entities = scan_entities(tmpdir)
        self.assertEqual(entities, [])

    def test_default_fields_populated(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'minimal.md'), 'w') as f:
                f.write('---\ntitle: Minimal\n---\n')
            entities = scan_entities(tmpdir)
        self.assertEqual(len(entities), 1)
        e = entities[0]
        self.assertEqual(e['slug'], 'minimal')
        self.assertEqual(e['id'], '')
        self.assertEqual(e['status'], '')
        self.assertEqual(e['score'], '')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_parsing.py -v`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/__init__.py tools/dashboard/parsing.py tests/test_dashboard_parsing.py
git commit -m "feat(dashboard): add parsing module -- copy frontmatter/stages/entity functions from status script"
```

---

## Task 2: Workflow Discovery Module

**Files:**
- Create: `tools/dashboard/discovery.py`
- Create: `tests/test_dashboard_discovery.py`
- Reference: `references/first-officer-shared-core.md` (discovery algorithm)

This task implements the workflow discovery algorithm from `first-officer-shared-core.md`: recursively search for `README.md` files whose YAML frontmatter contains `commissioned-by: spacedock@...`, ignoring `.git`, `.worktrees`, `node_modules`, `vendor`, `dist`, `build`, and `__pycache__` directories.

**Research correction CLAIM-5:** Some workflow directories (like `docs/build-pipeline/`) may lack a README.md or `commissioned-by` field. The dashboard follows the same algorithm as first-officer -- workflows without `commissioned-by` are intentionally excluded.

- [ ] **Step 1: Write failing tests for workflow discovery**

Create `tests/test_dashboard_discovery.py`:

```python
"""Tests for dashboard workflow discovery."""

import os
import tempfile
import textwrap
import unittest

from tools.dashboard.discovery import discover_workflows, aggregate_workflow


class TestDiscoverWorkflows(unittest.TestCase):
    """Test recursive workflow directory discovery."""

    def _make_tree(self, tmpdir, structure):
        """Create a directory tree from a dict. Keys are paths, values are file contents."""
        for path, content in structure.items():
            full = os.path.join(tmpdir, path)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(textwrap.dedent(content))

    def test_finds_workflow_with_commissioned_by(self):
        with tempfile.TemporaryDirectory() as root:
            self._make_tree(root, {
                'docs/plans/README.md': """\
                    ---
                    commissioned-by: spacedock@0.9.0
                    entity-type: task
                    stages:
                      defaults:
                        worktree: false
                        concurrency: 2
                      states:
                        - name: backlog
                          initial: true
                        - name: done
                          terminal: true
                    ---

                    # My Workflow
                """,
            })
            workflows = discover_workflows(root)
            self.assertEqual(len(workflows), 1)
            self.assertEqual(workflows[0]['dir'], os.path.join(root, 'docs', 'plans'))

    def test_ignores_directories_without_commissioned_by(self):
        with tempfile.TemporaryDirectory() as root:
            self._make_tree(root, {
                'random/README.md': """\
                    ---
                    title: Not a workflow
                    ---

                    # Random
                """,
            })
            workflows = discover_workflows(root)
            self.assertEqual(len(workflows), 0)

    def test_ignores_excluded_directories(self):
        with tempfile.TemporaryDirectory() as root:
            self._make_tree(root, {
                '.worktrees/test/README.md': """\
                    ---
                    commissioned-by: spacedock@0.9.0
                    ---
                """,
                '.git/hooks/README.md': """\
                    ---
                    commissioned-by: spacedock@0.9.0
                    ---
                """,
                'node_modules/pkg/README.md': """\
                    ---
                    commissioned-by: spacedock@0.9.0
                    ---
                """,
            })
            workflows = discover_workflows(root)
            self.assertEqual(len(workflows), 0)

    def test_multiple_workflows(self):
        with tempfile.TemporaryDirectory() as root:
            readme = """\
                ---
                commissioned-by: spacedock@0.9.0
                entity-type: task
                stages:
                  defaults:
                    worktree: false
                    concurrency: 2
                  states:
                    - name: backlog
                      initial: true
                    - name: done
                      terminal: true
                ---

                # Workflow
            """
            self._make_tree(root, {
                'project-a/README.md': readme,
                'project-b/README.md': readme,
            })
            workflows = discover_workflows(root)
            self.assertEqual(len(workflows), 2)


class TestAggregateWorkflow(unittest.TestCase):
    """Test workflow data aggregation (stages + entities)."""

    def test_aggregates_entities_and_stages(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, 'README.md'), 'w') as f:
                f.write(textwrap.dedent("""\
                    ---
                    commissioned-by: spacedock@0.9.0
                    entity-type: task
                    stages:
                      defaults:
                        worktree: false
                        concurrency: 2
                      states:
                        - name: backlog
                          initial: true
                        - name: done
                          terminal: true
                    ---

                    # Test Workflow
                """))
            with open(os.path.join(tmpdir, 'task-a.md'), 'w') as f:
                f.write('---\nid: 001\ntitle: Task A\nstatus: backlog\nscore: 0.8\nsource: user\nworktree:\n---\n')
            with open(os.path.join(tmpdir, 'task-b.md'), 'w') as f:
                f.write('---\nid: 002\ntitle: Task B\nstatus: done\nscore: 0.9\nsource: CL\nworktree:\n---\n')

            result = aggregate_workflow(tmpdir)

        self.assertEqual(result['dir'], tmpdir)
        self.assertEqual(len(result['stages']), 2)
        self.assertEqual(result['stages'][0]['name'], 'backlog')
        self.assertEqual(len(result['entities']), 2)
        self.assertEqual(result['entity_count_by_stage']['backlog'], 1)
        self.assertEqual(result['entity_count_by_stage']['done'], 1)

    def test_no_readme_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = aggregate_workflow(tmpdir)
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_discovery.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'tools.dashboard.discovery'`

- [ ] **Step 3: Implement discovery module**

Create `tools/dashboard/discovery.py`:

```python
"""Workflow discovery -- finds Spacedock workflows by scanning for commissioned-by frontmatter.

Algorithm follows references/first-officer-shared-core.md:
- Recursively search for README.md files
- Check YAML frontmatter for 'commissioned-by: spacedock@...'
- Ignore .git, .worktrees, node_modules, vendor, dist, build, __pycache__
"""

import os

from tools.dashboard.parsing import parse_frontmatter, parse_stages_block, scan_entities

IGNORED_DIRS = {'.git', '.worktrees', 'node_modules', 'vendor', 'dist', 'build', '__pycache__'}


def discover_workflows(root):
    """Recursively discover Spacedock workflow directories under root.

    Returns a list of dicts with 'dir' and 'commissioned_by' keys for each
    discovered workflow.
    """
    workflows = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]

        if 'README.md' not in filenames:
            continue

        readme_path = os.path.join(dirpath, 'README.md')
        fields = parse_frontmatter(readme_path)
        commissioned_by = fields.get('commissioned-by', '')

        if commissioned_by.startswith('spacedock@'):
            workflows.append({
                'dir': dirpath,
                'commissioned_by': commissioned_by,
            })

    return workflows


def aggregate_workflow(workflow_dir):
    """Aggregate workflow data: stages, entities, and per-stage counts.

    Returns None if the directory has no README.md.
    """
    readme_path = os.path.join(workflow_dir, 'README.md')
    if not os.path.exists(readme_path):
        return None

    fields = parse_frontmatter(readme_path)
    stages = parse_stages_block(readme_path) or []
    entities = scan_entities(workflow_dir)

    entity_count_by_stage = {}
    for e in entities:
        status = e.get('status', '')
        if status:
            entity_count_by_stage[status] = entity_count_by_stage.get(status, 0) + 1

    return {
        'dir': workflow_dir,
        'name': os.path.basename(workflow_dir),
        'commissioned_by': fields.get('commissioned-by', ''),
        'entity_type': fields.get('entity-type', ''),
        'entity_label': fields.get('entity-label', fields.get('entity-type', 'entity')),
        'stages': stages,
        'entities': entities,
        'entity_count_by_stage': entity_count_by_stage,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_discovery.py -v`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/discovery.py tests/test_dashboard_discovery.py
git commit -m "feat(dashboard): add workflow discovery module -- recursive commissioned-by search"
```

---

## Task 3: HTTP Handler with JSON API

**Files:**
- Create: `tools/dashboard/handlers.py`
- Create: `tests/test_dashboard_handlers.py`

The handler subclasses `BaseHTTPRequestHandler` and routes:
- `GET /api/workflows` -- returns JSON array of all discovered workflows with entities
- `GET /` and `GET /<static-file>` -- serves files from `tools/dashboard/static/`

- [ ] **Step 1: Write failing tests for the HTTP handler**

Create `tests/test_dashboard_handlers.py`:

```python
"""Tests for dashboard HTTP handler."""

import json
import os
import shutil
import tempfile
import textwrap
import threading
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer

from tools.dashboard.handlers import make_handler


README_CONTENT = textwrap.dedent("""\
    ---
    commissioned-by: spacedock@0.9.0
    entity-type: task
    entity-label: task
    stages:
      defaults:
        worktree: false
        concurrency: 2
      states:
        - name: backlog
          initial: true
        - name: done
          terminal: true
    ---

    # Test Workflow
""")


class TestDashboardHandler(unittest.TestCase):
    """Test HTTP handler routing and JSON responses."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        wf_dir = os.path.join(self.tmpdir, 'my-workflow')
        os.makedirs(wf_dir)
        with open(os.path.join(wf_dir, 'README.md'), 'w') as f:
            f.write(README_CONTENT)
        with open(os.path.join(wf_dir, 'task-a.md'), 'w') as f:
            f.write('---\nid: 001\ntitle: Task A\nstatus: backlog\nscore: 0.8\nsource: user\nworktree:\n---\n')

        # Create a minimal static dir with index.html for this test
        self.static_dir = tempfile.mkdtemp()
        with open(os.path.join(self.static_dir, 'index.html'), 'w') as f:
            f.write('<html><body>Dashboard</body></html>')

        handler_class = make_handler(
            project_root=self.tmpdir,
            static_dir=self.static_dir,
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

    def _get(self, path):
        url = 'http://127.0.0.1:%d%s' % (self.port, path)
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read(), resp.headers

    def test_api_workflows_returns_json(self):
        status, body, headers = self._get('/api/workflows')
        self.assertEqual(status, 200)
        self.assertIn('application/json', headers.get('Content-Type', ''))
        data = json.loads(body)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        wf = data[0]
        self.assertEqual(wf['name'], 'my-workflow')
        self.assertEqual(len(wf['entities']), 1)
        self.assertEqual(wf['entities'][0]['title'], 'Task A')

    def test_api_workflows_includes_stages(self):
        status, body, _ = self._get('/api/workflows')
        data = json.loads(body)
        wf = data[0]
        self.assertEqual(len(wf['stages']), 2)
        self.assertEqual(wf['stages'][0]['name'], 'backlog')

    def test_root_serves_index_html(self):
        status, body, headers = self._get('/')
        self.assertEqual(status, 200)
        self.assertIn('text/html', headers.get('Content-Type', ''))
        self.assertIn(b'Dashboard', body)

    def test_404_for_unknown_path(self):
        try:
            self._get('/nonexistent')
            self.fail('Expected 404')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 404)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_handlers.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'tools.dashboard.handlers'`

- [ ] **Step 3: Implement the HTTP handler**

Create `tools/dashboard/handlers.py`:

```python
"""HTTP request handler for the Spacedock dashboard.

Routes:
- GET /api/workflows -- JSON array of discovered workflows with entities
- GET / -- serves index.html from static directory
- GET /<file> -- serves static files (CSS, JS)
"""

import json
import os
from http.server import BaseHTTPRequestHandler

from tools.dashboard.discovery import discover_workflows, aggregate_workflow

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}


def make_handler(project_root, static_dir):
    """Create a handler class bound to a specific project root and static dir."""

    class DashboardHandler(BaseHTTPRequestHandler):

        def do_GET(self):
            if self.path == '/api/workflows':
                self._handle_api_workflows()
            elif self.path == '/':
                self._serve_static('index.html')
            else:
                self._serve_static(self.path.lstrip('/'))

        def _handle_api_workflows(self):
            workflows = discover_workflows(project_root)
            result = []
            for wf in workflows:
                data = aggregate_workflow(wf['dir'])
                if data is not None:
                    result.append(data)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        def _serve_static(self, filename):
            filepath = os.path.join(static_dir, filename)
            filepath = os.path.realpath(filepath)
            if not filepath.startswith(os.path.realpath(static_dir)):
                self.send_error(403, 'Forbidden')
                return
            if not os.path.isfile(filepath):
                self.send_error(404, 'Not Found')
                return

            ext = os.path.splitext(filepath)[1]
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')

            with open(filepath, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, format, *args):
            pass

    return DashboardHandler
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_handlers.py -v`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/handlers.py tests/test_dashboard_handlers.py
git commit -m "feat(dashboard): add HTTP handler -- JSON API and static file serving"
```

---

## Task 4: Frontend -- HTML, CSS, and JavaScript

**Files:**
- Create: `tools/dashboard/static/index.html`
- Create: `tools/dashboard/static/style.css`
- Create: `tools/dashboard/static/app.js`

The frontend fetches `/api/workflows` and renders workflow cards with entity tables. Uses `setInterval` polling (every 5 seconds) for auto-refresh (research correction CLAIM-3: polling preferred over SSE).

- [ ] **Step 1: Create index.html**

Create `tools/dashboard/static/index.html`:

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
        <span id="refresh-indicator" class="indicator">Auto-refresh: ON</span>
    </header>
    <main id="workflows-container">
        <p class="loading">Loading workflows...</p>
    </main>
    <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create style.css**

Create `tools/dashboard/static/style.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    background: #0d1117;
    color: #c9d1d9;
    padding: 1.5rem;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #21262d;
}

h1 { font-size: 1.5rem; color: #f0f6fc; }

.indicator {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: #1b4332;
    color: #52c41a;
}

.indicator.paused { background: #3b2e00; color: #d4a017; }

.workflow-card {
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
}

.workflow-card h2 {
    font-size: 1.1rem;
    color: #f0f6fc;
    margin-bottom: 0.25rem;
}

.workflow-meta {
    font-size: 0.8rem;
    color: #8b949e;
    margin-bottom: 1rem;
}

.stage-pipeline {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.stage-chip {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    background: #21262d;
    color: #8b949e;
}

.stage-chip .count {
    font-weight: bold;
    color: #58a6ff;
    margin-left: 0.25rem;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid #21262d;
    color: #8b949e;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
}

th:hover { color: #f0f6fc; }
th.sorted-asc::after { content: " \25B2"; }
th.sorted-desc::after { content: " \25BC"; }

td {
    padding: 0.5rem;
    border-bottom: 1px solid #161b22;
}

tr:hover td { background: #1c2128; }

.status-badge {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-weight: 500;
}

.loading { color: #8b949e; text-align: center; padding: 2rem; }
.empty-state { color: #8b949e; text-align: center; padding: 1rem; }
```

- [ ] **Step 3: Create app.js with fetch + polling**

Create `tools/dashboard/static/app.js`:

```javascript
(function () {
  "use strict";

  var POLL_INTERVAL = 5000;
  var container = document.getElementById("workflows-container");
  var indicator = document.getElementById("refresh-indicator");
  var sortState = {};

  function fetchWorkflows() {
    fetch("/api/workflows")
      .then(function (res) { return res.json(); })
      .then(function (data) { render(data); })
      .catch(function () {
        container.innerHTML =
          '<p class="loading">Error loading data. Retrying...</p>';
      });
  }

  function statusColor(status) {
    var colors = {
      backlog: "#8b949e",
      ideation: "#d2a8ff",
      implementation: "#58a6ff",
      validation: "#f0883e",
      done: "#3fb950",
      explore: "#d2a8ff",
      research: "#79c0ff",
      plan: "#58a6ff",
    };
    return colors[status] || "#8b949e";
  }

  function sortEntities(entities, column, ascending) {
    return entities.slice().sort(function (a, b) {
      var va = a[column] || "";
      var vb = b[column] || "";
      if (column === "score" || column === "id") {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      }
      if (va < vb) return ascending ? -1 : 1;
      if (va > vb) return ascending ? 1 : -1;
      return 0;
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function render(workflows) {
    if (!workflows.length) {
      container.innerHTML =
        '<p class="empty-state">No Spacedock workflows found.</p>';
      return;
    }
    var html = "";
    workflows.forEach(function (wf, wfIdx) {
      html += '<div class="workflow-card">';
      html += "<h2>" + escapeHtml(wf.name) + "</h2>";
      html +=
        '<div class="workflow-meta">' +
        escapeHtml(wf.entity_label || wf.entity_type || "entity") +
        "s &middot; " +
        wf.entities.length +
        " total</div>";

      html += '<div class="stage-pipeline">';
      wf.stages.forEach(function (stage) {
        var count = (wf.entity_count_by_stage || {})[stage.name] || 0;
        html +=
          '<span class="stage-chip">' +
          escapeHtml(stage.name) +
          '<span class="count">' +
          count +
          "</span></span>";
      });
      html += "</div>";

      if (wf.entities.length > 0) {
        var sort = sortState[wfIdx] || { column: "id", asc: true };
        var sorted = sortEntities(wf.entities, sort.column, sort.asc);
        var columns = ["id", "slug", "status", "title", "score", "source"];

        html += "<table><thead><tr>";
        columns.forEach(function (col) {
          var cls = "";
          if (sort.column === col) {
            cls = sort.asc ? "sorted-asc" : "sorted-desc";
          }
          html +=
            '<th class="' +
            cls +
            '" data-wf="' +
            wfIdx +
            '" data-col="' +
            col +
            '">' +
            col.toUpperCase() +
            "</th>";
        });
        html += "</tr></thead><tbody>";

        sorted.forEach(function (e) {
          html += "<tr>";
          columns.forEach(function (col) {
            var val = e[col] || "";
            if (col === "status" && val) {
              html +=
                '<td><span class="status-badge" style="background:' +
                statusColor(val) +
                '22;color:' +
                statusColor(val) +
                '">' +
                escapeHtml(val) +
                "</span></td>";
            } else {
              html += "<td>" + escapeHtml(val) + "</td>";
            }
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
      } else {
        html += '<p class="empty-state">No entities.</p>';
      }
      html += "</div>";
    });
    container.innerHTML = html;

    container.querySelectorAll("th[data-col]").forEach(function (th) {
      th.addEventListener("click", function () {
        var wfIdx = parseInt(th.getAttribute("data-wf"));
        var col = th.getAttribute("data-col");
        var prev = sortState[wfIdx] || { column: "id", asc: true };
        if (prev.column === col) {
          sortState[wfIdx] = { column: col, asc: !prev.asc };
        } else {
          sortState[wfIdx] = { column: col, asc: true };
        }
        fetchWorkflows();
      });
    });
  }

  fetchWorkflows();
  setInterval(fetchWorkflows, POLL_INTERVAL);
})();
```

- [ ] **Step 4: Verify handler tests still pass with real static files**

Run: `cd <worktree> && python3 -m pytest tests/test_dashboard_handlers.py -v`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/index.html tools/dashboard/static/style.css tools/dashboard/static/app.js
git commit -m "feat(dashboard): add frontend -- HTML/CSS/JS with polling auto-refresh"
```

---

## Task 5: Server Entry Point

**Files:**
- Create: `tools/dashboard/serve.py`
- Create: `tools/dashboard/__main__.py`

The entry point parses CLI arguments (port, project root) and starts the server.

- [ ] **Step 1: Create the server entry point**

Create `tools/dashboard/serve.py`:

```python
#!/usr/bin/env python3
"""Spacedock Workflow Status Dashboard -- local development server.

Usage:
    python3 -m tools.dashboard.serve [--port PORT] [--root PROJECT_ROOT]

Serves a web dashboard at http://localhost:PORT that displays all
Spacedock workflows discovered under PROJECT_ROOT.
"""

import argparse
import os
import subprocess
import sys
from http.server import ThreadingHTTPServer

from tools.dashboard.handlers import make_handler


def main():
    parser = argparse.ArgumentParser(description='Spacedock Workflow Status Dashboard')
    parser.add_argument('--port', type=int, default=8420, help='Port to serve on (default: 8420)')
    parser.add_argument('--root', default=None, help='Project root to scan (default: git toplevel or cwd)')
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

    handler_class = make_handler(project_root=project_root, static_dir=static_dir)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_class)

    print('Spacedock Dashboard running at http://127.0.0.1:%d' % args.port)
    print('Scanning workflows in: %s' % project_root)
    print('Press Ctrl+C to stop.')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Create `__main__.py` for `python3 -m` invocation**

Create `tools/dashboard/__main__.py`:

```python
from tools.dashboard.serve import main

main()
```

- [ ] **Step 3: Smoke test -- start server and verify it responds**

```bash
cd <worktree>
timeout 5 python3 -m tools.dashboard.serve --port 8421 --root . &
sleep 2
curl -s http://127.0.0.1:8421/api/workflows | python3 -m json.tool | head -20
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8421/
kill %1 2>/dev/null || true
```

Expected: `/api/workflows` returns a JSON array with discovered workflows. Root `/` returns HTTP 200.

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/serve.py tools/dashboard/__main__.py
git commit -m "feat(dashboard): add server entry point -- python3 -m tools.dashboard.serve"
```

---

## Task 6: Quality Gates

**Files:**
- All test files from Tasks 1-3

Run all quality checks to verify the complete dashboard works end-to-end.

- [ ] **Step 1: Run all dashboard tests**

```bash
cd <worktree>
python3 -m pytest tests/test_dashboard_parsing.py tests/test_dashboard_discovery.py tests/test_dashboard_handlers.py -v
```

Expected: All tests PASS.

- [ ] **Step 2: Run existing status script tests (regression check)**

```bash
cd <worktree>
python3 -m pytest tests/test_status_script.py -v
```

Expected: All existing tests still PASS (dashboard does not modify the status script).

- [ ] **Step 3: Verify no syntax errors in Python files**

```bash
cd <worktree>
python3 -c "
import py_compile, sys, glob
errors = []
for f in glob.glob('tools/dashboard/**/*.py', recursive=True):
    try:
        py_compile.compile(f, doraise=True)
    except py_compile.PyCompileError as e:
        errors.append(str(e))
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('All files compile OK')
"
```

Expected: "All files compile OK"

- [ ] **Step 4: Verify JavaScript delimiter balance**

```bash
cd <worktree>
python3 -c "
with open('tools/dashboard/static/app.js') as f:
    content = f.read()
for pair in [('(', ')'), ('{', '}'), ('[', ']')]:
    opens = content.count(pair[0])
    closes = content.count(pair[1])
    assert opens == closes, 'Unbalanced %s: %d opens, %d closes' % (str(pair), opens, closes)
print('JS delimiter check OK')
"
```

Expected: "JS delimiter check OK"

- [ ] **Step 5: Final commit (if any quality fixes were needed)**

If any fixes were made during quality gate steps, commit them:

```bash
git add -A
git commit -m "fix(dashboard): quality gate fixes"
```

---

## Research Corrections Incorporated

| Correction | Where Applied |
|-----------|---------------|
| CLAIM-2: Copy functions, don't import from extensionless script | Task 1 -- `parsing.py` copies all 3 functions from `skills/commission/bin/status` |
| CLAIM-3: Use client-side polling, not SSE | Task 4 -- `app.js` uses `setInterval` + `fetch()` with 5-second interval |
| CLAIM-5: Follow `first-officer-shared-core.md` discovery algorithm | Task 2 -- `discovery.py` searches for `commissioned-by: spacedock@` in README.md frontmatter, ignores `.git/.worktrees/node_modules/vendor/dist/build/__pycache__` |
