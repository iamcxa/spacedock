"""HTTP request handler for the Spacedock dashboard.

Routes:
- GET /api/workflows -- JSON array of discovered workflows with entities
- GET /api/entity/detail?path=... -- JSON entity detail
- GET /api/entities?dir=...&status=...&tag=...&min_score=...&max_score=... -- filtered entity list
- POST /api/entity/score -- update entity score  {path, score}
- POST /api/entity/tags -- update entity tags  {path, tags}
- GET /detail -- serves entity detail page
- GET / -- serves index.html from static directory
- GET /<file> -- serves static files (CSS, JS)
"""

import json
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler

from tools.dashboard.api import (
    get_entity_detail,
    update_score,
    update_tags,
    filter_entities,
)
from tools.dashboard.discovery import discover_workflows, aggregate_workflow

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}


def make_handler(project_root, static_dir, log_file=None):
    """Create a handler class bound to a specific project root and static dir."""

    class DashboardHandler(BaseHTTPRequestHandler):

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            query = urllib.parse.parse_qs(parsed.query)

            if path == '/api/workflows':
                self._handle_api_workflows()
            elif path == '/api/entity/detail':
                self._handle_entity_detail(query)
            elif path == '/api/entities':
                self._handle_filter_entities(query)
            elif path == '/detail':
                self._serve_static('detail.html')
            elif path == '/':
                self._serve_static('index.html')
            else:
                self._serve_static(path.lstrip('/'))

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            if path == '/api/entity/score':
                self._handle_update_score()
            elif path == '/api/entity/tags':
                self._handle_update_tags()
            else:
                self._send_json({'error': 'Not found'}, 404)

        def _handle_api_workflows(self):
            workflows = discover_workflows(project_root)
            result = []
            for wf in workflows:
                data = aggregate_workflow(wf['dir'])
                if data is not None:
                    result.append(data)
            self._send_json(result)

        def _handle_entity_detail(self, query):
            filepath = query.get('path', [None])[0]
            if not filepath:
                self._send_json({'error': 'path required'}, 400)
                return
            data = get_entity_detail(filepath)
            self._send_json(data)

        def _handle_filter_entities(self, query):
            directory = query.get('dir', ['.'])[0]
            status = query.get('status', [None])[0]
            tag = query.get('tag', [None])[0]
            min_score = query.get('min_score', [None])[0]
            max_score = query.get('max_score', [None])[0]
            results = filter_entities(
                directory,
                status=status,
                tag=tag,
                min_score=float(min_score) if min_score else None,
                max_score=float(max_score) if max_score else None,
            )
            self._send_json(results)

        def _handle_update_score(self):
            body = json.loads(self._read_body())
            update_score(body['path'], body['score'])
            self._send_json({'ok': True})

        def _handle_update_tags(self):
            body = json.loads(self._read_body())
            update_tags(body['path'], body['tags'])
            self._send_json({'ok': True})

        def _read_body(self):
            length = int(self.headers.get('Content-Length', 0))
            return self.rfile.read(length).decode('utf-8')

        def _send_json(self, data, status=200):
            body = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)

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
            if log_file:
                with open(log_file, 'a') as f:
                    f.write("%s - - [%s] %s\n" % (
                        self.address_string(),
                        self.log_date_time_string(),
                        format % args,
                    ))

    return DashboardHandler
