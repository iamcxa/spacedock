import json
import os
import tempfile
import textwrap
import unittest

from tools.dashboard.api import get_entity_detail, update_score, update_tags, filter_entities


SAMPLE_ENTITY = textwrap.dedent("""\
    ---
    id: "001"
    title: Gate test entity
    status: work
    score: 0.90
    source: test
    tags: urgent,finance
    ---

    Write a one-line summary.

    ## Stage Report: work

    - [x] Completed the task
      Evidence here.

    ### Summary

    All done.
""")

SAMPLE_ENTITY_NO_TAGS = textwrap.dedent("""\
    ---
    id: "002"
    title: Another entity
    status: backlog
    score: 0.5
    source: seed
    ---

    Just a description.
""")


class TestGetEntityDetail(unittest.TestCase):
    def test_returns_parsed_entity(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(SAMPLE_ENTITY)
            f.flush()
            try:
                result = get_entity_detail(f.name)
                self.assertEqual(result['frontmatter']['id'], '"001"')
                self.assertEqual(result['frontmatter']['title'], 'Gate test entity')
                self.assertEqual(result['tags'], ['urgent', 'finance'])
                self.assertEqual(len(result['stage_reports']), 1)
                self.assertEqual(result['stage_reports'][0]['stage'], 'work')
                self.assertIn('Write a one-line summary.', result['body'])
            finally:
                os.unlink(f.name)


class TestUpdateScore(unittest.TestCase):
    def test_writes_score_to_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(SAMPLE_ENTITY)
            f.flush()
            try:
                update_score(f.name, 0.75)
                with open(f.name) as rf:
                    content = rf.read()
                self.assertIn('score: 0.75', content)
                # Body preserved
                self.assertIn('## Stage Report: work', content)
            finally:
                os.unlink(f.name)


class TestUpdateTags(unittest.TestCase):
    def test_writes_tags_to_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(SAMPLE_ENTITY_NO_TAGS)
            f.flush()
            try:
                update_tags(f.name, ['triage', 'review'])
                with open(f.name) as rf:
                    content = rf.read()
                self.assertIn('tags: triage,review', content)
                # Body preserved
                self.assertIn('Just a description.', content)
            finally:
                os.unlink(f.name)

    def test_replaces_existing_tags(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(SAMPLE_ENTITY)
            f.flush()
            try:
                update_tags(f.name, ['new-tag'])
                with open(f.name) as rf:
                    content = rf.read()
                self.assertIn('tags: new-tag', content)
                self.assertNotIn('urgent', content.split('---')[1])
            finally:
                os.unlink(f.name)


class TestFilterEntities(unittest.TestCase):
    def test_filter_by_status(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name, content in [('a.md', SAMPLE_ENTITY), ('b.md', SAMPLE_ENTITY_NO_TAGS)]:
                with open(os.path.join(tmpdir, name), 'w') as f:
                    f.write(content)
            # Write a README.md that should be excluded
            with open(os.path.join(tmpdir, 'README.md'), 'w') as f:
                f.write('---\ncommissioned-by: spacedock@0.9.0\n---\n')
            results = filter_entities(tmpdir, status='work')
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['frontmatter']['id'], '"001"')

    def test_filter_by_tag(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name, content in [('a.md', SAMPLE_ENTITY), ('b.md', SAMPLE_ENTITY_NO_TAGS)]:
                with open(os.path.join(tmpdir, name), 'w') as f:
                    f.write(content)
            results = filter_entities(tmpdir, tag='finance')
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['frontmatter']['title'], 'Gate test entity')

    def test_filter_by_score_range(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name, content in [('a.md', SAMPLE_ENTITY), ('b.md', SAMPLE_ENTITY_NO_TAGS)]:
                with open(os.path.join(tmpdir, name), 'w') as f:
                    f.write(content)
            results = filter_entities(tmpdir, min_score=0.8)
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['frontmatter']['score'], '0.90')

    def test_filter_no_criteria_returns_all(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for name, content in [('a.md', SAMPLE_ENTITY), ('b.md', SAMPLE_ENTITY_NO_TAGS)]:
                with open(os.path.join(tmpdir, name), 'w') as f:
                    f.write(content)
            results = filter_entities(tmpdir)
            self.assertEqual(len(results), 2)


if __name__ == '__main__':
    unittest.main()
