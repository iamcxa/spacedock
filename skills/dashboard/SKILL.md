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
PORT=$(cat "$STATE_DIR/port" 2>/dev/null || cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
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
