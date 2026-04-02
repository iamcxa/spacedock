# ABOUTME: Static regression tests for plugin-shipped status and mods.
# ABOUTME: Verifies commission/refit/first-officer text no longer assumes workflow-local runtime assets.

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent


def test_first_officer_uses_plugin_shipped_status_and_mods():
    text = (REPO_ROOT / "agents" / "first-officer.md").read_text()

    assert "{workflow_dir}/status" not in text
    assert "{workflow_dir}/_mods/" not in text
    assert "{spacedock_plugin_dir}/skills/commission/bin/status" in text
    assert "--workflow-dir \"{workflow_dir}\"" in text
    assert "{spacedock_plugin_dir}/mods/*.md" in text
    assert "default to `spacedock:ensign`" in text


def test_plugin_agents_exist_and_templates_are_removed():
    assert (REPO_ROOT / "agents" / "first-officer.md").is_file()
    assert (REPO_ROOT / "agents" / "ensign.md").is_file()
    assert not (REPO_ROOT / "templates" / "first-officer.md").exists()
    assert not (REPO_ROOT / "templates" / "ensign.md").exists()


def test_commission_stops_generating_status_and_mod_copies():
    text = (REPO_ROOT / "skills" / "commission" / "SKILL.md").read_text()

    assert "### 2b. Generate `{dir}/status`" not in text
    assert "{dir}/status" not in text
    assert "{dir}/_mods/pr-merge.md" not in text
    assert "plugin-shipped status viewer" in text
    assert "plugin-shipped PR merge mod" in text
    assert ".claude/agents/first-officer.md" not in text
    assert ".claude/agents/ensign.md" not in text
    assert "claude --agent spacedock:first-officer" in text


def test_refit_stops_managing_workflow_local_status_and_mods():
    text = (REPO_ROOT / "skills" / "refit" / "SKILL.md").read_text()

    assert "Read `{dir}/status`" not in text
    assert "{dir}/_mods/*.md" not in text
    assert "plugin-shipped runtime assets" in text
    assert ".claude/agents/first-officer.md" not in text
    assert ".claude/agents/ensign.md" not in text
