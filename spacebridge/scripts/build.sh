#!/usr/bin/env bash
# spacebridge/scripts/build.sh
# ABOUTME: Build script for spacebridge standalone distribution.
# Runs Next.js build with output:standalone, copies static/public assets,
# and validates the output. Entity 049 V4-V5 proved this exact sequence.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SPACEBRIDGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Step 1: Validate prerequisites ─────────────────────────────────────────

echo "[build] Validating prerequisites..."

if ! bun --version > /dev/null 2>&1; then
  echo "[build] ERROR: bun is not installed or not on PATH" >&2
  exit 1
fi

if [ ! -f "$SPACEBRIDGE_ROOT/ui/next.config.mjs" ]; then
  echo "[build] ERROR: ui/next.config.mjs not found — is entity 053 executed?" >&2
  exit 1
fi

if [ ! -d "$SPACEBRIDGE_ROOT/ui/node_modules" ]; then
  echo "[build] ui/node_modules not found — running bun install..."
  cd "$SPACEBRIDGE_ROOT/ui" && bun install
fi

# ─── Step 2: Run Next.js build ───────────────────────────────────────────────

echo "[build] Running Next.js standalone build..."
cd "$SPACEBRIDGE_ROOT/ui" && bun run --bun next build

# ─── Step 3: Post-build static/public copy ───────────────────────────────────
# Required for Next.js standalone asset serving (entity 049 V4-V5, A-5 confirmed).

echo "[build] Copying static assets into standalone directory..."
cp -r "$SPACEBRIDGE_ROOT/ui/.next/static" "$SPACEBRIDGE_ROOT/ui/.next/standalone/.next/static"

if [ -d "$SPACEBRIDGE_ROOT/ui/public" ] && [ "$(ls -A "$SPACEBRIDGE_ROOT/ui/public" 2>/dev/null)" ]; then
  cp -r "$SPACEBRIDGE_ROOT/ui/public" "$SPACEBRIDGE_ROOT/ui/.next/standalone/public"
fi

# ─── Step 4: Validate output ─────────────────────────────────────────────────

echo "[build] Validating output..."

SERVER_JS="$SPACEBRIDGE_ROOT/ui/.next/standalone/ui/server.js"
if [ ! -f "$SERVER_JS" ]; then
  echo "[build] ERROR: server.js not found at $SERVER_JS" >&2
  exit 1
fi

STATIC_DIR="$SPACEBRIDGE_ROOT/ui/.next/standalone/.next/static"
if [ ! -d "$STATIC_DIR" ]; then
  echo "[build] ERROR: static dir not found at $STATIC_DIR" >&2
  exit 1
fi

STANDALONE_DIR="$SPACEBRIDGE_ROOT/ui/.next/standalone"
echo "[build] SUCCESS: standalone distribution ready at $STANDALONE_DIR"
echo "[build] Run with: bun run $SERVER_JS"
