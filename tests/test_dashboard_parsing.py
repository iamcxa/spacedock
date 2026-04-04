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
