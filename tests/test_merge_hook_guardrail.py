#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# ///
# ABOUTME: E2E test for the merge hook guardrail in the first-officer template.
# ABOUTME: Verifies merge hooks fire before local merge, and that no-mods fallback works.

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from test_lib import (
    TestRunner, LogParser, create_test_project, setup_fixture,
    check_merge_outcome, install_agents, run_codex_first_officer, run_first_officer, git_add_commit,
)


def parse_args() -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(description="Merge hook guardrail E2E test")
    parser.add_argument("--runtime", choices=["claude", "codex"], default="claude")
    parser.add_argument("--agent", default="spacedock:first-officer")
    parser.add_argument("--model", default="haiku", help="Model to use (default: haiku)")
    parser.add_argument("--effort", default="low", help="Effort level (default: low)")
    return parser.parse_known_args()


def run_merge_case(
    t: TestRunner,
    runtime: str,
    agent_id: str,
    workflow_dir: str,
    run_goal: str,
    claude_extra_args: list[str],
    codex_timeout_s: int,
    log_name: str,
) -> int:
    if runtime == "claude":
        abs_workflow = t.test_project_dir / workflow_dir
        return run_first_officer(
            t,
            f"Process all tasks through the workflow at {abs_workflow}/ to completion.",
            agent_id=agent_id,
            extra_args=claude_extra_args,
            log_name=log_name,
        )
    return run_codex_first_officer(
        t,
        workflow_dir,
        agent_id=agent_id,
        run_goal=run_goal,
        timeout_s=codex_timeout_s,
        log_name=log_name.replace(".jsonl", ".txt"),
    )


def main():
    args, extra_args = parse_args()
    t = TestRunner(f"Merge Hook Guardrail E2E Test ({args.runtime})")

    # --- Phase 1: Set up test project with merge hook mod ---

    print("--- Phase 1: Set up test project with merge hook mod ---")

    create_test_project(t)
    fixture_dir = t.repo_root / "tests" / "fixtures" / "merge-hook-pipeline"

    # Copy workflow fixture (including _mods/)
    setup_fixture(t, "merge-hook-pipeline", "merge-hook-pipeline")
    if args.runtime == "claude":
        install_agents(t)

    git_add_commit(t.test_project_dir, "setup: merge hook guardrail test fixture")

    t.check_cmd("status script runs without errors",
                ["bash", "merge-hook-pipeline/status"], cwd=t.test_project_dir)

    print()

    # --- Phase 2: Run first officer (with hook mod) ---

    print("--- Phase 2: Run first officer with hook mod (this takes ~60-120s) ---")

    # Save the original test_project_dir and log for the with-hook run
    with_hook_project = t.test_project_dir
    fo_exit = run_merge_case(
        t,
        args.runtime,
        args.agent,
        "merge-hook-pipeline",
        (
            "Process only the entity `merge-hook-entity` through the workflow to terminal completion. "
            "If it reaches the terminal stage, run any merge hooks before local merge, then archive the entity. "
            "Stop after the merge hook result and archive outcome are determined."
        ),
        ["--model", args.model, "--effort", args.effort, "--max-budget-usd", "2.00", *extra_args],
        240,
        "fo-log.jsonl",
    )
    if args.runtime == "codex":
        t.check("Codex launcher exited cleanly (with hook)", fo_exit == 0)

    # --- Phase 3: Validate hook fired ---

    print("--- Phase 3: Validate merge hook execution ---")
    print()
    print("[Merge Hook Execution]")

    check_merge_outcome(
        t,
        with_hook_project,
        "merge-hook-pipeline",
        "merge-hook-entity",
        "spacedock-ensign-merge-hook-entity-work",
        hook_expected=True,
        archive_required=False,
    )

    print()

    # --- Phase 4: Set up and run no-mods fallback test ---

    print("--- Phase 4: Set up no-mods fallback test ---")

    # Create a new test project for the no-mods run
    nomods_project = t.test_dir / "test-no-mods"
    subprocess.run(["git", "init", str(nomods_project)], capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "--allow-empty", "-m", "init"],
        capture_output=True, check=True, cwd=nomods_project,
    )

    # Copy workflow fixture WITHOUT _mods
    nomods_pipeline = nomods_project / "merge-hook-pipeline"
    nomods_pipeline.mkdir(parents=True)
    for item in fixture_dir.iterdir():
        if item.is_dir():
            continue  # Skip _mods/ and any other subdirectories
        shutil.copy2(item, nomods_pipeline / item.name)
    status_script = nomods_pipeline / "status"
    if status_script.exists():
        status_script.chmod(status_script.stat().st_mode | 0o111)

    # Install agents via shared helper (temporarily point runner at nomods project)
    orig_project = t.test_project_dir
    t.test_project_dir = nomods_project
    if args.runtime == "claude":
        install_agents(t)
    t.test_project_dir = orig_project

    subprocess.run(["git", "add", "-A"], capture_output=True, check=True, cwd=nomods_project)
    subprocess.run(
        ["git", "commit", "-m", "setup: no-mods fallback test fixture"],
        capture_output=True, check=True, cwd=nomods_project,
    )

    print()
    print("[Fixture Setup — No Mods]")

    t.check_cmd("status script runs without errors (no-mods)",
                ["bash", "merge-hook-pipeline/status"], cwd=nomods_project)

    print()
    print("--- Phase 5: Run first officer without mods (this takes ~60-120s) ---")

    # Point runner at the no-mods project for this run
    t.test_project_dir = nomods_project
    nomods_log = "fo-nomods-log.jsonl"
    fo_exit = run_merge_case(
        t,
        args.runtime,
        args.agent,
        "merge-hook-pipeline",
        (
            "Process only the entity `merge-hook-entity` through the workflow to terminal completion. "
            "No merge hook mod is installed in this fixture, so use the default local merge path and archive the entity. "
            "Stop after the archive outcome is determined."
        ),
        ["--model", args.model, "--effort", args.effort, "--max-budget-usd", "2.00", *extra_args],
        240,
        nomods_log,
    )
    if args.runtime == "codex":
        t.check("Codex launcher exited cleanly (no hook)", fo_exit == 0)

    # --- Phase 6: Validate no-mods fallback ---

    print("--- Phase 6: Validate no-mods fallback ---")
    print()
    print("[No-Mods Fallback]")

    check_merge_outcome(
        t,
        nomods_project,
        "merge-hook-pipeline",
        "merge-hook-entity",
        "spacedock-ensign-merge-hook-entity-work",
        hook_expected=False,
        archive_required=False,
    )

    # --- Results ---
    t.results()


if __name__ == "__main__":
    main()
