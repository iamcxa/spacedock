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
