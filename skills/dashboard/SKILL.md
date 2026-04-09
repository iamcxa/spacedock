---
name: dashboard
description: >
  Use when user says 'dashboard', 'start dashboard', 'stop dashboard',
  'dashboard status', 'dashboard share', '看 dashboard', '開 dashboard',
  '關 dashboard', '分享 dashboard'. Manages the Spacedock workflow
  dashboard.
user-invocable: true
---

Manage the Spacedock workflow dashboard via the MCP channel server on port 8420.

## Setup

1. Detect project root: `git rev-parse --show-toplevel`
2. Resolve state dir: `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)`

## MCP Setup Check

Run this check **only on `/dashboard start`** (not on stop/status/logs/restart). It detects a missing or wrong `spacedock-dashboard` entry in `{project_root}/.mcp.json` and offers to fix it before starting the daemon.

**Critical invariant:** This check is **best-effort and non-blocking**. If anything goes wrong (missing `channel.ts`, not a git repo, malformed JSON, user declines), log a warning and skip. The dashboard requires the MCP channel to be active.

### Step A — Resolve paths

```bash
SKILL_DIR="${CLAUDE_SKILL_DIR}"
PLUGIN_ROOT="$(dirname "$(dirname "$SKILL_DIR")")"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
MCP_FILE="${PROJECT_ROOT}/.mcp.json"

# channel.ts: plugin path first (post-extraction), dev repo fallback
PLUGIN_CHANNEL="${PLUGIN_ROOT}/src/channel.ts"
DEV_CHANNEL="${PLUGIN_ROOT}/tools/dashboard/src/channel.ts"

if [ -f "$PLUGIN_CHANNEL" ]; then
  CHANNEL_PATH="$PLUGIN_CHANNEL"
elif [ -f "$DEV_CHANNEL" ]; then
  CHANNEL_PATH="$DEV_CHANNEL"
else
  CHANNEL_PATH=""
  echo "[MCP Setup Check] channel.ts not found — skipping auto-setup."
  echo "  Checked: $PLUGIN_CHANNEL"
  echo "  Checked: $DEV_CHANNEL"
  # Do NOT fail — continue to dashboard start.
fi
```

If `PROJECT_ROOT` is empty (not a git repo) or `CHANNEL_PATH` is empty, **skip the rest of this section** and proceed directly to the dashboard start command.

### Step B — Detect current state

```bash
if [ -n "$CHANNEL_PATH" ] && [ -n "$PROJECT_ROOT" ]; then
  STATUS=$(python3 - "$MCP_FILE" "$CHANNEL_PATH" <<'PYEOF'
import json, os, sys
mcp_file, expected_path = sys.argv[1], sys.argv[2]

if not os.path.exists(mcp_file):
    print("MISSING_FILE"); sys.exit(0)

try:
    with open(mcp_file) as f:
        cfg = json.load(f)
except json.JSONDecodeError as e:
    print(f"MALFORMED:{e}"); sys.exit(0)

if not isinstance(cfg, dict):
    print("MALFORMED:root is not an object"); sys.exit(0)

servers = cfg.get("mcpServers")
if servers is not None and not isinstance(servers, dict):
    print("MALFORMED:mcpServers is not an object"); sys.exit(0)

entry = (servers or {}).get("spacedock-dashboard")
if not entry:
    print("MISSING_ENTRY"); sys.exit(0)

args = entry.get("args") or []
if not args:
    print("MISSING_ARGS"); sys.exit(0)

actual_path = args[0]
# Accept absolute path that samefile's the expected one
if os.path.isabs(actual_path):
    if os.path.exists(actual_path) and os.path.samefile(actual_path, expected_path):
        print("OK"); sys.exit(0)
    print(f"WRONG_PATH:{actual_path}"); sys.exit(0)

# Accept project-relative form (e.g. "tools/dashboard/src/channel.ts")
project_root = os.path.dirname(os.path.abspath(mcp_file))
resolved = os.path.join(project_root, actual_path)
if os.path.exists(resolved) and os.path.samefile(resolved, expected_path):
    print("OK"); sys.exit(0)
print(f"WRONG_PATH:{actual_path}")
PYEOF
  )
fi
```

### Step C — Act on status

Interpret `$STATUS`:

| Status | Action |
|--------|--------|
| `OK` | Silent success. No output. Proceed to dashboard start. |
| `MISSING_FILE` | Show **Case A** prompt. |
| `MISSING_ENTRY` | Show **Case A** prompt. |
| `MISSING_ARGS` | Show **Case A** prompt. |
| `WRONG_PATH:<actual>` | Show **Case B** prompt (include `<actual>` in output). |
| `MALFORMED:<error>` | Show **Case E** warning. Do NOT offer to overwrite. |

Wait for user confirmation before writing. If the user replies `y`, run the merge script (Step D) and show **Case C**. If the user replies `n`, show **Case D**. In all non-OK cases, **continue** to the dashboard start command afterward.

### Step D — Merge script (only after user says `y`)

```bash
python3 - "$MCP_FILE" "$CHANNEL_PATH" <<'PYEOF'
import json, os, sys
mcp_file, channel_path = sys.argv[1], sys.argv[2]

if os.path.exists(mcp_file):
    try:
        with open(mcp_file) as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: .mcp.json is malformed: {e}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(config, dict):
        print("ERROR: .mcp.json root is not an object", file=sys.stderr)
        sys.exit(1)
else:
    config = {}

config.setdefault("mcpServers", {})
if not isinstance(config["mcpServers"], dict):
    print("ERROR: .mcp.json mcpServers is not an object", file=sys.stderr)
    sys.exit(1)

config["mcpServers"]["spacedock-dashboard"] = {
    "command": "bun",
    "args": [channel_path]
}

with open(mcp_file, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")

print(f"OK: wrote spacedock-dashboard entry pointing to {channel_path}")
PYEOF
```

If this script exits non-zero, show the error and still proceed to dashboard start — do not block on merge failure.

### User prompts (bilingual 中英)

**Case A** — `MISSING_FILE` / `MISSING_ENTRY` / `MISSING_ARGS`:

```
[MCP Setup Check]
.mcp.json 中未找到 spacedock-dashboard MCP 設定。
No spacedock-dashboard MCP entry found in .mcp.json.

沒有這個設定，FO 的 reply、add_comment、get_comments、update_entity 工具都無法使用。
Without this entry, FO cannot use reply / add_comment / get_comments / update_entity tools.

將寫入以下設定 / Will write the following entry:
  File:    {MCP_FILE}
  Command: bun
  Args:    ["{CHANNEL_PATH}"]

是否加入？/ Add it now? (y/n)
```

**Case B** — `WRONG_PATH:<actual>`:

```
[MCP Setup Check]
.mcp.json 中的 spacedock-dashboard 路徑不正確。
.mcp.json has spacedock-dashboard, but the path is wrong.

Current:  {actual_path}
Expected: {CHANNEL_PATH}

是否更新為正確路徑？/ Update to the correct path? (y/n)
```

**Case C** — After user says `y` and merge succeeds:

```
[MCP Setup Check] OK

已更新 .mcp.json。
.mcp.json updated.

重要：請重啟 Claude Code session 以啟用 MCP server。
IMPORTANT: Restart Claude Code to activate the MCP server.

重啟後 FO 的 reply / add_comment / get_comments / update_entity 工具才會生效。
After restart, FO tools (reply / add_comment / get_comments / update_entity) will be registered.

繼續啟動 dashboard... / Continuing with dashboard start...
```

**Case D** — After user says `n`:

```
[MCP Setup Check] 略過 / Skipped.

未修改 .mcp.json。FO 的反向工具將無法使用。
No changes made. FO tools will not be available.

繼續啟動 dashboard... / Continuing with dashboard start...
```

**Case E** — `MALFORMED:<error>`:

```
[MCP Setup Check] 警告 / Warning

.mcp.json 格式錯誤，略過自動設定。
.mcp.json is malformed — skipping auto-setup to avoid data loss.

Error: {error_message}

請手動修復 .mcp.json 後重試。
Please fix .mcp.json manually, then retry.

繼續啟動 dashboard... / Continuing with dashboard start...
```

## Bare Invocation (no args)

When the user types just `/dashboard` with no subcommand, present available commands:

| Command | Description |
|---------|-------------|
| `/dashboard start` | Start dashboard daemon |
| `/dashboard stop` | Stop dashboard |
| `/dashboard status` | Show running status |
| `/dashboard share` | Expose full dashboard UI via ngrok tunnel (public URL) |
| `/dashboard logs` | Show logs |
| `/dashboard restart` | Restart |

Wait for user to choose. Do not auto-start.

## Commands

Parse the user's intent from their message:

- `/dashboard start` — The dashboard starts automatically when Claude Code activates the spacedock-dashboard MCP channel. If the channel entry is missing from `.mcp.json`, run the [MCP Setup Check](#mcp-setup-check) above, then restart Claude Code.

- `/dashboard stop` — The dashboard stops when Claude Code exits (the channel server lifecycle is tied to the CC session). To force-stop, the user can quit and restart Claude Code.

- `/dashboard status` — Check whether the channel server is active:
  ```bash
  STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
  if [ -f "$STATE_DIR/channel_port" ]; then
    PORT=$(cat "$STATE_DIR/channel_port" | tr -d '[:space:]')
    curl -sf "http://127.0.0.1:$PORT/api/events" >/dev/null && echo "Dashboard running on :$PORT" || echo "Dashboard not responding"
  else
    echo "Dashboard not running (no channel_port state file)"
  fi
  ```

- `/dashboard logs` — show dashboard logs:
  ```bash
  STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
  cat "$STATE_DIR/dashboard.log" 2>/dev/null || echo "No log file found"
  ```

- `/dashboard restart` — To restart the dashboard, restart Claude Code (the channel server is tied to the CC session lifecycle).

- `/dashboard share` — expose the full dashboard UI via an ngrok tunnel (see Share flow below)

## Share Flow

When the user invokes `/dashboard share`, execute this flow.

### Hint — what `/dashboard share` does

`/dashboard share` exposes the **full dashboard UI** via an `ngrok` tunnel. It does NOT create scoped share links or passwords — anyone with the URL can see and interact with everything in the dashboard exactly like the local user. Only share with trusted collaborators.

**Port:** Always tunnel the channel port (8420). This is the only dashboard server — it has a direct MCP stdio transport to the running Claude Code session.

If the user wants scoped, password-protected share links to specific entities, they should use the dashboard UI's "Share" panel inside the detail page instead.

### Step 1 — Ensure dashboard is running

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
PORT=$(cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
if [ -z "$PORT" ] || ! curl -sf "http://127.0.0.1:$PORT/api/events" >/dev/null 2>&1; then
  echo "[Share] Dashboard not running. The dashboard requires an active Claude Code session with the spacedock-dashboard MCP channel."
  exit 1
fi
```

### Step 2 — Check ngrok is installed

```bash
if ! command -v ngrok >/dev/null 2>&1; then
  NGROK_MISSING=1
fi
```

If `NGROK_MISSING` is set, prompt the user:

```
[Share] ngrok 未安裝 / ngrok is not installed.

/dashboard share 需要 ngrok 把本機 dashboard 暴露到 public URL。
/dashboard share needs ngrok to expose the local dashboard to a public URL.

要透過 homebrew 安裝嗎？/ Install via homebrew? (y/n)
  → y: 將執行 / Will run: brew install ngrok
  → n: 略過 — 請手動安裝後重試 / Skip — please install manually and retry
```

If user says `y`: run `brew install ngrok`. If the install fails (non-zero exit), show the error and stop — do NOT proceed.
If user says `n`: stop the share flow. Print a hint: "安裝後重試 `/dashboard share` / After install, retry `/dashboard share`".

On macOS without homebrew, point user to `https://ngrok.com/download`.

### Step 3 — Resolve dashboard port

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
PORT=$(cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
if [ -z "$PORT" ]; then
  echo "[Share] Cannot determine dashboard port — ensure Claude Code is running with the spacedock-dashboard channel"
  exit 1
fi
```

### Step 4 — Check if ngrok is already tunneling this port

```bash
EXISTING_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    for t in d.get('tunnels', []):
        addr = t.get('config', {}).get('addr', '')
        if addr.endswith(':$PORT'):
            print(t['public_url'])
            break
except Exception:
    pass
")
```

If `EXISTING_URL` is set, reuse it and skip to Step 6.

### Step 5 — Start ngrok tunnel

```bash
nohup ngrok http "$PORT" --log=stdout > "$STATE_DIR/ngrok.log" 2>&1 &
NGROK_PID=$!
echo "$NGROK_PID" > "$STATE_DIR/ngrok.pid"

# Poll ngrok API for up to 10s until tunnel URL is ready
URL=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    tunnels = d.get('tunnels', [])
    if tunnels:
        print(tunnels[0]['public_url'])
except Exception:
    pass
")
  [ -n "$URL" ] && break
done

if [ -z "$URL" ]; then
  echo "[Share] ngrok started but tunnel URL not captured within 10s."
  echo "  Check: $STATE_DIR/ngrok.log"
  echo "  Or query: curl http://127.0.0.1:4040/api/tunnels"
  exit 1
fi

echo "$URL" > "$STATE_DIR/tunnel_url"
```

### Step 6 — Present result

```
🔗 Dashboard Share URL
   URL:  {URL}
   Port: {PORT} (full dashboard UI)

⚠️  Public access — anyone with this URL can read/write the dashboard.
    Only share with trusted collaborators.

Note: ngrok free tier shows an interstitial on first visit.
Stop tunnel: /dashboard tunnel stop (or kill ngrok: $(cat {STATE_DIR}/ngrok.pid))
```

## Output

Print the command output directly to the user. If starting, highlight the URL.
