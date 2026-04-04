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
