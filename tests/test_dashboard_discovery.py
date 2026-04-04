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
