#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# ///
# ABOUTME: Unit test for the stats extraction and LogParser in test_lib.
# ABOUTME: Validates python3 parser against a known log sample.

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from test_lib import LogParser, extract_stats

# --- Known log sample ---
# Simulates a minimal stream-json log with 2 assistant messages and 1 tool_result.

SAMPLE_LOG = [
    {
        "type": "assistant",
        "timestamp": "2026-03-28T10:00:00Z",
        "message": {
            "model": "claude-sonnet-4-6",
            "content": [
                {"type": "text", "text": "I will process the task."},
                {
                    "type": "tool_use",
                    "name": "Agent",
                    "input": {
                        "subagent_type": "ensign",
                        "name": "task-impl",
                        "prompt": "Implement the feature as described.",
                    },
                },
            ],
            "usage": {
                "input_tokens": 1000,
                "output_tokens": 200,
                "cache_read_input_tokens": 500,
                "cache_creation_input_tokens": 300,
            },
        },
    },
    {
        "type": "tool_result",
        "timestamp": "2026-03-28T10:00:30Z",
    },
    {
        "type": "assistant",
        "timestamp": "2026-03-28T10:01:00Z",
        "message": {
            "model": "claude-sonnet-4-6",
            "content": [
                {"type": "text", "text": "Task completed. All items DONE."},
                {
                    "type": "tool_use",
                    "name": "Bash",
                    "input": {"command": "git status"},
                },
            ],
            "usage": {
                "input_tokens": 2000,
                "output_tokens": 400,
                "cache_read_input_tokens": 1000,
                "cache_creation_input_tokens": 0,
            },
        },
    },
]

PASSES = 0
FAILURES = 0


def check(label: str, condition: bool):
    global PASSES, FAILURES
    if condition:
        PASSES += 1
        print(f"  PASS: {label}")
    else:
        FAILURES += 1
        print(f"  FAIL: {label}")


def main():
    global PASSES, FAILURES

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        log_path = tmpdir / "test-log.jsonl"

        # Write sample log
        with open(log_path, "w") as f:
            for entry in SAMPLE_LOG:
                f.write(json.dumps(entry) + "\n")

        # --- Test LogParser ---

        print("=== LogParser Tests ===")

        parser = LogParser(log_path)

        # Test assistant_messages
        msgs = parser.assistant_messages()
        check("assistant_messages returns 2 messages", len(msgs) == 2)

        # Test agent_calls
        calls = parser.agent_calls()
        check("agent_calls returns 1 call", len(calls) == 1)
        check("agent_call has correct subagent_type", calls[0]["subagent_type"] == "ensign")
        check("agent_call has correct name", calls[0]["name"] == "task-impl")
        check("agent_call has correct prompt", calls[0]["prompt"] == "Implement the feature as described.")

        # Test fo_texts
        texts = parser.fo_texts()
        check("fo_texts returns 2 texts", len(texts) == 2)
        check("fo_texts first text correct", texts[0] == "I will process the task.")
        check("fo_texts second text correct", texts[1] == "Task completed. All items DONE.")

        # Test tool_calls
        all_tools = parser.tool_calls()
        check("tool_calls returns 2 calls (Agent + Bash)", len(all_tools) == 2)
        check("tool_calls first is Agent", all_tools[0]["name"] == "Agent")
        check("tool_calls second is Bash", all_tools[1]["name"] == "Bash")

        # Test agent_prompt
        prompt = parser.agent_prompt()
        check("agent_prompt returns the prompt", prompt == "Implement the feature as described.")

        # Test write methods
        parser.write_agent_calls(tmpdir / "agent-calls.txt")
        check("write_agent_calls creates file", (tmpdir / "agent-calls.txt").is_file())
        agent_calls_text = (tmpdir / "agent-calls.txt").read_text()
        check("write_agent_calls contains subagent_type", "subagent_type=ensign" in agent_calls_text)

        parser.write_fo_texts(tmpdir / "fo-texts.txt")
        check("write_fo_texts creates file", (tmpdir / "fo-texts.txt").is_file())

        parser.write_tool_calls(tmpdir / "tool-calls.json")
        check("write_tool_calls creates valid JSON", bool(json.loads((tmpdir / "tool-calls.json").read_text())))

        parser.write_agent_prompt(tmpdir / "agent-prompt.txt")
        check("write_agent_prompt creates file", (tmpdir / "agent-prompt.txt").read_text() == "Implement the feature as described.")

        # --- Test extract_stats ---

        print()
        print("=== StatsExtractor Tests ===")

        stats = extract_stats(log_path, "test-phase", tmpdir)

        check("wallclock is 60s", stats["wallclock_s"] == 60)
        check("assistant_count is 2", stats["assistant_count"] == 2)
        check("tool_result_count is 1", stats["tool_result_count"] == 1)
        check("model_counts has sonnet", "claude-sonnet-4-6" in stats["model_counts"])
        check("model_counts sonnet count is 2", stats["model_counts"].get("claude-sonnet-4-6") == 2)
        check("input_tokens is 3000", stats["input_tokens"] == 3000)
        check("output_tokens is 600", stats["output_tokens"] == 600)
        check("cache_read is 1500", stats["cache_read"] == 1500)
        check("cache_write is 300", stats["cache_write"] == 300)

        # Verify stats file was written
        stats_file = tmpdir / "stats-test-phase.txt"
        check("stats file created", stats_file.is_file())
        stats_content = stats_file.read_text()
        check("stats file contains Wallclock", "Wallclock:" in stats_content)
        check("stats file contains Messages", "Messages:" in stats_content)
        check("stats file contains Model delegation", "Model delegation:" in stats_content)
        check("stats file contains Input tokens", "Input tokens:" in stats_content)

        # --- Test with empty log ---

        print()
        print("=== Edge Cases ===")

        empty_log = tmpdir / "empty.jsonl"
        empty_log.write_text("")

        empty_parser = LogParser(empty_log)
        check("empty log: no assistant messages", len(empty_parser.assistant_messages()) == 0)
        check("empty log: no agent calls", len(empty_parser.agent_calls()) == 0)
        check("empty log: no fo texts", len(empty_parser.fo_texts()) == 0)
        check("empty log: empty agent prompt", empty_parser.agent_prompt() == "")

        empty_stats = extract_stats(empty_log, "empty", tmpdir)
        check("empty log: wallclock is None", empty_stats["wallclock_s"] is None)
        check("empty log: assistant_count is 0", empty_stats["assistant_count"] == 0)

    # --- Results ---
    print()
    print("=== Results ===")
    total = PASSES + FAILURES
    print(f"  {PASSES} passed, {FAILURES} failed (out of {total} checks)")
    print()

    if FAILURES > 0:
        print("RESULT: FAIL")
        sys.exit(1)
    else:
        print("RESULT: PASS")
        sys.exit(0)


if __name__ == "__main__":
    main()
