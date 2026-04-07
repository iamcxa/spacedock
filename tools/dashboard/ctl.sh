#!/bin/bash
# ABOUTME: Daemon lifecycle manager for the Spacedock workflow dashboard.
# ABOUTME: Subcommands: start, stop, status, logs, restart.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# --- argument parsing ---

CMD=""
PORT=""
ROOT=""
STATUS_ALL=false
LOGS_FOLLOW=false
CHANNEL_MODE=false
TUNNEL_MODE=false

usage() {
    echo "Usage: $(basename "$0") <start|stop|status|logs|restart> [options]"
    echo ""
    echo "Options:"
    echo "  --port PORT    Port to serve on (default: 8420, auto-selects 8420-8429)"
    echo "  --root DIR     Project root (default: git toplevel or cwd)"
    echo "  --channel      Launch in channel mode (MCP + dashboard, for Claude Code --channels)"
    echo "  --tunnel       Launch ngrok tunnel for public access (requires ngrok installed)"
    echo "  --all          (status) Show all dashboard instances"
    echo "  --follow       (logs) Tail the log file"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") start"
    echo "  $(basename "$0") status --all"
    echo "  $(basename "$0") stop --root /path/to/project"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        start|stop|status|logs|restart)
            CMD="$1"; shift ;;
        --port)
            PORT="$2"; shift 2 ;;
        --root)
            ROOT="$2"; shift 2 ;;
        --all)
            STATUS_ALL=true; shift ;;
        --channel)
            CHANNEL_MODE=true; shift ;;
        --tunnel)
            TUNNEL_MODE=true; shift ;;
        --follow)
            LOGS_FOLLOW=true; shift ;;
        -h|--help)
            usage; exit 0 ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 1 ;;
    esac
done

if [[ -z "$CMD" ]]; then
    echo "Error: subcommand required." >&2
    usage >&2
    exit 1
fi

# --- resolve project root ---

if [[ -z "$ROOT" ]]; then
    ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$REPO_ROOT")"
fi
ROOT="$(cd "$ROOT" && pwd)"  # absolute path

# --- state directory ---

PROJ_HASH="$(echo -n "$ROOT" | shasum | cut -c1-8)"
STATE_DIR="$HOME/.spacedock/dashboard/$PROJ_HASH"
PID_FILE="$STATE_DIR/pid"
PORT_FILE="$STATE_DIR/port"
ROOT_FILE="$STATE_DIR/root"
LOG_FILE="$STATE_DIR/dashboard.log"
TUNNEL_URL_FILE="$STATE_DIR/tunnel_url"
TUNNEL_PID_FILE="$STATE_DIR/tunnel_pid"

# --- helper functions ---

is_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid
    pid="$(cat "$PID_FILE")"
    kill -0 "$pid" 2>/dev/null
}

clean_stale() {
    rm -f "$PID_FILE" "$PORT_FILE" "$ROOT_FILE" "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
}

port_in_use() {
    (echo >/dev/tcp/localhost/"$1") 2>/dev/null
}

find_free_port() {
    local base="${1:-8420}"
    local p
    for p in $(seq "$base" 8429); do
        if ! port_in_use "$p"; then
            echo "$p"
            return 0
        fi
    done
    echo "Error: all ports 8420-8429 are occupied." >&2
    return 1
}

format_uptime() {
    local seconds="$1"
    local hours=$((seconds / 3600))
    local minutes=$(( (seconds % 3600) / 60 ))
    if [[ $hours -gt 0 ]]; then
        echo "${hours}h ${minutes}m"
    elif [[ $minutes -gt 0 ]]; then
        echo "${minutes}m"
    else
        echo "${seconds}s"
    fi
}

# --- tunnel lifecycle ---

do_tunnel_stop() {
    if [[ ! -f "$TUNNEL_PID_FILE" ]]; then
        echo "Tunnel is not running."
        return 0
    fi

    local tunnel_pid
    tunnel_pid="$(cat "$TUNNEL_PID_FILE")"
    kill "$tunnel_pid" 2>/dev/null || true
    rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
    echo "Tunnel stopped."
}

# --- subcommands ---

do_start() {
    # Already running?
    if is_running; then
        local running_port
        running_port="$(cat "$PORT_FILE" 2>/dev/null || echo '?')"
        local running_pid
        running_pid="$(cat "$PID_FILE")"
        echo "Dashboard already running: http://127.0.0.1:${running_port}/ (PID: ${running_pid})"
        return 0
    fi

    # Stale PID?
    if [[ -f "$PID_FILE" ]]; then
        clean_stale
    fi

    # Create state directory
    mkdir -p "$STATE_DIR"

    # Log rotation
    if [[ -f "$LOG_FILE" ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.1"
    fi

    # Port selection
    local selected_port
    if [[ -n "$PORT" ]]; then
        selected_port="$PORT"
    else
        selected_port="$(find_free_port 8420)"
    fi

    # Launch daemon
    local entry_script="tools/dashboard/src/server.ts"
    if [[ "$CHANNEL_MODE" == "true" ]]; then
        entry_script="tools/dashboard/src/channel.ts"
    fi

    local host_flag=""
    if [[ "$TUNNEL_MODE" == "true" ]]; then
        host_flag="--host 0.0.0.0"
    fi

    nohup bun run "$REPO_ROOT/$entry_script" \
        --port "$selected_port" \
        --root "$ROOT" \
        --log-file "$LOG_FILE" \
        $host_flag \
        > /dev/null 2>&1 &
    local daemon_pid=$!

    # Write state files
    echo "$daemon_pid" > "$PID_FILE"
    echo "$selected_port" > "$PORT_FILE"
    echo "$ROOT" > "$ROOT_FILE"

    # Health check — poll up to 3 seconds
    local attempts=0
    local max_attempts=6
    while [[ $attempts -lt $max_attempts ]]; do
        if curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${selected_port}/" 2>/dev/null | grep -q '200'; then
            local mode_label=""
            if [[ "$CHANNEL_MODE" == "true" ]]; then
                mode_label=" [channel mode]"
            fi
            echo "Dashboard running${mode_label}: http://127.0.0.1:${selected_port}/ (PID: ${daemon_pid})"
            break
        fi
        sleep 0.5
        attempts=$((attempts + 1))
    done

    # Check if process is still alive (only if health check didn't succeed)
    if [[ $attempts -ge $max_attempts ]]; then
        if kill -0 "$daemon_pid" 2>/dev/null; then
            echo "Dashboard started but health check timed out: http://127.0.0.1:${selected_port}/ (PID: ${daemon_pid})"
        else
            clean_stale
            echo "Error: dashboard failed to start. Check log: $LOG_FILE" >&2
            return 1
        fi
    fi

    # --- Tunnel mode ---
    if [[ "$TUNNEL_MODE" == "true" ]]; then
        if ! command -v ngrok &>/dev/null; then
            echo "Warning: ngrok not found in PATH. Skipping tunnel." >&2
            return 0
        fi

        # Kill any existing ngrok for this port
        if [[ -f "$TUNNEL_PID_FILE" ]]; then
            local old_pid
            old_pid="$(cat "$TUNNEL_PID_FILE")"
            kill "$old_pid" 2>/dev/null || true
            rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
        fi

        # Spawn ngrok
        nohup ngrok http "$selected_port" \
            --log=stdout \
            > "$STATE_DIR/ngrok.log" 2>&1 &
        local ngrok_pid=$!
        echo "$ngrok_pid" > "$TUNNEL_PID_FILE"

        # Poll ngrok API for tunnel URL (up to 10 seconds)
        local tunnel_url=""
        local t_attempts=0
        local t_max=20
        while [[ $t_attempts -lt $t_max ]]; do
            tunnel_url="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
                | grep -o '"public_url":"[^"]*"' \
                | head -1 \
                | cut -d'"' -f4 || true)"
            if [[ -n "$tunnel_url" ]]; then
                break
            fi
            sleep 0.5
            t_attempts=$((t_attempts + 1))
        done

        if [[ -n "$tunnel_url" ]]; then
            echo "$tunnel_url" > "$TUNNEL_URL_FILE"
            echo "Tunnel:    ${tunnel_url} (PID: ${ngrok_pid})"
            echo "Note: ngrok free tier shows an interstitial page on first visit."
            echo "      API calls should include 'ngrok-skip-browser-warning' header."
        else
            echo "Warning: ngrok started but tunnel URL not captured. Check $STATE_DIR/ngrok.log" >&2
        fi
    fi
}

do_stop() {
    if [[ ! -f "$PID_FILE" ]]; then
        echo "Dashboard is not running."
        return 0
    fi

    local pid
    pid="$(cat "$PID_FILE")"

    # Already dead?
    if ! kill -0 "$pid" 2>/dev/null; then
        clean_stale
        echo "Dashboard is not running (cleaned stale PID)."
        return 0
    fi

    # Stop tunnel if running
    if [[ -f "$TUNNEL_PID_FILE" ]]; then
        do_tunnel_stop
    fi

    # SIGTERM
    kill "$pid"

    # Wait up to 5 seconds
    local i
    for i in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
            break
        fi
        sleep 0.5
    done

    # Force kill if still alive
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
        echo "Warning: dashboard required SIGKILL." >&2
    fi

    clean_stale
    echo "Dashboard stopped."
}

do_status() {
    if [[ "$STATUS_ALL" == "true" ]]; then
        do_status_all
        return
    fi

    if ! is_running; then
        echo "Dashboard is not running."
        if [[ -f "$PID_FILE" ]]; then
            clean_stale
            echo "(Cleaned stale PID file.)"
        fi
        return 0
    fi

    local pid port root_path
    pid="$(cat "$PID_FILE")"
    port="$(cat "$PORT_FILE" 2>/dev/null || echo '?')"
    root_path="$(cat "$ROOT_FILE" 2>/dev/null || echo '?')"

    # Compute uptime from PID file mtime
    local now mtime seconds uptime_str
    now="$(date +%s)"
    mtime="$(stat -f %m "$PID_FILE" 2>/dev/null || stat -c %Y "$PID_FILE" 2>/dev/null || echo "$now")"
    seconds=$((now - mtime))
    uptime_str="$(format_uptime "$seconds")"

    echo "Spacedock Dashboard"
    echo "  Status:  running (PID ${pid})"
    echo "  URL:     http://127.0.0.1:${port}/"
    echo "  Root:    ${root_path}"
    echo "  Uptime:  ${uptime_str}"
    echo "  Log:     ${LOG_FILE}"
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
        found=true
        local dir_pid_file="$dir/pid"
        local dir_port_file="$dir/port"
        local dir_root_file="$dir/root"

        local proj_name="?"
        if [[ -f "$dir_root_file" ]]; then
            proj_name="$(basename "$(cat "$dir_root_file")")"
        fi

        if [[ -f "$dir_pid_file" ]]; then
            local pid
            pid="$(cat "$dir_pid_file")"
            if kill -0 "$pid" 2>/dev/null; then
                local port
                port="$(cat "$dir_port_file" 2>/dev/null || echo '?')"
                echo "  [running]  ${proj_name}  http://127.0.0.1:${port}/  PID ${pid}"
            else
                echo "  [stale]    ${proj_name}  PID file exists but process dead — cleaned up"
                rm -f "$dir_pid_file" "$dir_port_file" "$dir_root_file"
            fi
        fi
    done

    if [[ "$found" == "false" ]]; then
        echo "  No dashboard instances found."
    fi
}

do_logs() {
    if [[ ! -f "$LOG_FILE" ]]; then
        echo "No log file found at $LOG_FILE"
        return 0
    fi

    if [[ "$LOGS_FOLLOW" == "true" ]]; then
        tail -f "$LOG_FILE"
    else
        cat "$LOG_FILE"
    fi
}

do_restart() {
    do_stop
    do_start
}

# --- main dispatch ---

case "$CMD" in
    start)   do_start ;;
    stop)    do_stop ;;
    status)  do_status ;;
    logs)    do_logs ;;
    restart) do_restart ;;
    *)
        echo "Unknown command: $CMD" >&2
        usage >&2
        exit 1
        ;;
esac
