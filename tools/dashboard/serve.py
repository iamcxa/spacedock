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
