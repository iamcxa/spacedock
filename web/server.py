"""Spacedock web server — serves dashboard and entity detail views.

Foundation server for the workflow status dashboard (feature 001) and
entity detail management UI (feature 002). Uses stdlib http.server only.
"""
import json
import os
import sys
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure web/ is on the Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import get_entity_detail, update_score, update_tags, filter_entities

WEB_DIR = os.path.dirname(os.path.abspath(__file__))

CONTENT_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
}


class SpacedockHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self._handle_api_routes():
            return
        self._handle_static()

    def do_POST(self):
        if self._handle_api_routes():
            return
        self._send_error(404, 'Not found')

    def _handle_api_routes(self):
        """Route API requests. Returns True if handled, False otherwise."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if self.command == 'GET' and path == '/api/entity/detail':
            filepath = query.get('path', [None])[0]
            if not filepath:
                self._json_response({'error': 'path required'}, 400)
                return True
            data = get_entity_detail(filepath)
            self._json_response(data)
            return True

        if self.command == 'GET' and path == '/api/entities':
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
            self._json_response(results)
            return True

        if self.command == 'POST' and path == '/api/entity/score':
            body = json.loads(self._read_body())
            update_score(body['path'], body['score'])
            self._json_response({'ok': True})
            return True

        if self.command == 'POST' and path == '/api/entity/tags':
            body = json.loads(self._read_body())
            update_tags(body['path'], body['tags'])
            self._json_response({'ok': True})
            return True

        if self.command == 'GET' and path == '/detail':
            self._serve_file('detail.html', 'text/html')
            return True

        return False

    def _handle_static(self):
        """Serve static files and index."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/' or path == '/index.html':
            self._serve_file('index.html', 'text/html')
            return

        if path.startswith('/static/'):
            rel_path = path[1:]  # strip leading /
            full_path = os.path.join(WEB_DIR, rel_path)
            if os.path.isfile(full_path):
                ext = os.path.splitext(full_path)[1]
                content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')
                self._serve_file(rel_path, content_type)
                return

        self._send_error(404, 'Not found')

    def _serve_file(self, rel_path, content_type):
        """Serve a file from the web directory."""
        full_path = os.path.join(WEB_DIR, rel_path)
        try:
            with open(full_path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self._send_error(404, 'Not found')

    def _json_response(self, data, status=200):
        """Send a JSON response."""
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        """Read the request body."""
        length = int(self.headers.get('Content-Length', 0))
        return self.rfile.read(length).decode('utf-8')

    def _send_error(self, status, message):
        """Send an error response."""
        self._json_response({'error': message}, status)

    def log_message(self, format, *args):
        """Quiet logging — only print to stderr."""
        sys.stderr.write('%s - %s\n' % (self.address_string(), format % args))


def main():
    port = int(os.environ.get('SPACEDOCK_PORT', '8080'))
    server = HTTPServer(('127.0.0.1', port), SpacedockHandler)
    print(f'Spacedock web UI: http://127.0.0.1:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.server_close()


if __name__ == '__main__':
    main()
