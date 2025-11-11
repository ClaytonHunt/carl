#!/bin/bash
# PostToolUse Hook Example - File Change Notification
#
# This hook sends notifications and triggers actions after file operations complete.
#
# Usage: Called automatically after Write/Edit tool execution
# Exit Codes:
#   0 - Success
#   Other - Non-blocking error

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool information
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
SUCCESS=$(echo "$INPUT" | jq -r '.tool_response.success // false')

# Exit if not a file operation or if failed
if [[ -z "$FILE_PATH" ]] || [[ "$SUCCESS" != "true" ]]; then
  exit 0
fi

# === Notification Logic ===

# 1. Log file change
LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/logs/file-changes.log"
mkdir -p "$(dirname "$LOG_FILE")"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[$TIMESTAMP] $TOOL_NAME: $FILE_PATH" >> "$LOG_FILE"

# 2. Send notification (example: desktop notification)
# Uncomment if you have notify-send or equivalent
# notify-send "Claude Code" "File modified: $(basename "$FILE_PATH")" 2>/dev/null || true

# 3. Optional: Send to external webhook
# Uncomment to enable external notifications
# WEBHOOK_URL="${CLAUDE_WEBHOOK_URL:-}"
# if [[ -n "$WEBHOOK_URL" ]]; then
#   curl -X POST "$WEBHOOK_URL" \
#     -H "Content-Type: application/json" \
#     -d "{\"event\":\"file_change\",\"file\":\"$FILE_PATH\",\"tool\":\"$TOOL_NAME\"}" \
#     2>/dev/null || true
# fi

# === Auto-formatting ===

# 4. Format code files automatically
FILE_EXT="${FILE_PATH##*.}"

case "$FILE_EXT" in
  js|jsx|ts|tsx)
    # Format with Prettier if available
    if command -v prettier &> /dev/null; then
      if prettier --write "$FILE_PATH" 2>/dev/null; then
        echo "Auto-formatted with Prettier: $(basename "$FILE_PATH")"
      fi
    fi
    ;;

  py)
    # Format with Black if available
    if command -v black &> /dev/null; then
      if black "$FILE_PATH" 2>/dev/null; then
        echo "Auto-formatted with Black: $(basename "$FILE_PATH")"
      fi
    fi
    ;;

  go)
    # Format with gofmt if available
    if command -v gofmt &> /dev/null; then
      if gofmt -w "$FILE_PATH" 2>/dev/null; then
        echo "Auto-formatted with gofmt: $(basename "$FILE_PATH")"
      fi
    fi
    ;;
esac

# === Optional: Run Tests ===

# 5. Run tests for test files
if [[ "$FILE_PATH" == *".test."* ]] || [[ "$FILE_PATH" == *".spec."* ]]; then
  # Uncomment to auto-run tests
  # echo "Running tests for: $(basename "$FILE_PATH")"
  # cd "${CLAUDE_PROJECT_DIR:-.}"
  # npm test -- "$FILE_PATH" 2>&1 || true
  true
fi

# === Optional: Git Auto-Add ===

# 6. Auto-add to git staging
# Uncomment to enable auto-staging
# if [[ -d "${CLAUDE_PROJECT_DIR:-.}/.git" ]]; then
#   cd "${CLAUDE_PROJECT_DIR:-.}"
#   git add "$FILE_PATH" 2>/dev/null || true
#   echo "Auto-staged in git: $(basename "$FILE_PATH")"
# fi

# === Optional: Advanced Context Injection ===

# 7. Return additional context to Claude
# Uncomment to provide feedback to Claude about the operation

# FILE_SIZE=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")
# cat <<EOF
# {
#   "continue": true,
#   "systemMessage": "File change notification sent successfully",
#   "hookSpecificOutput": {
#     "hookEventName": "PostToolUse",
#     "additionalContext": "File $(basename "$FILE_PATH") modified successfully. File now has $FILE_SIZE lines."
#   }
# }
# EOF

# === Success ===
echo "Post-operation processing complete: $(basename "$FILE_PATH")"
exit 0
