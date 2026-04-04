# Entity Detail & Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the workflow status dashboard (feature 001) with entity detail views, rendered markdown, stage report visualization, and basic management actions (tagging, score adjustment, filtering).

**Architecture:** Feature 002 adds a detail view layer on top of feature 001's dashboard. Clicking an entity row navigates to a detail page showing rendered markdown body, parsed stage reports with checklist formatting, and a metadata panel. Management actions (tag editing, score adjustment) write back to entity frontmatter files using the proven `update_frontmatter_fields()` pattern. Filtering extends the entity table with stage, score, and tag filters. The entire UI is client-side HTML/CSS/JS served by feature 001's localhost web server.

**Tech Stack:**
- Python 3 (stdlib) — web server, API endpoints, frontmatter read/write
- Vanilla HTML/CSS/JS — no frontend framework (consistent with project's zero-dependency approach)
- marked.js (CDN) — client-side markdown-to-HTML rendering
- DOMPurify (CDN) — sanitize rendered HTML to prevent XSS
- Feature 001's web server infrastructure (assumed to exist)

**Assumption:** Feature 001 provides a localhost Python web server (e.g., `http.server`-based or similar), workflow discovery via `scan_entities()`, an entity table with sortable columns, and a basic HTML page structure. This plan extends that foundation. File paths assume a `web/` directory for UI code, consistent with `AGENTS.md` ("New web UI code goes in a new directory").

**Research correction applied:** Tags/classification fields use comma-separated flat string format in frontmatter (e.g., `tags: urgent,triage,finance`), NOT YAML list syntax. All 3 independent frontmatter parsers only handle flat `key: value` pairs — indented YAML list items would be silently dropped or misparsed.

---

## File Structure

| File | Responsibility |
|------|---------------|
| **Create:** `web/api.py` | API endpoints: GET entity detail, POST score update, POST tags update, GET filtered entity list |
| **Create:** `web/frontmatter_io.py` | Frontmatter read/write module — wraps `update_frontmatter_fields()` pattern for web use, parses comma-separated tags |
| **Create:** `web/detail.html` | Entity detail page template — markdown body, stage reports, metadata panel, management controls |
| **Create:** `web/static/detail.js` | Client-side JS — markdown rendering (marked.js + DOMPurify), tag editor, score slider, navigation |
| **Create:** `web/static/detail.css` | Styles for detail view — metadata panel, stage report checklists, tag chips, score slider |
| **Create:** `tests/test_frontmatter_io.py` | Unit tests for frontmatter_io module — tag parsing, score update, roundtrip preservation |
| **Create:** `tests/test_api.py` | Unit tests for API endpoints — detail response, score write, tag write, filter logic |
| **Create:** `tests/test_detail_rendering.py` | Tests for stage report parsing and markdown body extraction |
| **Modify:** `web/server.py` (feature 001) | Register new API routes for detail/management endpoints |
| **Modify:** `web/index.html` (feature 001) | Add click handler on entity rows to navigate to detail view |

---

### Task 1: Frontmatter I/O Module — Tag Parsing and Score Update

**Files:**
- Create: `web/frontmatter_io.py`
- Create: `tests/test_frontmatter_io.py`

This task builds the data layer that all management actions depend on. It wraps the proven `update_frontmatter_fields()` text-manipulation pattern into a focused module for web use.

- [ ] **Step 1: Write failing test — parse tags from frontmatter**

```python
# tests/test_frontmatter_io.py
import os
import sys
import tempfile
import textwrap
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web'))

from frontmatter_io import parse_entity, update_entity_score, update_entity_tags


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


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_frontmatter_io.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'frontmatter_io'`

- [ ] **Step 3: Implement parse_entity**

```python
# web/frontmatter_io.py
"""Frontmatter read/write for the web UI layer.

Follows the same flat key:value parsing as the existing codebase parsers
(skills/commission/bin/status, scripts/codex_prepare_dispatch.py,
scripts/test_lib.py). Tags are stored as comma-separated flat strings
in frontmatter — NOT YAML list syntax.
"""


def split_frontmatter(text):
    """Split markdown text into frontmatter lines and body text.

    Returns (dict of key:value pairs, body string).
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != '---':
        raise ValueError('Missing YAML frontmatter')
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end = i
            break
    if end is None:
        raise ValueError('Unterminated YAML frontmatter')
    fm = {}
    for line in lines[1:end]:
        if ':' not in line:
            continue
        key, _, val = line.partition(':')
        fm[key.strip()] = val.strip()
    body = '\n'.join(lines[end + 1:])
    return fm, body


def parse_tags(raw_tags):
    """Parse comma-separated tags string into a list.

    Tags are stored as flat comma-separated strings in frontmatter:
        tags: urgent,triage,finance
    NOT as YAML list syntax (which would break all 3 codebase parsers).
    """
    if not raw_tags or not raw_tags.strip():
        return []
    return [t.strip() for t in raw_tags.split(',') if t.strip()]


def parse_entity(text):
    """Parse entity markdown into structured data for the web UI."""
    fm, body = split_frontmatter(text)
    return {
        'frontmatter': fm,
        'tags': parse_tags(fm.get('tags', '')),
        'body': body,
    }


def update_frontmatter_fields(text, updates):
    """Update frontmatter fields in-place, preserving body and field order.

    Mirrors the proven pattern from scripts/codex_prepare_dispatch.py:61-80.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != '---':
        raise ValueError('Missing YAML frontmatter')
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end = i
            break
    if end is None:
        raise ValueError('Unterminated YAML frontmatter')
    fm_lines = lines[1:end]
    body_lines = lines[end + 1:]
    seen = set()
    out = []
    for line in fm_lines:
        if ':' not in line:
            out.append(line)
            continue
        key, _, _ = line.partition(':')
        key = key.strip()
        if key in updates:
            out.append(f'{key}: {updates[key]}')
            seen.add(key)
        else:
            out.append(line)
    for key, value in updates.items():
        if key not in seen:
            out.append(f'{key}: {value}')
    return '\n'.join(['---', *out, '---', *body_lines]) + '\n'


def update_entity_score(text, new_score):
    """Update the score field in entity frontmatter."""
    return update_frontmatter_fields(text, {'score': str(new_score)})


def update_entity_tags(text, tags):
    """Update the tags field in entity frontmatter.

    Tags are stored as a comma-separated flat string, e.g.:
        tags: urgent,triage,finance
    """
    tags_str = ','.join(t.strip() for t in tags if t.strip())
    return update_frontmatter_fields(text, {'tags': tags_str})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_frontmatter_io.py::TestParseEntity -v`
Expected: 3 tests PASS

- [ ] **Step 5: Write failing tests — score and tag updates**

Add to `tests/test_frontmatter_io.py`:

```python
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
```

- [ ] **Step 6: Run all tests to verify they pass**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_frontmatter_io.py -v`
Expected: 8 tests PASS

- [ ] **Step 7: Commit**

```bash
git add web/frontmatter_io.py tests/test_frontmatter_io.py
git commit -m "feat: add frontmatter I/O module for entity detail web UI

Wraps proven update_frontmatter_fields() pattern for web use.
Tags stored as comma-separated flat strings per research correction."
```

---

### Task 2: Stage Report Parsing and Body Extraction

**Files:**
- Modify: `web/frontmatter_io.py`
- Create: `tests/test_detail_rendering.py`

This task adds structured parsing of stage reports from entity markdown body content. The Stage Report Protocol is defined in `references/ensign-shared-core.md` and uses a consistent format across 44+ files in the codebase.

- [ ] **Step 1: Write failing tests — stage report extraction**

```python
# tests/test_detail_rendering.py
import os
import sys
import textwrap
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web'))

from frontmatter_io import parse_entity, extract_stage_reports


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_detail_rendering.py -v`
Expected: FAIL — `ImportError: cannot import name 'extract_stage_reports'`

- [ ] **Step 3: Implement extract_stage_reports**

Add to `web/frontmatter_io.py`:

```python
import re


def extract_stage_reports(text):
    """Extract structured stage reports from entity markdown.

    Parses the Stage Report Protocol format defined in
    references/ensign-shared-core.md:30-55:

        ## Stage Report: {stage_name}

        - [x] {item text}
          {evidence}
        - [ ] SKIP: {item text}
          {rationale}
        - [ ] FAIL: {item text}
          {details}

        ### Summary

        {summary text}
    """
    _, body = split_frontmatter(text)
    reports = []
    # Split body on stage report headings
    pattern = r'^## Stage Report: (.+)$'
    sections = re.split(pattern, body, flags=re.MULTILINE)
    # sections[0] is text before first report, then alternating: stage_name, section_body
    for i in range(1, len(sections), 2):
        stage_name = sections[i].strip()
        section_body = sections[i + 1] if i + 1 < len(sections) else ''
        items = []
        summary = ''
        # Extract summary
        summary_match = re.split(r'^### Summary\s*$', section_body, flags=re.MULTILINE)
        checklist_text = summary_match[0]
        if len(summary_match) > 1:
            summary = summary_match[1].strip()
        # Parse checklist items
        item_pattern = r'^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$'
        lines = checklist_text.splitlines()
        for j, line in enumerate(lines):
            m = re.match(item_pattern, line)
            if m:
                checked, prefix, item_text = m.groups()
                if checked == 'x':
                    status = 'done'
                elif prefix.startswith('SKIP'):
                    status = 'skip'
                elif prefix.startswith('FAIL'):
                    status = 'fail'
                else:
                    status = 'pending'
                # Look for indented detail on next line
                detail = ''
                if j + 1 < len(lines) and lines[j + 1].startswith('  '):
                    detail = lines[j + 1].strip()
                items.append({
                    'status': status,
                    'text': item_text.strip(),
                    'detail': detail,
                })
        reports.append({
            'stage': stage_name,
            'items': items,
            'summary': summary,
        })
    return reports
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_detail_rendering.py -v`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/frontmatter_io.py tests/test_detail_rendering.py
git commit -m "feat: add stage report extraction from entity markdown

Parses Stage Report Protocol (ensign-shared-core.md) checklist format
into structured data for the detail view UI."
```

---

### Task 3: API Endpoints — Entity Detail, Score Update, Tag Update

**Files:**
- Create: `web/api.py`
- Create: `tests/test_api.py`

This task builds the HTTP API layer that the detail view JS will call. It depends on `web/frontmatter_io.py` from Task 1-2.

**Assumption:** Feature 001 provides `web/server.py` with a basic HTTP server. This task creates the API module that `server.py` will import and route to. If feature 001 uses `http.server.BaseHTTPRequestHandler`, the API module returns response data and the server handles HTTP framing. If feature 001 uses a different approach, adapt the integration point in Task 6.

- [ ] **Step 1: Write failing tests — GET entity detail**

```python
# tests/test_api.py
import json
import os
import sys
import tempfile
import textwrap
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web'))

from api import get_entity_detail, update_score, update_tags, filter_entities


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_api.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api'`

- [ ] **Step 3: Implement API module**

```python
# web/api.py
"""API functions for entity detail and management.

These functions are called by the web server's request handler.
They read/write entity markdown files and return structured data
that the server serializes to JSON responses.
"""
import glob
import os

from frontmatter_io import (
    extract_stage_reports,
    parse_entity,
    update_entity_score,
    update_entity_tags,
)


def get_entity_detail(filepath):
    """Read an entity file and return structured detail data.

    Returns dict with: frontmatter, tags, body, stage_reports, filepath.
    """
    with open(filepath) as f:
        text = f.read()
    entity = parse_entity(text)
    entity['stage_reports'] = extract_stage_reports(text)
    entity['filepath'] = filepath
    return entity


def update_score(filepath, new_score):
    """Update the score field in an entity file."""
    with open(filepath) as f:
        text = f.read()
    updated = update_entity_score(text, new_score)
    with open(filepath, 'w') as f:
        f.write(updated)


def update_tags(filepath, tags):
    """Update the tags field in an entity file.

    Tags are written as a comma-separated flat string:
        tags: urgent,triage,finance
    """
    with open(filepath) as f:
        text = f.read()
    updated = update_entity_tags(text, tags)
    with open(filepath, 'w') as f:
        f.write(updated)


def _scan_entities(directory):
    """Scan a directory for entity .md files (excluding README.md).

    Same pattern as skills/commission/bin/status:scan_entities().
    """
    entities = []
    for path in sorted(glob.glob(os.path.join(directory, '*.md'))):
        if os.path.basename(path) == 'README.md':
            continue
        with open(path) as f:
            text = f.read()
        entity = parse_entity(text)
        entity['stage_reports'] = extract_stage_reports(text)
        entity['filepath'] = path
        entity['slug'] = os.path.splitext(os.path.basename(path))[0]
        entities.append(entity)
    return entities


def filter_entities(directory, status=None, tag=None, min_score=None, max_score=None):
    """Return entities matching the given filter criteria.

    All filters are optional. When multiple are provided, they are AND-ed.
    """
    entities = _scan_entities(directory)
    results = []
    for entity in entities:
        fm = entity['frontmatter']
        if status and fm.get('status', '') != status:
            continue
        if tag and tag not in entity['tags']:
            continue
        if min_score is not None:
            score_str = fm.get('score', '')
            if not score_str:
                continue
            try:
                if float(score_str) < min_score:
                    continue
            except ValueError:
                continue
        if max_score is not None:
            score_str = fm.get('score', '')
            if not score_str:
                continue
            try:
                if float(score_str) > max_score:
                    continue
            except ValueError:
                continue
        results.append(entity)
    return results
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_api.py -v`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/api.py tests/test_api.py
git commit -m "feat: add API module for entity detail, score/tag updates, and filtering"
```

---

### Task 4: Entity Detail HTML Page

**Files:**
- Create: `web/detail.html`
- Create: `web/static/detail.css`

This task builds the static HTML/CSS for the entity detail view. It will be populated by JavaScript in Task 5.

- [ ] **Step 1: Create the detail page HTML**

```html
<!-- web/detail.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Entity Detail</title>
    <link rel="stylesheet" href="/static/detail.css">
</head>
<body>
    <nav class="top-bar">
        <a href="/" class="back-link">&larr; Back to Dashboard</a>
        <span id="entity-title" class="nav-title"></span>
    </nav>

    <div class="detail-layout">
        <main class="detail-main">
            <section id="entity-body" class="entity-body">
                <!-- Rendered markdown body inserted here by JS -->
            </section>

            <section id="stage-reports" class="stage-reports">
                <!-- Stage report sections inserted here by JS -->
            </section>
        </main>

        <aside class="detail-sidebar">
            <section class="metadata-panel">
                <h3>Metadata</h3>
                <dl id="metadata-fields">
                    <!-- Frontmatter key-value pairs inserted here by JS -->
                </dl>
            </section>

            <section class="management-panel">
                <h3>Score</h3>
                <div class="score-control">
                    <input type="range" id="score-slider" min="0" max="1" step="0.05" value="0">
                    <span id="score-display">0.00</span>
                    <button id="score-save" class="btn btn-small">Save</button>
                </div>

                <h3>Tags</h3>
                <div class="tag-editor">
                    <div id="tag-chips" class="tag-chips">
                        <!-- Tag chips inserted here by JS -->
                    </div>
                    <div class="tag-input-row">
                        <input type="text" id="tag-input" placeholder="Add tag..." class="tag-input">
                        <button id="tag-add" class="btn btn-small">Add</button>
                    </div>
                </div>
            </section>
        </aside>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
    <script src="/static/detail.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the detail page CSS**

```css
/* web/static/detail.css */

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a2e;
    background: #f8f9fa;
    line-height: 1.6;
}

.top-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    color: #e0e0e0;
}

.back-link {
    color: #7ecbff;
    text-decoration: none;
    font-size: 0.9rem;
}

.back-link:hover { text-decoration: underline; }

.nav-title {
    font-weight: 600;
    font-size: 1.1rem;
}

.detail-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 1.5rem auto;
    padding: 0 1.5rem;
}

.detail-main {
    min-width: 0;
}

.entity-body {
    background: #fff;
    border-radius: 8px;
    padding: 1.5rem 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Markdown content styles */
.entity-body h1, .entity-body h2, .entity-body h3 {
    margin-top: 1.2em;
    margin-bottom: 0.5em;
}
.entity-body p { margin-bottom: 0.8em; }
.entity-body code {
    background: #f0f0f0;
    padding: 0.15em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
}
.entity-body pre {
    background: #f0f0f0;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1em;
}
.entity-body ol, .entity-body ul {
    margin-left: 1.5em;
    margin-bottom: 0.8em;
}

/* Stage report cards */
.stage-reports { display: flex; flex-direction: column; gap: 1rem; }

.stage-report-card {
    background: #fff;
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.stage-report-card h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: #1a1a2e;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
}

.checklist { list-style: none; padding: 0; }

.checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.3rem 0;
}

.checklist-item .status-icon {
    flex-shrink: 0;
    width: 1.2em;
    text-align: center;
    font-weight: bold;
}

.checklist-item.done .status-icon { color: #2ea043; }
.checklist-item.skip .status-icon { color: #d4a017; }
.checklist-item.fail .status-icon { color: #d73a49; }

.checklist-item .item-text { font-weight: 500; }
.checklist-item .item-detail {
    display: block;
    font-size: 0.85em;
    color: #666;
    margin-left: 1.7em;
    margin-top: 0.1em;
}

.stage-summary {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
    font-size: 0.9em;
    color: #555;
}

/* Sidebar */
.detail-sidebar {
    position: sticky;
    top: 1.5rem;
    align-self: start;
}

.metadata-panel, .management-panel {
    background: #fff;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.metadata-panel h3, .management-panel h3 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 0.75rem;
}

.metadata-panel dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.3rem 0.75rem;
    font-size: 0.9rem;
}

.metadata-panel dt { font-weight: 600; color: #555; }
.metadata-panel dd { color: #1a1a2e; word-break: break-word; }

/* Score control */
.score-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.score-control input[type="range"] { flex: 1; }
#score-display { font-weight: 600; min-width: 2.5em; text-align: center; }

/* Tag editor */
.tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #e8f0fe;
    color: #1a56db;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.85rem;
}

.tag-chip .remove-tag {
    cursor: pointer;
    font-size: 0.75rem;
    color: #888;
    border: none;
    background: none;
    padding: 0;
    line-height: 1;
}

.tag-chip .remove-tag:hover { color: #d73a49; }

.tag-input-row {
    display: flex;
    gap: 0.4rem;
}

.tag-input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.85rem;
}

.btn {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    background: #1a56db;
    color: #fff;
}

.btn:hover { background: #1548b8; }

.btn-small {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/detail.html web/static/detail.css
git commit -m "feat: add entity detail page HTML/CSS layout

Includes metadata panel, score slider, tag editor, stage report cards,
and markdown body container. Uses DOMPurify for XSS protection."
```

---

### Task 5: Client-Side JavaScript — Markdown Rendering, Tag Editor, Score Slider

**Files:**
- Create: `web/static/detail.js`

This task wires up the detail page with client-side JavaScript. It fetches entity data from the API, renders markdown with marked.js (sanitized via DOMPurify), builds stage report cards using safe DOM methods, and handles management actions.

- [ ] **Step 1: Create detail.js**

```javascript
// web/static/detail.js

// -- Initialization --

var params = new URLSearchParams(window.location.search);
var entityPath = params.get('path');

if (!entityPath) {
    document.getElementById('entity-body').textContent = 'No entity path specified.';
}

var currentTags = [];

// -- API helpers --

function apiFetch(url, options) {
    return fetch(url, options).then(function(res) {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    });
}

// -- Render functions --

function renderMetadata(frontmatter) {
    var dl = document.getElementById('metadata-fields');
    // Clear existing children safely
    while (dl.firstChild) dl.removeChild(dl.firstChild);
    var skipKeys = ['tags']; // tags shown in tag editor
    Object.keys(frontmatter).forEach(function(key) {
        if (skipKeys.indexOf(key) !== -1) return;
        var dt = document.createElement('dt');
        dt.textContent = key;
        var dd = document.createElement('dd');
        dd.textContent = frontmatter[key] || '(empty)';
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
}

function renderBody(bodyMarkdown) {
    // Extract body content before stage reports for the main body section
    var parts = bodyMarkdown.split(/^## Stage Report: /m);
    var bodyContent = parts[0].trim();
    var container = document.getElementById('entity-body');
    // Clear existing children safely
    while (container.firstChild) container.removeChild(container.firstChild);
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined' && bodyContent) {
        // Render markdown then sanitize to prevent XSS
        var rawHtml = marked.parse(bodyContent);
        var cleanHtml = DOMPurify.sanitize(rawHtml);
        // Use a temporary container to convert sanitized HTML string to DOM nodes
        var temp = document.createElement('div');
        temp.innerHTML = cleanHtml;
        while (temp.firstChild) {
            container.appendChild(temp.firstChild);
        }
    } else {
        container.textContent = bodyContent || '(No body content)';
    }
}

function renderStageReports(reports) {
    var container = document.getElementById('stage-reports');
    while (container.firstChild) container.removeChild(container.firstChild);
    if (!reports || reports.length === 0) return;

    reports.forEach(function(report) {
        var card = document.createElement('div');
        card.className = 'stage-report-card';

        var heading = document.createElement('h3');
        heading.textContent = 'Stage Report: ' + report.stage;
        card.appendChild(heading);

        var ul = document.createElement('ul');
        ul.className = 'checklist';
        report.items.forEach(function(item) {
            var li = document.createElement('li');
            li.className = 'checklist-item ' + item.status;

            var icon = document.createElement('span');
            icon.className = 'status-icon';
            if (item.status === 'done') icon.textContent = '\u2713';
            else if (item.status === 'skip') icon.textContent = '\u2014';
            else if (item.status === 'fail') icon.textContent = '\u2717';
            else icon.textContent = '\u25CB';

            var textSpan = document.createElement('span');
            textSpan.className = 'item-text';
            textSpan.textContent = item.text;

            li.appendChild(icon);
            li.appendChild(textSpan);

            if (item.detail) {
                var detail = document.createElement('span');
                detail.className = 'item-detail';
                detail.textContent = item.detail;
                li.appendChild(detail);
            }

            ul.appendChild(li);
        });
        card.appendChild(ul);

        if (report.summary) {
            var summary = document.createElement('div');
            summary.className = 'stage-summary';
            summary.textContent = report.summary;
            card.appendChild(summary);
        }

        container.appendChild(card);
    });
}

function renderTags(tags) {
    currentTags = tags.slice();
    var container = document.getElementById('tag-chips');
    while (container.firstChild) container.removeChild(container.firstChild);
    tags.forEach(function(tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.appendChild(document.createTextNode(tag + ' '));

        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove-tag';
        removeBtn.textContent = '\u00d7';
        removeBtn.setAttribute('data-tag', tag);
        removeBtn.addEventListener('click', function() {
            removeTag(tag);
        });
        chip.appendChild(removeBtn);
        container.appendChild(chip);
    });
}

function initScore(scoreStr) {
    var slider = document.getElementById('score-slider');
    var display = document.getElementById('score-display');
    var val = parseFloat(scoreStr) || 0;
    slider.value = val;
    display.textContent = val.toFixed(2);
    slider.addEventListener('input', function() {
        display.textContent = parseFloat(slider.value).toFixed(2);
    });
}

// -- Management actions --

function saveScore() {
    var score = parseFloat(document.getElementById('score-slider').value);
    apiFetch('/api/entity/score', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: entityPath, score: score})
    }).then(function() {
        loadEntity();
    });
}

function addTag() {
    var input = document.getElementById('tag-input');
    var tag = input.value.trim();
    if (!tag || currentTags.indexOf(tag) !== -1) return;
    currentTags.push(tag);
    input.value = '';
    saveTags();
}

function removeTag(tag) {
    currentTags = currentTags.filter(function(t) { return t !== tag; });
    saveTags();
}

function saveTags() {
    apiFetch('/api/entity/tags', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: entityPath, tags: currentTags})
    }).then(function() {
        renderTags(currentTags);
    });
}

// -- Load entity --

function loadEntity() {
    if (!entityPath) return;
    apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function(data) {
            document.getElementById('entity-title').textContent = data.frontmatter.title || '(untitled)';
            document.title = (data.frontmatter.title || 'Entity') + ' \u2014 Spacedock';
            renderMetadata(data.frontmatter);
            renderBody(data.body);
            renderStageReports(data.stage_reports);
            renderTags(data.tags);
            initScore(data.frontmatter.score || '0');
        });
}

// -- Event listeners --

document.getElementById('score-save').addEventListener('click', saveScore);
document.getElementById('tag-add').addEventListener('click', addTag);
document.getElementById('tag-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addTag();
});

// -- Initial load --

loadEntity();
```

- [ ] **Step 2: Commit**

```bash
git add web/static/detail.js
git commit -m "feat: add client-side JS for entity detail view

Renders markdown with marked.js + DOMPurify sanitization,
builds stage report cards via safe DOM methods,
handles score adjustment and tag editing via API calls."
```

---

### Task 6: Server Integration — Route Registration and Entity Row Click Handler

**Files:**
- Modify: `web/server.py` (feature 001, assumed to exist)
- Modify: `web/index.html` (feature 001, assumed to exist)

**Assumption:** Feature 001 provides a Python HTTP server in `web/server.py` using `http.server.BaseHTTPRequestHandler` (or similar). This task adds API route handling and serves the detail page. If feature 001 uses a different architecture, adapt accordingly.

- [ ] **Step 1: Add API route handling to the server**

Add these routes to the server's request handler in `web/server.py`:

```python
# Add these imports at the top of web/server.py
import json
import sys
import os
import urllib.parse

# Ensure web/ is on the Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import get_entity_detail, update_score, update_tags, filter_entities


# Add these methods to the existing request handler class:

def handle_api_routes(self):
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
```

- [ ] **Step 2: Add entity row click handler to the dashboard**

Add to `web/index.html` (feature 001's entity table):

```javascript
// Add to the existing entity table row rendering logic:
// Each entity row should have a click handler that navigates to the detail view.

// When rendering each <tr> for an entity:
row.style.cursor = 'pointer';
row.addEventListener('click', function() {
    window.location.href = '/detail?path=' + encodeURIComponent(entity.filepath);
});
```

- [ ] **Step 3: Commit**

```bash
git add web/server.py web/index.html
git commit -m "feat: integrate entity detail routes into web server

Adds API endpoints for entity detail, score/tag updates, and filtering.
Dashboard entity rows now link to detail view."
```

---

### Task 7: Filter Controls on Dashboard

**Files:**
- Modify: `web/index.html` (feature 001)

This task adds filter controls (stage dropdown, score range, tag filter) to the entity table on the dashboard.

- [ ] **Step 1: Add filter UI to the dashboard HTML**

Add above the entity table in `web/index.html`:

```html
<div class="filter-bar">
    <label>
        Stage:
        <select id="filter-status">
            <option value="">All</option>
            <!-- Options populated dynamically from discovered stages -->
        </select>
    </label>
    <label>
        Min Score:
        <input type="number" id="filter-min-score" min="0" max="1" step="0.05" value="" placeholder="0.0">
    </label>
    <label>
        Max Score:
        <input type="number" id="filter-max-score" min="0" max="1" step="0.05" value="" placeholder="1.0">
    </label>
    <label>
        Tag:
        <input type="text" id="filter-tag" placeholder="Filter by tag...">
    </label>
    <button id="filter-apply" class="btn">Apply</button>
    <button id="filter-clear" class="btn btn-secondary">Clear</button>
</div>
```

- [ ] **Step 2: Add filter JS to the dashboard**

Add to the dashboard's existing JavaScript:

```javascript
// Filter controls
document.getElementById('filter-apply').addEventListener('click', function() {
    var filterParams = new URLSearchParams();
    var dir = currentWorkflowDir; // from feature 001's workflow discovery
    filterParams.set('dir', dir);

    var status = document.getElementById('filter-status').value;
    if (status) filterParams.set('status', status);

    var minScore = document.getElementById('filter-min-score').value;
    if (minScore) filterParams.set('min_score', minScore);

    var maxScore = document.getElementById('filter-max-score').value;
    if (maxScore) filterParams.set('max_score', maxScore);

    var tag = document.getElementById('filter-tag').value.trim();
    if (tag) filterParams.set('tag', tag);

    fetch('/api/entities?' + filterParams.toString())
        .then(function(res) { return res.json(); })
        .then(function(entities) {
            renderEntityTable(entities); // reuse feature 001's table rendering
        });
});

document.getElementById('filter-clear').addEventListener('click', function() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-min-score').value = '';
    document.getElementById('filter-max-score').value = '';
    document.getElementById('filter-tag').value = '';
    loadEntities(); // reload unfiltered (feature 001's existing function)
});
```

- [ ] **Step 3: Add filter bar CSS**

Add to `web/static/detail.css`:

```css
/* Filter bar — used on dashboard page */
.filter-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: #fff;
    border-radius: 8px;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    flex-wrap: wrap;
}

.filter-bar label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: #555;
}

.filter-bar select, .filter-bar input {
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.85rem;
}

.filter-bar input[type="number"] { width: 5em; }
.filter-bar input[type="text"] { width: 10em; }

.btn-secondary {
    background: #e0e0e0;
    color: #333;
}

.btn-secondary:hover { background: #ccc; }
```

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/static/detail.css
git commit -m "feat: add stage/score/tag filter controls to entity dashboard"
```

---

### Task 8: Quality Gate — Full Test Suite, Lint, Manual Verification

**Files:** (no new files)

- [ ] **Step 1: Run the full test suite**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/test_frontmatter_io.py tests/test_detail_rendering.py tests/test_api.py -v`
Expected: All tests PASS (8 + 4 + 7 = 19 tests)

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui && python3 -m pytest tests/ -v --ignore=tests/fixtures`
Expected: All existing tests still PASS, new tests PASS

- [ ] **Step 3: Verify frontmatter roundtrip with a real fixture file**

Run:
```bash
cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui
python3 -c "
import sys
sys.path.insert(0, 'web')
from frontmatter_io import parse_entity, update_entity_tags, update_entity_score, extract_stage_reports
with open('tests/fixtures/gated-pipeline/gate-test-entity.md') as f:
    text = f.read()
entity = parse_entity(text)
print('Frontmatter:', entity['frontmatter'])
print('Tags:', entity['tags'])
reports = extract_stage_reports(text)
print('Reports:', len(reports))
for r in reports:
    print(f'  Stage: {r[\"stage\"]}, Items: {len(r[\"items\"])}')
# Roundtrip: add tags then re-parse
updated = update_entity_tags(text, ['test-tag', 'roundtrip'])
entity2 = parse_entity(updated)
print('After tag update:', entity2['tags'])
print('Body still has stage report:', '## Stage Report: work' in updated)
"
```
Expected: Tags parsed correctly, stage report found, body preserved after roundtrip

- [ ] **Step 4: Verify Python syntax on all new files**

Run:
```bash
cd /Users/kent/Project/spacedock/.worktrees/ensign-entity-detail-management-ui
python3 -m py_compile web/frontmatter_io.py
python3 -m py_compile web/api.py
echo "All files compile cleanly"
```
Expected: No syntax errors

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git status
# Only commit if there are changes
git diff --cached --stat && git commit -m "fix: address quality gate issues" || echo "No fixes needed"
```
