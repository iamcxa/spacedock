#!/usr/bin/env -S uv run --with pytest python
# /// script
# requires-python = ">=3.10"
# ///
# ABOUTME: E2E spike test for Codex multi-agent rejection handling on the rejection-flow fixture.
# ABOUTME: Verifies that validation can reject implementation and trigger observable follow-up work.

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from test_lib import (
    CodexLogParser,
    TestRunner,
    create_test_project,
    git_add_commit,
    rejection_follow_up_observed,
    rejection_signal_present,
    run_codex_first_officer,
    setup_fixture,
)


def main():
    t = TestRunner("Codex Rejection Flow E2E Test")

    print("--- Phase 1: Set up test project from fixture ---")

    create_test_project(t)
    setup_fixture(t, "rejection-flow", "rejection-pipeline")

    git_add_commit(t.test_project_dir, "setup: codex rejection flow fixture")

    t.check_cmd(
        "status script runs without errors",
        ["python3", "rejection-pipeline/status"],
        cwd=t.test_project_dir,
    )

    status_result = subprocess.run(
        ["python3", "rejection-pipeline/status", "--next"],
        capture_output=True,
        text=True,
        cwd=t.test_project_dir,
        check=True,
    )
    t.check("status --next detects dispatchable entity", "buggy-add-task" in status_result.stdout)

    print()
    print("--- Phase 2: Run Codex first officer ---")

    fo_exit = run_codex_first_officer(
        t,
        "rejection-pipeline",
        run_goal=(
            "Process only the entity `buggy-add-task`. "
            "Drive the workflow until validation finishes and you can report the rejection verdict "
            "and the follow-up target. Then stop immediately. "
            "Do not start a second repair cycle after reporting that first rejection outcome. "
            "When you dispatch workers, use the exact Codex pattern "
            "`spawn_agent(agent_type=\"worker\", fork_context=false, message=<fully self-contained prompt>)` "
            "followed by `wait_agent(...)`."
        ),
        timeout_s=240,
    )
    t.check("Codex launcher exited cleanly", fo_exit == 0)

    print()
    print("--- Phase 3: Validate ---")

    log = CodexLogParser(t.log_dir / "codex-fo-log.txt")
    fo_text = log.full_text()
    worker_messages = "\n".join(log.completed_agent_messages())

    entity_main = t.test_project_dir / "rejection-pipeline" / "buggy-add-task.md"
    worktrees_dir = t.test_project_dir / ".spacedock" / "worktrees"

    t.check(
        "validation surfaced a rejection signal",
        rejection_signal_present("rejection-pipeline", "buggy-add-task", entity_main, worktrees_dir, worker_messages, fo_text),
    )
    t.check("at least one worker completed", bool(worker_messages.strip()))

    spawn_count = log.spawn_count()
    t.check(
        "multiple worker dispatches occurred",
        spawn_count >= 2 or bool(re.search(r"validation|implementation", worker_messages, re.IGNORECASE)),
    )

    t.check(
        "follow-up work after rejection was observable",
        rejection_follow_up_observed("rejection-pipeline", "buggy-add-task", worktrees_dir, worker_messages, fo_text),
    )

    main_entity_text = entity_main.read_text() if entity_main.is_file() else ""
    worktree_match = re.search(r"^worktree:\s*(.+)$", main_entity_text, re.MULTILINE)
    worktree_value = worktree_match.group(1).strip() if worktree_match else ""
    t.check("packaged worker uses safe worktree key", "spacedock-ensign" in worktree_value)
    t.check("logical packaged id does not leak into worktree path", "spacedock:ensign" not in worktree_value)

    t.results()


if __name__ == "__main__":
    main()
