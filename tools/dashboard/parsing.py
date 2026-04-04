"""Parsing functions for Spacedock YAML frontmatter and entity scanning.

Copied from skills/commission/bin/status (which has no .py extension and
cannot be imported). Keep in sync manually if the source changes.
"""

import glob
import os


def parse_frontmatter(filepath):
    """Extract YAML frontmatter fields from a markdown file."""
    fields = {}
    in_fm = False
    with open(filepath, 'r') as f:
        for line in f:
            line = line.rstrip('\n')
            if line == '---':
                if in_fm:
                    break
                in_fm = True
                continue
            if in_fm:
                if ':' in line:
                    key, _, val = line.partition(':')
                    key = key.strip()
                    val = val.strip()
                    if not line[0].isspace():
                        fields[key] = val
    return fields


def parse_stages_block(filepath):
    """Parse the stages block from README frontmatter."""
    lines = []
    in_fm = False
    with open(filepath, 'r') as f:
        for line in f:
            line = line.rstrip('\n')
            if line == '---':
                if in_fm:
                    break
                in_fm = True
                continue
            if in_fm:
                lines.append(line)

    stages_start = None
    for i, line in enumerate(lines):
        if line.rstrip() == 'stages:':
            stages_start = i
            break

    if stages_start is None:
        return None

    defaults = {}
    states = []
    i = stages_start + 1
    stages_indent = None
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()
        if not stripped:
            i += 1
            continue
        indent = len(line) - len(stripped)
        if stages_indent is None:
            stages_indent = indent
        elif indent < stages_indent:
            break

        if indent == stages_indent:
            if stripped == 'defaults:':
                i += 1
                while i < len(lines):
                    dline = lines[i]
                    dstripped = dline.lstrip()
                    if not dstripped:
                        i += 1
                        continue
                    dindent = len(dline) - len(dstripped)
                    if dindent <= stages_indent:
                        break
                    if ':' in dstripped:
                        k, _, v = dstripped.partition(':')
                        defaults[k.strip()] = v.strip()
                    i += 1
                continue
            elif stripped == 'states:':
                i += 1
                current_state = None
                while i < len(lines):
                    sline = lines[i]
                    sstripped = sline.lstrip()
                    if not sstripped:
                        i += 1
                        continue
                    sindent = len(sline) - len(sstripped)
                    if sindent <= stages_indent:
                        break
                    if sstripped.startswith('- name:'):
                        _, _, name = sstripped.partition('- name:')
                        current_state = {'name': name.strip()}
                        states.append(current_state)
                    elif current_state is not None and ':' in sstripped and not sstripped.startswith('- '):
                        k, _, v = sstripped.partition(':')
                        current_state[k.strip()] = v.strip()
                    i += 1
                continue
        i += 1

    if not states:
        return None

    default_worktree = defaults.get('worktree', 'false').lower() == 'true'
    default_concurrency = int(defaults.get('concurrency', '2'))

    result = []
    for state in states:
        stage = {
            'name': state['name'],
            'worktree': state.get('worktree', str(default_worktree)).lower() == 'true',
            'concurrency': int(state.get('concurrency', str(default_concurrency))),
            'gate': state.get('gate', 'false').lower() == 'true',
            'terminal': state.get('terminal', 'false').lower() == 'true',
            'initial': state.get('initial', 'false').lower() == 'true',
        }
        result.append(stage)

    return result


def scan_entities(directory):
    """Scan a directory for .md entity files (excluding README.md)."""
    entities = []
    pattern = os.path.join(directory, '*.md')
    for filepath in sorted(glob.glob(pattern)):
        if os.path.basename(filepath) == 'README.md':
            continue
        slug = os.path.splitext(os.path.basename(filepath))[0]
        fields = parse_frontmatter(filepath)
        entity = {k: v for k, v in fields.items()}
        entity['slug'] = slug
        for key in ('id', 'status', 'title', 'score', 'source', 'worktree'):
            entity.setdefault(key, '')
        entities.append(entity)
    return entities
