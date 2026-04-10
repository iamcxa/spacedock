#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
# ABOUTME: Structural and behavior tests for skills/workflow-index/SKILL.md.
# ABOUTME: Validates frontmatter, reference files, and mode dispatch.

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = REPO_ROOT / "skills" / "workflow-index"
SKILL_FILE = SKILL_DIR / "SKILL.md"


def parse_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter from a markdown file."""
    content = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        raise ValueError(f"No frontmatter in {path}")
    return yaml.safe_load(match.group(1))


def test_skill_file_exists():
    assert SKILL_FILE.exists(), f"Expected {SKILL_FILE} to exist"


def test_skill_frontmatter_has_name():
    fm = parse_frontmatter(SKILL_FILE)
    assert fm.get("name") == "workflow-index", (
        f"Expected name='workflow-index', got {fm.get('name')!r}"
    )


def test_skill_frontmatter_has_description():
    fm = parse_frontmatter(SKILL_FILE)
    desc = fm.get("description", "")
    assert desc and len(desc) > 20, (
        "Expected description with at least 20 characters"
    )


def test_skill_content_mentions_all_three_modes():
    content = SKILL_FILE.read_text(encoding="utf-8")
    for mode in ["read", "write", "check"]:
        assert mode in content.lower(), f"Expected mode '{mode}' mentioned in SKILL.md"


def test_contracts_format_reference_exists():
    ref = SKILL_DIR / "references" / "contracts-format.md"
    assert ref.exists(), f"Expected {ref} to exist"


def test_contracts_format_defines_section_structure():
    ref = SKILL_DIR / "references" / "contracts-format.md"
    content = ref.read_text(encoding="utf-8")
    # Contract format must explain the per-file section structure
    assert "Active Contracts" in content
    assert "Entity" in content
    assert "Status" in content


def test_decisions_format_reference_exists():
    ref = SKILL_DIR / "references" / "decisions-format.md"
    assert ref.exists(), f"Expected {ref} to exist"


def test_decisions_format_describes_supersede_mechanism():
    ref = SKILL_DIR / "references" / "decisions-format.md"
    content = ref.read_text(encoding="utf-8")
    assert "Supersedes" in content
    assert "append-only" in content.lower()
    assert "D-" in content  # decision ID format marker


def test_read_mode_reference_exists():
    ref = SKILL_DIR / "references" / "read-mode.md"
    assert ref.exists()


def test_read_mode_documents_query_by_file_and_entity():
    ref = SKILL_DIR / "references" / "read-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "query" in content.lower()
    assert "file" in content.lower()
    assert "entity" in content.lower()


def test_write_mode_reference_exists():
    ref = SKILL_DIR / "references" / "write-mode.md"
    assert ref.exists()


def test_write_mode_documents_append_semantics():
    ref = SKILL_DIR / "references" / "write-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "append" in content.lower()
    assert "supersede" in content.lower() or "Supersedes" in content
    assert "commit" in content.lower()


def test_check_mode_reference_exists():
    ref = SKILL_DIR / "references" / "check-mode.md"
    assert ref.exists()


def test_check_mode_documents_in_flight_and_warning_gates():
    ref = SKILL_DIR / "references" / "check-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "in-flight" in content.lower()
    assert "blocker" in content.lower()
    assert "warning" in content.lower()
    # Must reference Dimension 7 from plan-checker
    assert "Dim" in content or "dimension 7" in content.lower() or "Dimension 7" in content


FIXTURE_DIR = REPO_ROOT / "tests" / "fixtures" / "workflow-index-fixture"


def test_workflow_index_fixture_directory_exists():
    assert FIXTURE_DIR.exists() and FIXTURE_DIR.is_dir()


def test_workflow_index_fixture_has_seed_artifacts():
    for name in ["CONTRACTS.md", "DECISIONS.md", "INDEX.md"]:
        assert (FIXTURE_DIR / "_index" / name).exists(), f"Missing {name}"


def test_workflow_index_fixture_has_entities():
    assert (FIXTURE_DIR / "entity-a.md").exists()
    assert (FIXTURE_DIR / "entity-b.md").exists()
