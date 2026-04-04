import tempfile
import textwrap
import unittest

from tools.dashboard.frontmatter_io import parse_entity, update_entity_score, update_entity_tags


class TestParseEntity(unittest.TestCase):
    def test_parse_entity_with_tags(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test entity
            status: work
            score: 0.85
            tags: urgent,triage,finance
            ---

            Some body content.
        """)
        entity = parse_entity(content)
        self.assertEqual(entity['frontmatter']['id'], '"001"')
        self.assertEqual(entity['frontmatter']['title'], 'Test entity')
        self.assertEqual(entity['frontmatter']['score'], '0.85')
        self.assertEqual(entity['tags'], ['urgent', 'triage', 'finance'])
        self.assertIn('Some body content.', entity['body'])

    def test_parse_entity_without_tags(self):
        content = textwrap.dedent("""\
            ---
            id: "002"
            title: No tags entity
            status: backlog
            score: 0.5
            ---

            Body here.
        """)
        entity = parse_entity(content)
        self.assertEqual(entity['tags'], [])
        self.assertIn('Body here.', entity['body'])

    def test_parse_entity_empty_tags(self):
        content = textwrap.dedent("""\
            ---
            id: "003"
            title: Empty tags
            status: work
            tags:
            ---

            Body.
        """)
        entity = parse_entity(content)
        self.assertEqual(entity['tags'], [])


class TestUpdateScore(unittest.TestCase):
    def test_update_existing_score(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            score: 0.5
            ---

            Body.
        """)
        result = update_entity_score(content, 0.85)
        entity = parse_entity(result)
        self.assertEqual(entity['frontmatter']['score'], '0.85')
        self.assertIn('Body.', entity['body'])

    def test_update_empty_score(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            score:
            ---

            Body.
        """)
        result = update_entity_score(content, 0.7)
        entity = parse_entity(result)
        self.assertEqual(entity['frontmatter']['score'], '0.7')


class TestUpdateTags(unittest.TestCase):
    def test_add_tags_to_entity_without_tags(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            score: 0.5
            ---

            Body.
        """)
        result = update_entity_tags(content, ['urgent', 'triage'])
        entity = parse_entity(result)
        self.assertEqual(entity['tags'], ['urgent', 'triage'])
        self.assertIn('Body.', entity['body'])

    def test_replace_existing_tags(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            tags: old,stale
            ---

            Body.
        """)
        result = update_entity_tags(content, ['new', 'fresh'])
        entity = parse_entity(result)
        self.assertEqual(entity['tags'], ['new', 'fresh'])

    def test_body_preserved_after_tag_update(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            ---

            ## Stage Report: work

            - [x] Did the thing
              Evidence here.

            ### Summary

            All done.
        """)
        result = update_entity_tags(content, ['finance'])
        self.assertIn('## Stage Report: work', result)
        self.assertIn('- [x] Did the thing', result)
        self.assertIn('### Summary', result)


if __name__ == '__main__':
    unittest.main()
