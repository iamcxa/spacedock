---
name: dashboard
description: >
  Use when user says 'dashboard', 'start dashboard', 'stop dashboard',
  'dashboard status', '看 dashboard', '開 dashboard', '關 dashboard'.
  Manages the Spacedock workflow dashboard daemon.
user-invocable: true
---

Manage the Spacedock workflow dashboard daemon via `ctl.sh`.

## Setup

1. Detect project root: `git rev-parse --show-toplevel`
2. Resolve ctl.sh path: `{project_root}/tools/dashboard/ctl.sh`

## Commands

Parse the user's intent from their message:

- `/dashboard` or `/dashboard start` — start the dashboard daemon:
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

## Output

Print the command output directly to the user. If starting, highlight the URL.
