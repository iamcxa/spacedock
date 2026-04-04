import textwrap
import unittest

from tools.dashboard.frontmatter_io import parse_entity, extract_stage_reports


class TestExtractStageReports(unittest.TestCase):
    def test_single_stage_report(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            status: work
            ---

            Some task description.

            ## Stage Report: work

            - [x] Did the thing
              Evidence here.
            - [ ] SKIP: Optional step
              Not needed for this entity.
            - [ ] FAIL: Broken step
              Error details.

            ### Summary

            All done with one skip and one failure.
        """)
        reports = extract_stage_reports(content)
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]['stage'], 'work')
        self.assertEqual(len(reports[0]['items']), 3)
        self.assertEqual(reports[0]['items'][0]['status'], 'done')
        self.assertEqual(reports[0]['items'][0]['text'], 'Did the thing')
        self.assertEqual(reports[0]['items'][0]['detail'], 'Evidence here.')
        self.assertEqual(reports[0]['items'][1]['status'], 'skip')
        self.assertEqual(reports[0]['items'][1]['text'], 'Optional step')
        self.assertEqual(reports[0]['items'][2]['status'], 'fail')
        self.assertEqual(reports[0]['items'][2]['text'], 'Broken step')
        self.assertIn('All done', reports[0]['summary'])

    def test_multiple_stage_reports(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            status: review
            ---

            Description.

            ## Stage Report: implementation

            - [x] Wrote the code
              code.py created.

            ### Summary

            Implemented.

            ## Stage Report: review

            - [x] Code reviewed
              LGTM.

            ### Summary

            Reviewed and approved.
        """)
        reports = extract_stage_reports(content)
        self.assertEqual(len(reports), 2)
        self.assertEqual(reports[0]['stage'], 'implementation')
        self.assertEqual(reports[1]['stage'], 'review')

    def test_no_stage_reports(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            status: backlog
            ---

            Just a description, no stage reports yet.
        """)
        reports = extract_stage_reports(content)
        self.assertEqual(reports, [])

    def test_body_without_reports(self):
        content = textwrap.dedent("""\
            ---
            id: "001"
            title: Test
            status: work
            ---

            Task description here.

            ## Acceptance Criteria

            1. Thing works
            2. Other thing works

            ## Stage Report: work

            - [x] Completed
              Done.

            ### Summary

            Finished.
        """)
        entity = parse_entity(content)
        # Body should contain everything after frontmatter
        self.assertIn('Task description here.', entity['body'])
        self.assertIn('## Acceptance Criteria', entity['body'])


if __name__ == '__main__':
    unittest.main()
