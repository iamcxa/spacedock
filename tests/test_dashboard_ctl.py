"""Tests for dashboard daemon lifecycle management (ctl.sh)."""

import os
import signal
import socket
import subprocess
import sys
import tempfile
import textwrap
import time
import threading
import unittest
from http.server import HTTPServer, BaseHTTPRequestHandler

WORKTREE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTL_PATH = os.path.join(WORKTREE, 'tools', 'dashboard', 'ctl.sh')

# Minimal workflow fixture so the dashboard server can start
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


def _make_project(tmpdir):
    """Create a minimal project dir with a workflow so the server can start."""
    wf_dir = os.path.join(tmpdir, 'my-workflow')
    os.makedirs(wf_dir, exist_ok=True)
    with open(os.path.join(wf_dir, 'README.md'), 'w') as f:
        f.write(README_CONTENT)


class _DummyHandler(BaseHTTPRequestHandler):
    """Minimal handler that responds 200 to all requests."""
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')
    def log_message(self, format, *args):
        pass


class TestDashboardCtl(unittest.TestCase):
    """Test ctl.sh daemon lifecycle management."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        _make_project(self.tmpdir)

    def tearDown(self):
        # Best-effort stop
        try:
            self._ctl('stop')
        except Exception:
            pass
        # Clean up tmpdir
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _ctl(self, *args, timeout=15):
        cmd = ['bash', CTL_PATH] + list(args) + ['--root', self.tmpdir]
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                              cwd=WORKTREE)

    def test_start_creates_pid_file(self):
        """start creates a PID file at the expected state dir path."""
        result = self._ctl('start')
        self.assertEqual(result.returncode, 0, result.stderr)
        # Find the state dir — compute hash same way ctl.sh does
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        pid_file = os.path.expanduser(
            '~/.spacedock/dashboard/%s/pid' % proj_hash)
        self.assertTrue(os.path.exists(pid_file),
                        'PID file not found at %s' % pid_file)
        with open(pid_file) as f:
            pid = int(f.read().strip())
        # Process should be alive
        os.kill(pid, 0)  # raises if not running

    def test_start_health_check(self):
        """start results in a server responding to HTTP."""
        result = self._ctl('start')
        self.assertEqual(result.returncode, 0, result.stderr)
        # Extract port from output
        port = self._get_running_port()
        self.assertIsNotNone(port, 'Could not determine port from status')
        import urllib.request
        resp = urllib.request.urlopen('http://127.0.0.1:%d/' % port, timeout=5)
        self.assertEqual(resp.status, 200)

    def test_stop_cleans_pid(self):
        """stop terminates the process and removes PID file."""
        self._ctl('start')
        pid = self._get_running_pid()
        self.assertIsNotNone(pid)

        result = self._ctl('stop')
        self.assertEqual(result.returncode, 0, result.stderr)

        # Process should be dead
        time.sleep(0.5)
        with self.assertRaises(ProcessLookupError):
            os.kill(pid, 0)

        # PID file should be gone
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        pid_file = os.path.expanduser(
            '~/.spacedock/dashboard/%s/pid' % proj_hash)
        self.assertFalse(os.path.exists(pid_file))

    def test_status_shows_running(self):
        """status output contains running state, PID, and URL."""
        self._ctl('start')
        result = self._ctl('status')
        self.assertEqual(result.returncode, 0, result.stderr)
        output = result.stdout.lower()
        self.assertIn('running', output)
        self.assertIn('pid', output)
        self.assertIn('http://127.0.0.1:', output.lower().replace('localhost', '127.0.0.1'))

    def test_stale_pid_detection(self):
        """A stale PID file is cleaned up and a new server starts."""
        # Create state dir with a fake PID file pointing to dead process
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        state_dir = os.path.expanduser(
            '~/.spacedock/dashboard/%s' % proj_hash)
        os.makedirs(state_dir, exist_ok=True)
        # PID 99999 is almost certainly dead
        with open(os.path.join(state_dir, 'pid'), 'w') as f:
            f.write('99999\n')
        with open(os.path.join(state_dir, 'port'), 'w') as f:
            f.write('8420\n')
        with open(os.path.join(state_dir, 'root'), 'w') as f:
            f.write(self.tmpdir + '\n')

        result = self._ctl('start')
        self.assertEqual(result.returncode, 0, result.stderr)
        # Should have started a new process
        pid = self._get_running_pid()
        self.assertIsNotNone(pid)
        self.assertNotEqual(pid, 99999)

    def test_idempotent_start(self):
        """Starting when already running reports existing instance."""
        self._ctl('start')
        pid1 = self._get_running_pid()
        result = self._ctl('start')
        self.assertEqual(result.returncode, 0)
        pid2 = self._get_running_pid()
        self.assertEqual(pid1, pid2, 'PID should not change on double start')
        self.assertIn('already running', result.stdout.lower())

    def test_log_rotation(self):
        """Starting rotates the existing log file to .1."""
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        state_dir = os.path.expanduser(
            '~/.spacedock/dashboard/%s' % proj_hash)
        os.makedirs(state_dir, exist_ok=True)
        log_file = os.path.join(state_dir, 'dashboard.log')
        with open(log_file, 'w') as f:
            f.write('old log content\n')

        self._ctl('start')
        rotated = log_file + '.1'
        self.assertTrue(os.path.exists(rotated),
                        'Rotated log file not found at %s' % rotated)
        with open(rotated) as f:
            self.assertIn('old log content', f.read())

    def test_port_auto_selection(self):
        """When default port is occupied, ctl.sh picks the next available."""
        # Occupy port 8420 with a dummy server
        try:
            dummy = HTTPServer(('127.0.0.1', 8420), _DummyHandler)
        except OSError:
            # Port 8420 already in use (e.g. from previous test) — that's fine,
            # the auto-selection should still work
            dummy = None

        if dummy is not None:
            dummy_thread = threading.Thread(target=dummy.serve_forever)
            dummy_thread.daemon = True
            dummy_thread.start()
        try:
            result = self._ctl('start')
            self.assertEqual(result.returncode, 0, result.stderr)
            port = self._get_running_port()
            self.assertIsNotNone(port)
            self.assertNotEqual(port, 8420, 'Should have picked a different port')
            self.assertGreaterEqual(port, 8421)
            self.assertLessEqual(port, 8429)
        finally:
            if dummy is not None:
                dummy.shutdown()
                dummy_thread.join(timeout=5)

    # -- helpers --

    def _get_running_pid(self):
        """Read PID from state dir."""
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        pid_file = os.path.expanduser(
            '~/.spacedock/dashboard/%s/pid' % proj_hash)
        if not os.path.exists(pid_file):
            return None
        with open(pid_file) as f:
            return int(f.read().strip())

    def _get_running_port(self):
        """Read port from state dir."""
        hash_result = subprocess.run(
            ['bash', '-c', 'echo -n "%s" | shasum | cut -c1-8' % self.tmpdir],
            capture_output=True, text=True)
        proj_hash = hash_result.stdout.strip()
        port_file = os.path.expanduser(
            '~/.spacedock/dashboard/%s/port' % proj_hash)
        if not os.path.exists(port_file):
            return None
        with open(port_file) as f:
            return int(f.read().strip())


if __name__ == '__main__':
    unittest.main()
