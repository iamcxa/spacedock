"""API functions for entity detail and management.

These functions are called by the web server's request handler.
They read/write entity markdown files and return structured data
that the server serializes to JSON responses.
"""
import glob
import os

from .frontmatter_io import (
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
