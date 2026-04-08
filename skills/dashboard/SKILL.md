---
name: dashboard
description: >
  Use when user says 'dashboard', 'start dashboard', 'stop dashboard',
  'dashboard status', 'dashboard share', '看 dashboard', '開 dashboard',
  '關 dashboard', '分享 dashboard'. Manages the Spacedock workflow
  dashboard daemon.
user-invocable: true
---

Manage the Spacedock workflow dashboard daemon via `ctl.sh`.

## Setup

1. Detect project root: `git rev-parse --show-toplevel`
2. Resolve ctl.sh path: `{project_root}/tools/dashboard/ctl.sh`
3. Resolve state dir: `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)`

## MCP Setup Check

Run this check **only on `/dashboard start`** (not on stop/status/logs/restart). It detects a missing or wrong `spacedock-dashboard` entry in `{project_root}/.mcp.json` and offers to fix it before starting the daemon.

**Critical invariant:** This check is **best-effort and non-blocking**. If anything goes wrong (missing `channel.ts`, not a git repo, malformed JSON, user declines), log a warning and continue to `bash {ctl} start --root {project_root}`. The dashboard HTTP channel still works; only the MCP bidirectional path is degraded.

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
| `/dashboard share` | Start tunnel + create share link |
| `/dashboard logs` | Show logs |
| `/dashboard restart` | Restart |

Wait for user to choose. Do not auto-start.

## Commands

Parse the user's intent from their message:

- `/dashboard start` — start the dashboard daemon:

  **First run the [MCP Setup Check](#mcp-setup-check)** (above) to detect/fix the `spacedock-dashboard` entry in `.mcp.json`. The check is best-effort and non-blocking — proceed to the start command regardless of outcome.

  ```bash
  bash {ctl} start --root {project_root}
  ```

- `/dashboard stop` — stop the dashboard daemon:
  ```bash
  bash {ctl} stop --root {project_root}
  ```

- `/dashboard status` — show dashboard status:
  ```bash
  bash {ctl} status --root {project_root}
  ```

- `/dashboard status --all` — show all dashboard instances:
  ```bash
  bash {ctl} status --all
  ```

- `/dashboard logs` — show dashboard logs (timeout after 10 seconds if using --follow):
  ```bash
  bash {ctl} logs --root {project_root}
  ```

- `/dashboard restart` — restart the dashboard:
  ```bash
  bash {ctl} restart --root {project_root}
  ```

- `/dashboard share` — create a shareable public link (see Share flow below)

## Share Flow

When the user invokes `/dashboard share`, execute this flow:

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

### Step 2 — Ask scope (optional, quick)

If user provided args (e.g., `/dashboard share 021`), use that as scope.
Otherwise, default to all active entities. Do NOT ask interactively unless the user seems to want scoped access — bias toward "share everything, move fast."

### Step 3 — Get dashboard port and tunnel URL

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
# Try server port first, fall back to channel port
PORT=$(cat "$STATE_DIR/port" 2>/dev/null || cat "$STATE_DIR/channel_port" 2>/dev/null)
PORT=$(echo "$PORT" | tr -d '[:space:]')
TUNNEL_URL=$(cat "$STATE_DIR/tunnel_url")
```

### Step 4 — Discover entity paths for scope

```bash
# All active entities (default)
python3 {project_root}/skills/commission/bin/status --workflow-dir {workflow_dir} 2>/dev/null \
  | awk 'NR>2 {print $2}' \
  | sed 's|^|{workflow_dir}/|; s|$|.md|'
```

Or if scoped to specific entity IDs, filter accordingly.

### Step 5 — Create share link via API

```bash
# Generate a random password
PASSWORD=$(openssl rand -hex 4)

curl -s -X POST http://127.0.0.1:${PORT}/api/share \
  -H 'Content-Type: application/json' \
  -d '{
    "password": "'${PASSWORD}'",
    "entityPaths": [<entity paths from Step 4>],
    "stages": [],
    "label": "Share Link",
    "ttlHours": 24
  }'
```

Capture the `token` from the response.

### Step 6 — Present result

```
🔗 Shareable Dashboard Link
   URL:      {TUNNEL_URL}/share/{token}
   Password: {PASSWORD}
   Expires:  24h
   Scope:    {N} entities (all active)

Send the URL + password to your reviewer.
Note: ngrok free tier shows an interstitial on first visit.
```

## Output

Print the command output directly to the user. If starting, highlight the URL.
