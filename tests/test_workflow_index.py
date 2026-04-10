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
