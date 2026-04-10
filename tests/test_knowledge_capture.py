#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
# ABOUTME: Structural and behavior tests for skills/knowledge-capture/SKILL.md.
# ABOUTME: Validates two-mode structure (capture / apply) and classifier/gate references.

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = REPO_ROOT / "skills" / "knowledge-capture"
SKILL_FILE = SKILL_DIR / "SKILL.md"


def parse_frontmatter(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        raise ValueError(f"No frontmatter in {path}")
    return yaml.safe_load(match.group(1))


def test_skill_file_exists():
    assert SKILL_FILE.exists(), f"Expected {SKILL_FILE}"


def test_frontmatter_name_is_knowledge_capture():
    fm = parse_frontmatter(SKILL_FILE)
    assert fm.get("name") == "knowledge-capture"


def test_frontmatter_description_mentions_both_modes():
    fm = parse_frontmatter(SKILL_FILE)
    desc = fm.get("description", "").lower()
    assert "capture" in desc and "apply" in desc


def test_skill_content_mentions_D1_and_D2():
    content = SKILL_FILE.read_text(encoding="utf-8")
    assert "D1" in content
    assert "D2" in content
