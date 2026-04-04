"""Frontmatter read/write for the web UI layer.

Follows the same flat key:value parsing as the existing codebase parsers
(skills/commission/bin/status, scripts/codex_prepare_dispatch.py,
scripts/test_lib.py). Tags are stored as comma-separated flat strings
in frontmatter — NOT YAML list syntax.
"""
import re


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
