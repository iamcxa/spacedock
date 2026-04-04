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
