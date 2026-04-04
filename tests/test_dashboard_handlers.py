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


class TestLogFileSupport(unittest.TestCase):
    """Test log_message writes to file when log_file is provided."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        wf_dir = os.path.join(self.tmpdir, 'my-workflow')
        os.makedirs(wf_dir)
        with open(os.path.join(wf_dir, 'README.md'), 'w') as f:
            f.write(README_CONTENT)

        self.static_dir = tempfile.mkdtemp()
        with open(os.path.join(self.static_dir, 'index.html'), 'w') as f:
            f.write('<html><body>Dashboard</body></html>')

    def tearDown(self):
        shutil.rmtree(self.tmpdir)
        shutil.rmtree(self.static_dir)

    def _start_server(self, log_file=None):
        handler_class = make_handler(
            project_root=self.tmpdir,
            static_dir=self.static_dir,
            log_file=log_file,
        )
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler_class)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever)
        thread.daemon = True
        thread.start()
        return server, port, thread

    def test_log_message_suppressed_by_default(self):
        """Without log_file, log_message is a no-op (backward compatible)."""
        log_path = os.path.join(self.tmpdir, 'test.log')
        server, port, thread = self._start_server(log_file=None)
        try:
            url = 'http://127.0.0.1:%d/' % port
            urllib.request.urlopen(url)
            self.assertFalse(os.path.exists(log_path))
        finally:
            server.shutdown()
            thread.join(timeout=5)

    def test_log_message_writes_to_file(self):
        """With log_file set, access logs are written to the file."""
        log_path = os.path.join(self.tmpdir, 'test.log')
        server, port, thread = self._start_server(log_file=log_path)
        try:
            url = 'http://127.0.0.1:%d/' % port
            urllib.request.urlopen(url)
            self.assertTrue(os.path.exists(log_path))
            with open(log_path) as f:
                content = f.read()
            self.assertIn('GET', content)
            self.assertIn('200', content)
        finally:
            server.shutdown()
            thread.join(timeout=5)


class TestPathTraversalGuard(unittest.TestCase):
    """Test that API endpoints reject paths outside the project root."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        wf_dir = os.path.join(self.tmpdir, 'my-workflow')
        os.makedirs(wf_dir)
        with open(os.path.join(wf_dir, 'README.md'), 'w') as f:
            f.write(README_CONTENT)
        with open(os.path.join(wf_dir, 'task-a.md'), 'w') as f:
            f.write('---\nid: 001\ntitle: Task A\nstatus: backlog\nscore: 0.8\nsource: user\nworktree:\ntags: urgent\n---\n')

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
            return resp.status, json.loads(resp.read()), resp.headers

    def _post(self, path, data):
        url = 'http://127.0.0.1:%d%s' % (self.port, path)
        body = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read()), resp.headers

    def test_entity_detail_rejects_absolute_path_outside_root(self):
        path = urllib.parse.quote('/etc/passwd', safe='')
        try:
            self._get('/api/entity/detail?path=/etc/passwd')
            self.fail('Expected 403')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)

    def test_entity_detail_rejects_relative_traversal(self):
        try:
            self._get('/api/entity/detail?path=../../etc/passwd')
            self.fail('Expected 403')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)

    def test_entity_detail_allows_valid_path(self):
        entity_path = os.path.join(self.tmpdir, 'my-workflow', 'task-a.md')
        encoded = urllib.parse.quote(entity_path, safe='')
        status, data, _ = self._get('/api/entity/detail?path=%s' % encoded)
        self.assertEqual(status, 200)
        self.assertEqual(data['frontmatter']['title'], 'Task A')

    def test_filter_entities_rejects_outside_dir(self):
        try:
            self._get('/api/entities?dir=/etc')
            self.fail('Expected 403')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)

    def test_filter_entities_allows_valid_dir(self):
        wf_dir = os.path.join(self.tmpdir, 'my-workflow')
        encoded = urllib.parse.quote(wf_dir, safe='')
        status, data, _ = self._get('/api/entities?dir=%s' % encoded)
        self.assertEqual(status, 200)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)

    def test_update_score_rejects_outside_path(self):
        try:
            self._post('/api/entity/score', {'path': '/etc/passwd', 'score': '1.0'})
            self.fail('Expected 403')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)

    def test_update_tags_rejects_outside_path(self):
        try:
            self._post('/api/entity/tags', {'path': '/etc/passwd', 'tags': 'test'})
            self.fail('Expected 403')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)

    def test_cors_header_not_present(self):
        """CORS wildcard header should be removed from JSON responses."""
        entity_path = os.path.join(self.tmpdir, 'my-workflow', 'task-a.md')
        encoded = urllib.parse.quote(entity_path, safe='')
        _, _, headers = self._get('/api/entity/detail?path=%s' % encoded)
        self.assertIsNone(headers.get('Access-Control-Allow-Origin'))


class TestServeArgparse(unittest.TestCase):
    """Test serve.py argument parsing."""

    def test_serve_accepts_log_file_arg(self):
        """--log-file is accepted by argparse without error."""
        import subprocess
        import sys
        result = subprocess.run(
            [sys.executable, '-m', 'tools.dashboard.serve', '--help'],
            capture_output=True, text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        )
        self.assertIn('--log-file', result.stdout)


if __name__ == '__main__':
    unittest.main()
