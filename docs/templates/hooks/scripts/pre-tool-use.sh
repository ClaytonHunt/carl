#!/bin/bash
# PreToolUse Hook Example - File Write Validation
#
# This hook validates file write operations for security and policy compliance.
#
# Usage: Called automatically before Write/Edit tool execution
# Exit Codes:
#   0 - Allow operation
#   2 - Block operation (error sent to Claude)
#   Other - Non-blocking error

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Exit if not a file operation
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# === Security Validations ===

# 1. Block path traversal attempts
if [[ "$FILE_PATH" == *".."* ]]; then
  echo "ERROR: Path traversal attempt blocked - file path contains '..'" >&2
  echo "Requested path: $FILE_PATH" >&2
  exit 2
fi

# 2. Block writes to sensitive files
SENSITIVE_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  ".git/config"
  "id_rsa"
  "id_ed25519"
  ".pem"
  "credentials.json"
  "secrets."
  ".password"
  ".key"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "ERROR: Cannot modify sensitive file matching pattern: $pattern" >&2
    echo "Requested path: $FILE_PATH" >&2
    echo "This file type is blocked by security policy." >&2
    exit 2
  fi
done

# 3. Validate file is within project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
REAL_PROJECT_DIR=$(realpath "$PROJECT_DIR" 2>/dev/null || echo "$PROJECT_DIR")
FILE_DIR=$(dirname "$FILE_PATH")
REAL_FILE_DIR=$(realpath "$FILE_DIR" 2>/dev/null || echo "$FILE_DIR")

if [[ "$REAL_FILE_DIR" != "$REAL_PROJECT_DIR"* ]]; then
  echo "WARNING: File is outside project directory" >&2
  echo "Project: $REAL_PROJECT_DIR" >&2
  echo "File: $REAL_FILE_DIR" >&2
  # Non-blocking warning (exit 1), continues with user awareness
  exit 1
fi

# === Optional: Advanced Decision Control ===
# Uncomment to use structured JSON output for fine-grained control

# Allow operation with confirmation for certain file types
# if [[ "$FILE_PATH" == *".config."* ]]; then
#   cat <<EOF
# {
#   "continue": true,
#   "hookSpecificOutput": {
#     "hookEventName": "PreToolUse",
#     "permissionDecision": "ask",
#     "permissionDecisionReason": "Configuration file - please confirm changes"
#   }
# }
# EOF
#   exit 0
# fi

# Auto-approve operation with modified input (example)
# if [[ "$FILE_PATH" == *".md" ]]; then
#   cat <<EOF
# {
#   "continue": true,
#   "systemMessage": "Markdown file write approved automatically",
#   "hookSpecificOutput": {
#     "hookEventName": "PreToolUse",
#     "permissionDecision": "allow"
#   }
# }
# EOF
#   exit 0
# fi

# === Success ===
# All validations passed - allow operation
echo "File write validation passed: $FILE_PATH"
exit 0
