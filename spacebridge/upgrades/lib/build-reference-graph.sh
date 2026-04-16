#!/usr/bin/env bash
# build-reference-graph.sh — reverse-lookup reference file → consumer skills/agents
#
# Usage:
#   build-reference-graph.sh                         # all references in repo
#   build-reference-graph.sh <ref-path> [<ref-path>] # specific references
#   build-reference-graph.sh --json                  # JSON output
#
# Scans SKILL.md + agents/*.md for mentions of reference filenames.
# Consumer = any skill/agent file that grep-hits the reference basename.
#
# Limitations:
#   - Basename match only (doesn't distinguish same name in different dirs)
#   - Does NOT follow transitive refs (A loads B; B mentions C → C's consumer is B, not A)
#   - Doesn't parse frontmatter `reference:` fields — pure grep

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

JSON=false
REFS=()
for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    *) REFS+=("$arg") ;;
  esac
done

# If no refs given, scan all under references/ and skills/*/references/
if [ "${#REFS[@]}" -eq 0 ]; then
  while IFS= read -r f; do
    REFS+=("$f")
  done < <(find references skills -type f -name "*.md" -path "*/references/*" 2>/dev/null; find references -type f -name "*.md" 2>/dev/null)
  # dedupe
  mapfile -t REFS < <(printf '%s\n' "${REFS[@]}" | sort -u)
fi

# Scan targets: all SKILL.md + all agents/*.md
mapfile -t SCAN_TARGETS < <(
  find skills -name SKILL.md -type f 2>/dev/null
  find agents -name "*.md" -type f 2>/dev/null
)

if $JSON; then
  echo "{"
  echo "  \"references\": {"
fi

FIRST=true
for ref in "${REFS[@]}"; do
  base="$(basename "$ref")"
  stem="${base%.md}"
  consumers=()

  for target in "${SCAN_TARGETS[@]}"; do
    # Match basename OR stem (allow reference without .md suffix)
    if grep -qE "($base|$stem)" "$target" 2>/dev/null; then
      consumers+=("$target")
    fi
  done

  if $JSON; then
    $FIRST || echo ","
    FIRST=false
    printf '    "%s": [' "$ref"
    if [ "${#consumers[@]}" -gt 0 ]; then
      printf '\n'
      for i in "${!consumers[@]}"; do
        printf '      "%s"' "${consumers[$i]}"
        [ "$i" -lt "$((${#consumers[@]} - 1))" ] && printf ','
        printf '\n'
      done
      printf '    '
    fi
    printf ']'
  else
    echo "== $ref"
    if [ "${#consumers[@]}" -eq 0 ]; then
      echo "  (no consumers found — orphan or referenced by non-standard path)"
    else
      for c in "${consumers[@]}"; do
        echo "  -> $c"
      done
    fi
  fi
done

if $JSON; then
  echo
  echo "  }"
  echo "}"
fi
