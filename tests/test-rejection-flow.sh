# ABOUTME: E2E test for the validation rejection flow in the first-officer template.
# ABOUTME: Verifies that a REJECTED validation triggers implementer dispatch via the relay protocol.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE_DIR="$REPO_ROOT/tests/fixtures/rejection-flow"
TEST_DIR="$(mktemp -d)"
FAILURES=0
PASSES=0

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

pass() {
  PASSES=$((PASSES + 1))
  echo "  PASS: $1"
}

fail() {
  FAILURES=$((FAILURES + 1))
  echo "  FAIL: $1"
}

echo "=== Rejection Flow E2E Test ==="
echo "Repo root:    $REPO_ROOT"
echo "Fixture dir:  $FIXTURE_DIR"
echo "Test dir:     $TEST_DIR"
echo ""

# --- Phase 1: Set up test project from static fixture ---

echo "--- Phase 1: Set up test project from fixture ---"

cd "$TEST_DIR"
git init test-project >/dev/null 2>&1
cd "$TEST_DIR/test-project"
git commit --allow-empty -m "init" >/dev/null 2>&1

# Copy workflow fixture
mkdir -p rejection-pipeline
cp "$FIXTURE_DIR/README.md" rejection-pipeline/
cp "$FIXTURE_DIR/buggy-add-task.md" rejection-pipeline/
cp "$FIXTURE_DIR/status" rejection-pipeline/
chmod +x rejection-pipeline/status

# Copy the buggy implementation and tests into the repo root
# (the validator will find these via the worktree)
cp "$FIXTURE_DIR/math_ops.py" .
mkdir -p tests
cp "$FIXTURE_DIR/tests/test_add.py" tests/

# Generate first-officer agent from template
mkdir -p .claude/agents
sed \
  -e 's|__MISSION__|Rejection flow test|g' \
  -e 's|__DIR__|rejection-pipeline|g' \
  -e 's|__DIR_BASENAME__|rejection-pipeline|g' \
  -e 's|__PROJECT_NAME__|rejection-test|g' \
  -e 's|__ENTITY_LABEL__|task|g' \
  -e 's|__ENTITY_LABEL_PLURAL__|tasks|g' \
  -e 's|__CAPTAIN__|CL|g' \
  -e 's|__FIRST_STAGE__|backlog|g' \
  -e 's|__LAST_STAGE__|done|g' \
  -e 's|__SPACEDOCK_VERSION__|test|g' \
  "$REPO_ROOT/templates/first-officer.md" > .claude/agents/first-officer.md

# Copy static agent templates (no template variables to substitute)
cp "$REPO_ROOT/templates/ensign.md" .claude/agents/ensign.md
cp "$REPO_ROOT/templates/validator.md" .claude/agents/validator.md

git add -A && git commit -m "setup: rejection flow fixture with buggy implementation" >/dev/null 2>&1

echo ""
echo "[Fixture Setup]"

# Verify the generated first-officer has the validation rejection flow
if grep -q "Validation Rejection Flow" .claude/agents/first-officer.md; then
  pass "generated first-officer contains validation rejection flow"
else
  fail "generated first-officer contains validation rejection flow"
  echo "  FATAL: Rejection flow section missing from generated agent. Aborting."
  trap - EXIT
  exit 1
fi

# Verify the FO resolves fresh:true to validator
if grep -qE "default to.*validator.*when.*fresh.*true" .claude/agents/first-officer.md; then
  pass "generated first-officer resolves fresh:true to validator"
else
  fail "generated first-officer resolves fresh:true to validator"
fi

# Verify status script works
if python3 rejection-pipeline/status >/dev/null 2>&1; then
  pass "status script runs without errors"
else
  fail "status script runs without errors"
fi

# Verify entity is dispatchable
if python3 rejection-pipeline/status --next 2>/dev/null | grep -q "buggy-add-task"; then
  pass "status --next detects dispatchable entity"
else
  fail "status --next detects dispatchable entity"
fi

echo ""

# --- Phase 2: Run the first officer ---

echo "--- Phase 2: Run first officer (this takes ~120-300s) ---"

cd "$TEST_DIR/test-project"

FO_EXIT=0
claude -p "Process all tasks through the workflow. When you encounter a gate review where the validator recommends REJECTED, approve the REJECTED verdict so the rejection flow proceeds." \
  --agent first-officer \
  --permission-mode bypassPermissions \
  --verbose \
  --output-format stream-json \
  --model haiku \
  --max-budget-usd 5.00 \
  2>&1 > "$TEST_DIR/fo-log.jsonl" || FO_EXIT=$?

echo ""
if [ $FO_EXIT -ne 0 ]; then
  echo "WARNING: first officer exited with code $FO_EXIT (may be expected — budget cap or gate hold)"
fi

# --- Phase 3: Validate ---

echo "--- Phase 3: Validation ---"

# Extract Agent() calls and text output from stream-json log
python3 -c "
import json, sys

fo_texts = []
agent_calls = []

with open('$TEST_DIR/fo-log.jsonl') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if obj.get('type') == 'assistant' and 'message' in obj:
                for block in obj['message'].get('content', []):
                    if block.get('type') == 'tool_use' and block.get('name') == 'Agent':
                        inp = block.get('input', {})
                        agent_calls.append({
                            'subagent_type': inp.get('subagent_type', ''),
                            'name': inp.get('name', ''),
                            'prompt': inp.get('prompt', ''),
                        })
                    if block.get('type') == 'text':
                        fo_texts.append(block['text'])
        except:
            pass

with open('$TEST_DIR/fo-texts.txt', 'w') as f:
    f.write('\n'.join(fo_texts))

with open('$TEST_DIR/agent-calls.txt', 'w') as f:
    for call in agent_calls:
        f.write(f\"subagent_type={call['subagent_type']} name={call['name']}\n\")
        f.write(f\"prompt_preview={call['prompt'][:200]}\n\")
        f.write('---\n')
" 2>/dev/null

echo ""
echo "[Rejection Flow Behavior]"

# Check 1: FO dispatched a validator (not ensign) for the validation stage
if grep -q "subagent_type=validator" "$TEST_DIR/agent-calls.txt" 2>/dev/null; then
  pass "FO dispatched a validator for validation stage"
else
  fail "FO dispatched a validator for validation stage"
fi

# Check 2: The validator's stage report contains a REJECTED recommendation
# Look in entity files (main and worktree copies) and FO text output
FOUND_REJECTED=false

# Check entity file on main
if grep -rqi "REJECTED" "$TEST_DIR/test-project/rejection-pipeline/buggy-add-task.md" 2>/dev/null; then
  FOUND_REJECTED=true
fi

# Check entity files in any worktree
for f in "$TEST_DIR/test-project/.worktrees"/*/rejection-pipeline/buggy-add-task.md; do
  [ -f "$f" ] && grep -qi "REJECTED" "$f" 2>/dev/null && FOUND_REJECTED=true
done

# Check FO text output (gate review presentation contains the stage report)
if grep -qi "REJECTED" "$TEST_DIR/fo-texts.txt" 2>/dev/null; then
  FOUND_REJECTED=true
fi

if $FOUND_REJECTED; then
  pass "validator stage report contains REJECTED recommendation"
else
  fail "validator stage report contains REJECTED recommendation"
fi

# Check 3: FO dispatched an ensign implementer after the rejection
# The implementer dispatch should come AFTER the validator dispatch in the log
VALIDATOR_LINE=$(grep -n "subagent_type=validator" "$TEST_DIR/agent-calls.txt" 2>/dev/null | head -1 | cut -d: -f1)
ENSIGN_LINE=$(grep -n "subagent_type=ensign" "$TEST_DIR/agent-calls.txt" 2>/dev/null | head -1 | cut -d: -f1)

if [ -n "${ENSIGN_LINE:-}" ] && [ -n "${VALIDATOR_LINE:-}" ]; then
  if [ "$ENSIGN_LINE" -gt "$VALIDATOR_LINE" ]; then
    pass "FO dispatched ensign implementer after validator rejection"
  else
    fail "FO dispatched ensign implementer after validator rejection (ensign dispatched before validator)"
  fi
elif [ -n "${ENSIGN_LINE:-}" ]; then
  fail "FO dispatched ensign implementer after validator rejection (no validator dispatch found)"
else
  fail "FO dispatched ensign implementer after validator rejection (no ensign dispatch found)"
fi

# --- Results ---

echo ""
echo "=== Results ==="
TOTAL=$((PASSES + FAILURES))
echo "  $PASSES passed, $FAILURES failed (out of $TOTAL checks)"
echo ""

if [ $FAILURES -gt 0 ]; then
  echo "RESULT: FAIL"
  echo ""
  echo "Debug info:"
  echo "  Test dir:       $TEST_DIR"
  echo "  FO log:         $TEST_DIR/fo-log.jsonl"
  echo "  FO texts:       $TEST_DIR/fo-texts.txt"
  echo "  Agent calls:    $TEST_DIR/agent-calls.txt"
  echo "  Entity file:    $TEST_DIR/test-project/rejection-pipeline/buggy-add-task.md"
  # Don't clean up on failure so logs can be inspected
  trap - EXIT
  exit 1
else
  echo "RESULT: PASS"
  exit 0
fi
