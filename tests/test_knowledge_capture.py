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


def test_classifier_reference_exists():
    ref = SKILL_DIR / "references" / "classifier.md"
    assert ref.exists()


def test_classifier_defines_all_severity_levels():
    ref = SKILL_DIR / "references" / "classifier.md"
    content = ref.read_text(encoding="utf-8")
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NIT"]:
        assert level in content, f"Expected severity {level} in classifier.md"


def test_classifier_defines_all_root_types():
    ref = SKILL_DIR / "references" / "classifier.md"
    content = ref.read_text(encoding="utf-8")
    for root in ["CODE", "DOC", "NEW", "PLAN"]:
        assert root in content, f"Expected root {root} in classifier.md"


def test_gates_reference_exists():
    ref = SKILL_DIR / "references" / "gates.md"
    assert ref.exists()


def test_gates_contains_three_question_test():
    ref = SKILL_DIR / "references" / "gates.md"
    content = ref.read_text(encoding="utf-8")
    for q in ["Recurs", "Non-obvious", "Ruleable"]:
        assert q in content, f"Expected '{q}' in gates.md"


def test_gates_contains_severity_table():
    ref = SKILL_DIR / "references" / "gates.md"
    content = ref.read_text(encoding="utf-8")
    assert "CRITICAL" in content
    assert "candidate" in content.lower()


def test_targets_reference_exists():
    ref = SKILL_DIR / "references" / "targets.md"
    assert ref.exists()


def test_targets_defines_all_levels():
    ref = SKILL_DIR / "references" / "targets.md"
    content = ref.read_text(encoding="utf-8")
    for level in ["plugin", "user-global", "project", "module", "lessons", "DECISIONS"]:
        assert level in content, f"Expected level '{level}' in targets.md"


def test_capture_mode_reference_exists():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    assert ref.exists()


def test_capture_mode_forbids_askuserquestion():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    content = ref.read_text(encoding="utf-8")
    # Must explicitly state no AskUserQuestion
    assert "AskUserQuestion" in content
    assert "not" in content.lower() or "never" in content.lower()


def test_capture_mode_describes_pending_captures_section():
    ref = SKILL_DIR / "references" / "capture-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "Pending Knowledge Captures" in content


def test_apply_mode_reference_exists():
    ref = SKILL_DIR / "references" / "apply-mode.md"
    assert ref.exists()


def test_apply_mode_documents_askuserquestion_usage():
    ref = SKILL_DIR / "references" / "apply-mode.md"
    content = ref.read_text(encoding="utf-8")
    assert "AskUserQuestion" in content
    # Must document that FO is the ONLY caller
    assert "First Officer" in content or "FO" in content
    # Must document separate commit requirement
    assert "commit" in content.lower() and "separate" in content.lower()


FIXTURES_DIR = SKILL_DIR / "fixtures"


def test_fixtures_directory_exists():
    assert FIXTURES_DIR.exists() and FIXTURES_DIR.is_dir()


def test_sample_finding_fixture_parses():
    sample = FIXTURES_DIR / "sample-finding.yaml"
    assert sample.exists()
    data = yaml.safe_load(sample.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "findings" in data
    assert len(data["findings"]) >= 2


def test_captain_responses_fixture_parses():
    resp = FIXTURES_DIR / "captain-responses.yaml"
    assert resp.exists()
    data = yaml.safe_load(resp.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "responses" in data


def test_entity_with_pending_fixture_has_pending_section():
    entity = FIXTURES_DIR / "entity-with-pending.md"
    assert entity.exists()
    content = entity.read_text(encoding="utf-8")
    assert "## Pending Knowledge Captures" in content
    assert "<capture" in content
