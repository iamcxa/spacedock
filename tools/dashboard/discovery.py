"""Workflow discovery -- finds Spacedock workflows by scanning for commissioned-by frontmatter.

Algorithm follows references/first-officer-shared-core.md:
- Recursively search for README.md files
- Check YAML frontmatter for 'commissioned-by: spacedock@...'
- Ignore .git, .worktrees, node_modules, vendor, dist, build, __pycache__
"""

import os

from tools.dashboard.parsing import parse_frontmatter, parse_stages_block, scan_entities

IGNORED_DIRS = {'.git', '.worktrees', 'node_modules', 'vendor', 'dist', 'build', '__pycache__', 'tests'}


def discover_workflows(root):
    """Recursively discover Spacedock workflow directories under root.

    Returns a list of dicts with 'dir' and 'commissioned_by' keys for each
    discovered workflow.
    """
    workflows = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]

        if 'README.md' not in filenames:
            continue

        readme_path = os.path.join(dirpath, 'README.md')
        fields = parse_frontmatter(readme_path)
        commissioned_by = fields.get('commissioned-by', '')

        if commissioned_by.startswith('spacedock@'):
            workflows.append({
                'dir': dirpath,
                'commissioned_by': commissioned_by,
            })

    return workflows


def aggregate_workflow(workflow_dir):
    """Aggregate workflow data: stages, entities, and per-stage counts.

    Returns None if the directory has no README.md.
    """
    readme_path = os.path.join(workflow_dir, 'README.md')
    if not os.path.exists(readme_path):
        return None

    fields = parse_frontmatter(readme_path)
    stages = parse_stages_block(readme_path) or []
    entities = scan_entities(workflow_dir)

    entity_count_by_stage = {}
    for e in entities:
        status = e.get('status', '')
        if status:
            entity_count_by_stage[status] = entity_count_by_stage.get(status, 0) + 1

    return {
        'dir': workflow_dir,
        'name': os.path.basename(workflow_dir),
        'commissioned_by': fields.get('commissioned-by', ''),
        'entity_type': fields.get('entity-type', ''),
        'entity_label': fields.get('entity-label', fields.get('entity-type', 'entity')),
        'stages': stages,
        'entities': entities,
        'entity_count_by_stage': entity_count_by_stage,
    }
