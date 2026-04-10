#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# ///
# ABOUTME: Verifies references/first-officer-shared-core.md includes pending capture detection step.
# ABOUTME: This is the Phase E additive update that integrates knowledge-capture apply mode.

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FO_SHARED_CORE = REPO_ROOT / "references" / "first-officer-shared-core.md"


def test_fo_shared_core_file_exists():
    assert FO_SHARED_CORE.exists()


def test_fo_shared_core_has_pending_capture_detection():
    content = FO_SHARED_CORE.read_text(encoding="utf-8")
    # Phase E update markers
    assert "Pending Knowledge Captures" in content, (
        "FO shared-core missing pending capture detection step"
    )
    assert "knowledge-capture" in content, (
        "FO shared-core does not reference knowledge-capture skill"
    )
    assert "apply" in content.lower(), (
        "FO shared-core does not invoke knowledge-capture apply mode"
    )


def test_fo_shared_core_preserves_existing_structure():
    """Ensure existing FO shared-core functionality is not accidentally removed."""
    content = FO_SHARED_CORE.read_text(encoding="utf-8")
    # Core sections that must still be present
    assert "## Startup" in content
    assert "## Dispatch" in content
    assert "## Completion and Gates" in content
    assert "## Feedback Rejection Flow" in content
    assert "## Merge and Cleanup" in content
    assert "## Mod Hook Convention" in content
