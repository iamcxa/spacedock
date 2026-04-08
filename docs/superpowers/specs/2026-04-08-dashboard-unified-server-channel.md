# Dashboard Unified Server + Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ctl.sh` detect Claude Code-spawned channel.ts instances so that tunnel/share/status commands work transparently regardless of which dashboard mode is active.

**Architecture:** Three changes work together: (1) channel.ts writes a `channel_port` state file on startup and cleans it up on exit, using the same STATE_DIR hash convention as ctl.sh; (2) ctl.sh gains `is_channel_running()` and updates `do_tunnel_start()`, `do_status()`, `do_status_all()` to check for channel instances; (3) SKILL.md share flow reads `channel_port` as fallback when `port` file is absent. All detection validates liveness via `port_in_use()` to handle SIGKILL stale-file scenarios.

**Tech Stack:** Bun (TypeScript, bun:test), bash (ctl.sh), vanilla JS (static UI -- no changes needed)

---

## Research Corrections (MUST follow)

1. **CLAIM-2 correction**: channel.ts accepts `--port` via `parseArgs` (default "8420"). The state file must write the **actual bound port** from `dashboard.port`, not hardcoded 8420.
2. **Edge case: `do_tunnel_start()` guard**: `is_running()` at line 143 blocks tunnel when only channel.ts is active (no PID file). Must add `is_channel_running()` as alternative path.
3. **Edge case: SIGKILL cleanup race**: Validate stale `channel_port` with `port_in_use()` before trusting the file.
4. **Edge case: `do_status_all()`**: Needs `channel_port` file scanning to show channel-only instances.
5. **Bun `process.on("SIGTERM")` confirmed**: Use for state file cleanup on graceful exit.

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `tools/dashboard/src/channel.ts` | Write `channel_port` state file on startup, clean up on exit |
| Modify | `tools/dashboard/ctl.sh` | Add `is_channel_running()`, update tunnel/status to detect channel |
| Modify | `skills/dashboard/SKILL.md` | Share flow reads `channel_port` as fallback |
| Modify | `tests/dashboard/channel.test.ts` | Tests for state file write/cleanup |
| Modify | `tests/dashboard/ctl.test.ts` | Tests for channel detection in ctl.sh |

---

### Task 1: channel.ts state file -- failing tests

**Files:**
- Test: `tests/dashboard/channel.test.ts`

- [ ] **Step 1: Write failing tests for channel_port state file behavior**

Add a new `describe("Channel State File")` block at the end of `tests/dashboard/channel.test.ts`:

```typescript
describe("Channel State File", () => {
  let tmpDir: string;
  let stateDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "channel-state-test-"));
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");
    const staticDir = join(tmpDir, "static");
    mkdirSync(staticDir);
    writeFileSync(join(staticDir, "index.html"), "<html></html>");

    // Compute state dir using same hash as ctl.sh
    const hash = Bun.spawnSync(["bash", "-c", `echo -n "${tmpDir}" | shasum | cut -c1-8`])
      .stdout.toString().trim();
    stateDir = join(homedir(), ".spacedock", "dashboard", hash);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    // Clean up state dir
    rmSync(stateDir, { recursive: true, force: true });
  });

  test("writeChannelState writes channel_port file to correct state dir", async () => {
    const { writeChannelState } = await import("../../tools/dashboard/src/channel");
    mkdirSync(stateDir, { recursive: true });
    writeChannelState(stateDir, 8420);

    const portFile = join(stateDir, "channel_port");
    expect(existsSync(portFile)).toBe(true);
    expect(readFileSync(portFile, "utf-8").trim()).toBe("8420");
  });

  test("writeChannelState writes actual bound port, not default", async () => {
    const { writeChannelState } = await import("../../tools/dashboard/src/channel");
    mkdirSync(stateDir, { recursive: true });
    writeChannelState(stateDir, 8425);

    const portFile = join(stateDir, "channel_port");
    expect(readFileSync(portFile, "utf-8").trim()).toBe("8425");
  });

  test("cleanChannelState removes channel_port file", async () => {
    const { writeChannelState, cleanChannelState } = await import("../../tools/dashboard/src/channel");
    mkdirSync(stateDir, { recursive: true });
    writeChannelState(stateDir, 8420);

    const portFile = join(stateDir, "channel_port");
    expect(existsSync(portFile)).toBe(true);

    cleanChannelState(stateDir);
    expect(existsSync(portFile)).toBe(false);
  });

  test("cleanChannelState is no-op when file does not exist", async () => {
    const { cleanChannelState } = await import("../../tools/dashboard/src/channel");
    mkdirSync(stateDir, { recursive: true });
    // Should not throw
    cleanChannelState(stateDir);
  });

  test("computeStateDir returns correct hash-based path", async () => {
    const { computeStateDir } = await import("../../tools/dashboard/src/channel");
    const result = computeStateDir(tmpDir);
    expect(result).toBe(stateDir);
  });
});
```

Note: Add these imports at the top of the file (merge with existing imports):
```typescript
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/channel.test.ts`
Expected: FAIL -- `writeChannelState` is not exported from `../../tools/dashboard/src/channel`

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/dashboard/channel.test.ts
git commit -m "test: add failing tests for channel.ts state file write/cleanup"
```

---

### Task 2: channel.ts state file -- implementation

**Files:**
- Modify: `tools/dashboard/src/channel.ts`

- [ ] **Step 1: Add state file helper functions**

Add these exports after the `ChannelServerOptions` interface (after line 26) in `tools/dashboard/src/channel.ts`:

```typescript
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";

export function computeStateDir(projectRoot: string): string {
  const hash = createHash("sha1").update(projectRoot).digest("hex").slice(0, 8);
  return join(homedir(), ".spacedock", "dashboard", hash);
}

export function writeChannelState(stateDir: string, port: number): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "channel_port"), String(port) + "\n");
}

export function cleanChannelState(stateDir: string): void {
  const portFile = join(stateDir, "channel_port");
  if (existsSync(portFile)) {
    try { unlinkSync(portFile); } catch {}
  }
}
```

Note on `computeStateDir`: ctl.sh uses `echo -n "$ROOT" | shasum | cut -c1-8`. `shasum` on macOS defaults to SHA-1. Node's `crypto.createHash("sha1")` produces the same hash. The `.update(projectRoot)` input must be the **exact same string** as bash's `echo -n "$ROOT"` -- both should be the resolved absolute path with no trailing newline.

- [ ] **Step 2: Wire state file into the CLI entry point**

In the `if (import.meta.main)` block (line 136+), after `dashboard.broadcastChannelStatus(true)` (line 177), add state file writes and cleanup handlers:

```typescript
  // Write channel state file so ctl.sh can detect this instance
  const stateDir = computeStateDir(projectRoot);
  writeChannelState(stateDir, dashboard.port);

  // Clean up state file on exit (graceful)
  const cleanup = () => {
    cleanChannelState(stateDir);
  };
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("exit", cleanup);

  // Update mcp.onclose to also clean state
  mcp.onclose = () => {
    dashboard.broadcastChannelStatus(false);
    cleanup();
  };
```

This replaces the existing `mcp.onclose` assignment at line 179-181.

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/channel.test.ts`
Expected: All tests PASS (existing + new state file tests)

- [ ] **Step 4: Verify hash consistency between TS and bash**

Run this to confirm the hash functions produce identical output:

```bash
TEST_PATH="/tmp/test-hash-verify"
BASH_HASH=$(echo -n "$TEST_PATH" | shasum | cut -c1-8)
TS_HASH=$(bun -e "const crypto = require('crypto'); console.log(crypto.createHash('sha1').update('$TEST_PATH').digest('hex').slice(0, 8))")
echo "bash=$BASH_HASH ts=$TS_HASH"
# Expected: both identical
```

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/src/channel.ts
git commit -m "feat(channel): write channel_port state file for ctl.sh detection"
```

---

### Task 3: ctl.sh channel detection -- failing tests

**Files:**
- Test: `tests/dashboard/ctl.test.ts`

- [ ] **Step 1: Write failing tests for channel detection**

Add a new `describe("Channel Detection")` block at the end of `tests/dashboard/ctl.test.ts`:

```typescript
describe("Channel Detection", () => {
  let tmpDir: string;
  let channelServer: ReturnType<typeof Bun.serve> | null = null;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ctl-channel-test-"));
    makeProject(tmpDir);
  });

  afterEach(() => {
    try { ctl(tmpDir, "stop"); } catch {}
    channelServer?.stop();
    channelServer = null;
    // Clean up channel_port state file
    const stateDir = getStateDir(tmpDir);
    const channelPortFile = join(stateDir, "channel_port");
    if (existsSync(channelPortFile)) {
      rmSync(channelPortFile);
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("status shows channel instance when channel_port file exists and port responds", () => {
    // Simulate a channel.ts instance: write channel_port + serve HTTP
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("channel");
    expect(result.stdout).toContain(String(channelPort));
  });

  test("status cleans stale channel_port when port is not in use", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    // Write a port that nothing is listening on
    writeFileSync(join(stateDir, "channel_port"), "19999\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status");
    expect(result.exitCode).toBe(0);
    // Should NOT show channel as running
    expect(result.stdout.toLowerCase()).not.toContain("channel");
    // Stale file should be cleaned
    expect(existsSync(join(stateDir, "channel_port"))).toBe(false);
  });

  test("tunnel start works with channel-only instance (no PID file)", () => {
    // This test requires ngrok, so we just verify ctl.sh doesn't reject
    // with "dashboard is not running" when channel_port exists
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");

    const result = ctl(tmpDir, "tunnel", "start");
    // Should NOT fail with "dashboard is not running"
    // It may fail with "ngrok not found" -- that's fine, it means we passed the guard
    if (result.exitCode !== 0) {
      expect(result.stderr).not.toContain("dashboard is not running");
    }
  });

  test("status --all shows channel-only instances", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status", "--all");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("channel");
    expect(result.stdout).toContain(String(channelPort));
  });

  test("stop does NOT kill channel instance (only ctl-managed server)", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");

    const result = ctl(tmpDir, "stop");
    expect(result.exitCode).toBe(0);
    // channel_port file should remain (channel is Claude Code-managed)
    expect(existsSync(join(stateDir, "channel_port"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/ctl.test.ts`
Expected: FAIL -- status does not show "channel", tunnel start rejects with "dashboard is not running"

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/dashboard/ctl.test.ts
git commit -m "test: add failing tests for ctl.sh channel instance detection"
```

---

### Task 4: ctl.sh channel detection -- implementation

**Files:**
- Modify: `tools/dashboard/ctl.sh`

- [ ] **Step 1: Add `CHANNEL_PORT_FILE` variable and `is_channel_running()` function**

After line 94 (`TUNNEL_PID_FILE="$STATE_DIR/tunnel_pid"`), add:

```bash
CHANNEL_PORT_FILE="$STATE_DIR/channel_port"
```

After the `port_in_use()` function (after line 111), add:

```bash
is_channel_running() {
    [[ -f "$CHANNEL_PORT_FILE" ]] || return 1
    local ch_port
    ch_port="$(cat "$CHANNEL_PORT_FILE" | tr -d '[:space:]')"
    [[ -n "$ch_port" ]] || return 1
    port_in_use "$ch_port"
}

get_channel_port() {
    cat "$CHANNEL_PORT_FILE" 2>/dev/null | tr -d '[:space:]'
}

clean_stale_channel() {
    rm -f "$CHANNEL_PORT_FILE"
}
```

- [ ] **Step 2: Update `do_tunnel_start()` to support channel-only instances**

Replace the guard at lines 141-154 of `do_tunnel_start()`:

```bash
do_tunnel_start() {
    # Determine which instance to tunnel to: server.ts (PID) or channel.ts (channel_port)
    local selected_port=""

    if is_running; then
        # Server.ts daemon is running -- use its port
        selected_port="$(cat "$PORT_FILE" 2>/dev/null)"
    elif is_channel_running; then
        # Channel.ts instance detected -- use channel port
        selected_port="$(get_channel_port)"
    else
        echo "Error: no dashboard instance running (neither server nor channel)." >&2
        echo "  Start server: ctl.sh start" >&2
        echo "  Or launch channel via Claude Code MCP" >&2
        return 1
    fi

    if [[ -z "$selected_port" ]]; then
        echo "Error: cannot determine dashboard port" >&2
        return 1
    fi
```

Keep the rest of `do_tunnel_start()` unchanged (from line 156 `if ! command -v ngrok` onward). The variable `selected_port` is already used by the rest of the function.

- [ ] **Step 3: Update `do_status()` to show channel instance**

Replace `do_status()` (lines 371-414) with:

```bash
do_status() {
    if [[ "$STATUS_ALL" == "true" ]]; then
        do_status_all
        return
    fi

    local has_server=false
    local has_channel=false

    # Check server.ts (ctl-managed)
    if is_running; then
        has_server=true
    elif [[ -f "$PID_FILE" ]]; then
        clean_stale
        echo "(Cleaned stale server PID file.)"
    fi

    # Check channel.ts (Claude Code-managed)
    if is_channel_running; then
        has_channel=true
    elif [[ -f "$CHANNEL_PORT_FILE" ]]; then
        clean_stale_channel
        echo "(Cleaned stale channel port file.)"
    fi

    if [[ "$has_server" == "false" && "$has_channel" == "false" ]]; then
        echo "Dashboard is not running."
        return 0
    fi

    echo "Spacedock Dashboard"

    if [[ "$has_server" == "true" ]]; then
        local pid port root_path
        pid="$(cat "$PID_FILE")"
        port="$(cat "$PORT_FILE" 2>/dev/null || echo '?')"
        root_path="$(cat "$ROOT_FILE" 2>/dev/null || echo '?')"

        local now mtime seconds uptime_str
        now="$(date +%s)"
        mtime="$(stat -f %m "$PID_FILE" 2>/dev/null || stat -c %Y "$PID_FILE" 2>/dev/null || echo "$now")"
        seconds=$((now - mtime))
        uptime_str="$(format_uptime "$seconds")"

        echo "  Server:  running (PID ${pid})"
        echo "  URL:     http://127.0.0.1:${port}/"
        echo "  Root:    ${root_path}"
        echo "  Uptime:  ${uptime_str}"
        echo "  Log:     ${LOG_FILE}"
    fi

    if [[ "$has_channel" == "true" ]]; then
        local ch_port
        ch_port="$(get_channel_port)"
        echo "  Channel: running (port ${ch_port}, Claude Code managed)"
        echo "  URL:     http://127.0.0.1:${ch_port}/"
    fi

    if [[ -f "$TUNNEL_URL_FILE" ]]; then
        local tunnel_url
        tunnel_url="$(cat "$TUNNEL_URL_FILE")"
        if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
            echo "  Tunnel:  ${tunnel_url}"
        else
            echo "  Tunnel:  (not running)"
            rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
        fi
    fi
}
```

- [ ] **Step 4: Update `do_status_all()` to scan for channel_port files**

Replace `do_status_all()` (lines 416-454) with:

```bash
do_status_all() {
    local base_dir="$HOME/.spacedock/dashboard"
    if [[ ! -d "$base_dir" ]]; then
        echo "No dashboard instances found."
        return 0
    fi

    echo "Spacedock Dashboards"
    local found=false
    for dir in "$base_dir"/*/; do
        [[ -d "$dir" ]] || continue
        local dir_pid_file="$dir/pid"
        local dir_port_file="$dir/port"
        local dir_root_file="$dir/root"
        local dir_channel_port_file="$dir/channel_port"

        local proj_name="?"
        if [[ -f "$dir_root_file" ]]; then
            proj_name="$(basename "$(cat "$dir_root_file")")"
        fi

        local shown=false

        # Check server.ts instance
        if [[ -f "$dir_pid_file" ]]; then
            local pid
            pid="$(cat "$dir_pid_file")"
            if kill -0 "$pid" 2>/dev/null; then
                found=true
                shown=true
                local port
                port="$(cat "$dir_port_file" 2>/dev/null || echo '?')"
                echo "  [server]   ${proj_name}  http://127.0.0.1:${port}/  PID ${pid}"
            else
                echo "  [stale]    ${proj_name}  PID file exists but process dead — cleaned up"
                rm -f "$dir_pid_file" "$dir_port_file" "$dir_root_file"
            fi
        fi

        # Check channel.ts instance
        if [[ -f "$dir_channel_port_file" ]]; then
            local ch_port
            ch_port="$(cat "$dir_channel_port_file" | tr -d '[:space:]')"
            if [[ -n "$ch_port" ]] && (echo >/dev/tcp/localhost/"$ch_port") 2>/dev/null; then
                found=true
                shown=true
                echo "  [channel]  ${proj_name}  http://127.0.0.1:${ch_port}/  (Claude Code)"
            else
                if [[ "$shown" == "false" ]]; then
                    echo "  [stale]    ${proj_name}  channel_port file exists but port not responding — cleaned up"
                fi
                rm -f "$dir_channel_port_file"
            fi
        fi
    done

    if [[ "$found" == "false" ]]; then
        echo "  No dashboard instances found."
    fi
}
```

- [ ] **Step 5: Ensure `clean_stale()` does NOT remove `channel_port`**

Verify that `clean_stale()` (line 105-107) only removes server-managed files. Current code:
```bash
clean_stale() {
    rm -f "$PID_FILE" "$PORT_FILE" "$ROOT_FILE" "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
}
```
This is correct -- it does NOT touch `$CHANNEL_PORT_FILE`. No change needed. The `do_stop()` function calls `clean_stale()` which correctly leaves channel state alone.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/ctl.test.ts`
Expected: All tests PASS (existing + new channel detection tests)

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/ctl.sh
git commit -m "feat(ctl): detect channel.ts instances for tunnel/status commands"
```

---

### Task 5: SKILL.md share flow update

**Files:**
- Modify: `skills/dashboard/SKILL.md`

- [ ] **Step 1: Update Step 1 of Share Flow to detect channel instance**

Replace the "Step 1 -- Ensure dashboard + tunnel running" section (lines 74-88) with:

```markdown
### Step 1 — Ensure dashboard + tunnel running

```bash
# Check status (now shows both server and channel instances)
bash {ctl} status --root {project_root}
```

- **Not running (neither server nor channel)** → start with tunnel: `bash {ctl} start --tunnel --root {project_root}`
- **Running (server or channel), no tunnel** → start tunnel: `bash {ctl} tunnel start --root {project_root}`
- **Running, tunnel active** → continue to Step 2

Detect tunnel by checking for `{state_dir}/tunnel_url` file:
```bash
cat ~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)/tunnel_url 2>/dev/null
```
```

- [ ] **Step 2: Update Step 3 to read channel_port as fallback**

Replace the "Step 3 -- Get dashboard port and tunnel URL" section (lines 96-101) with:

```markdown
### Step 3 — Get dashboard port and tunnel URL

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
# Try server port first, fall back to channel port
PORT=$(cat "$STATE_DIR/port" 2>/dev/null || cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
TUNNEL_URL=$(cat "$STATE_DIR/tunnel_url")
```
```

- [ ] **Step 3: Commit**

```bash
git add skills/dashboard/SKILL.md
git commit -m "docs(skill): update share flow to support channel instance detection"
```

---

### Task 6: Integration verification

**Files:**
- No new files -- verification only

- [ ] **Step 1: Run all dashboard tests**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/channel.test.ts ../../tests/dashboard/ctl.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Type-check**

Run: `cd tools/dashboard && bun build src/channel.ts --no-bundle --outdir /tmp/typecheck-024 2>&1`
Expected: No type errors (Bun's build surfaces TS errors)

- [ ] **Step 3: Verify ctl.sh has no syntax errors**

Run: `bash -n tools/dashboard/ctl.sh`
Expected: No output (clean parse)

- [ ] **Step 4: Verify backward compatibility -- server-only mode unchanged**

Run: `cd tools/dashboard && bun test ../../tests/dashboard/ctl.test.ts` (specifically the original `describe("Dashboard ctl.sh")` block)
Expected: All existing tests still pass -- server-only mode behavior is unmodified

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address integration issues from verification"
```
Only if changes were needed. Skip if all passed clean.

---

## Quality Gates

| Gate | Command | Expected |
|------|---------|----------|
| Channel tests | `cd tools/dashboard && bun test ../../tests/dashboard/channel.test.ts` | All pass |
| Ctl tests | `cd tools/dashboard && bun test ../../tests/dashboard/ctl.test.ts` | All pass |
| Type-check | `cd tools/dashboard && bun build src/channel.ts --no-bundle --outdir /tmp/tc` | No errors |
| Bash syntax | `bash -n tools/dashboard/ctl.sh` | No errors |
| Existing tests | `cd tools/dashboard && bun test ../../tests/dashboard/` | All pass |
