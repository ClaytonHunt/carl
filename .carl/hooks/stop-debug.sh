#!/bin/bash

# Debug version of stop hook to diagnose Claude Code issues

echo "=== STOP HOOK DEBUG ===" >&2
echo "Script: $0" >&2
echo "CLAUDE_PROJECT_DIR: ${CLAUDE_PROJECT_DIR:-'NOT SET'}" >&2
echo "PWD: $(pwd)" >&2
echo "BASH_SOURCE: ${BASH_SOURCE[0]}" >&2
echo "Script dir: $(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" >&2

# Try to source the actual stop hook
ACTUAL_HOOK="/home/clayton/projects/carl/.carl/hooks/stop.sh"
if [[ -f "$ACTUAL_HOOK" ]]; then
    echo "Found stop.sh at: $ACTUAL_HOOK" >&2
    source "$ACTUAL_HOOK"
else
    echo "ERROR: Could not find stop.sh at expected location" >&2
    exit 1
fi