#!/bin/bash
# SessionStart Hook Example - Environment Setup
#
# This hook sets up the development environment when a Claude Code session starts.
#
# Usage: Called automatically on session startup, resume, clear, or compact
# Exit Codes:
#   0 - Success (stdout added to Claude's context)
#   Other - Non-blocking error

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Parse session information
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
MATCHER=$(echo "$INPUT" | jq -r '.matcher // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# === Environment Setup ===

# 1. Load environment variables
if [[ -f "${CLAUDE_PROJECT_DIR:-.}/.env.development" ]]; then
  # Note: We can't source directly, but we can export via CLAUDE_ENV_FILE
  if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
    # Read .env.development and write to CLAUDE_ENV_FILE
    while IFS= read -r line; do
      # Skip comments and empty lines
      [[ "$line" =~ ^#.*$ ]] && continue
      [[ -z "$line" ]] && continue

      # Export variable
      echo "export $line" >> "$CLAUDE_ENV_FILE"
    done < "${CLAUDE_PROJECT_DIR:-.}/.env.development"

    echo "Loaded environment from .env.development"
  fi
fi

# 2. Set custom environment variables
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  cat >> "$CLAUDE_ENV_FILE" <<EOF
export NODE_ENV=development
export CARL_SESSION_ID=$SESSION_ID
export CARL_START_TIME=$(date +%s)
EOF
  echo "Set session environment variables"
fi

# === Dependency Checks ===

# 3. Check for required tools
REQUIRED_TOOLS=("node" "npm" "git" "jq")
MISSING_TOOLS=()

for tool in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "$tool" &> /dev/null; then
    MISSING_TOOLS+=("$tool")
  fi
done

if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
  echo "WARNING: Missing required tools: ${MISSING_TOOLS[*]}" >&2
  echo "Some operations may not work correctly." >&2
fi

# === Project Context Loading ===

# 4. Load project information
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PROJECT_NAME=$(basename "$PROJECT_DIR")

# Check if git repository
GIT_INFO=""
if [[ -d "$PROJECT_DIR/.git" ]]; then
  BRANCH=$(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo "unknown")
  COMMIT=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  GIT_INFO="Git branch: $BRANCH (commit: $COMMIT)"
fi

# Check package.json for Node projects
NPM_INFO=""
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if command -v jq &> /dev/null; then
    PKG_NAME=$(jq -r '.name // "unknown"' "$PROJECT_DIR/package.json" 2>/dev/null || echo "unknown")
    PKG_VERSION=$(jq -r '.version // "unknown"' "$PROJECT_DIR/package.json" 2>/dev/null || echo "unknown")
    NPM_INFO="Package: $PKG_NAME@$PKG_VERSION"
  fi
fi

# === Context Output for Claude ===

# 5. Provide context to Claude (stdout is added to context)
cat <<EOF
# Session Started: $MATCHER

## Project Information
- Project: $PROJECT_NAME
- Directory: $PROJECT_DIR
- Session ID: $SESSION_ID
$(if [[ -n "$GIT_INFO" ]]; then echo "- $GIT_INFO"; fi)
$(if [[ -n "$NPM_INFO" ]]; then echo "- $NPM_INFO"; fi)

## Environment Ready
Development environment initialized successfully.
$(if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then echo "Note: Missing tools - ${MISSING_TOOLS[*]}"; fi)

---
EOF

# === Optional: Session-Specific Setup ===

case "$MATCHER" in
  startup)
    # First-time session startup
    echo "First session startup - performing initial setup"

    # Check for updates
    # if [[ -f "$PROJECT_DIR/package.json" ]]; then
    #   cd "$PROJECT_DIR"
    #   npm outdated 2>&1 | head -10 || true
    # fi
    ;;

  resume)
    # Resuming previous session
    echo "Session resumed - previous session: $SESSION_ID"
    ;;

  clear)
    # Session cleared
    echo "Session cleared - starting fresh"
    ;;

  compact)
    # After compact operation
    echo "Session compacted - context refreshed"
    ;;
esac

# === Optional: Load Project-Specific Context ===

# 6. Load additional context from files
if [[ -f "$PROJECT_DIR/.claude/context/session-start.md" ]]; then
  echo ""
  echo "## Additional Context"
  cat "$PROJECT_DIR/.claude/context/session-start.md"
fi

# === Logging ===

# 7. Log session start
LOG_FILE="$PROJECT_DIR/.claude/hooks/logs/sessions.log"
mkdir -p "$(dirname "$LOG_FILE")"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[$TIMESTAMP] Session started: $SESSION_ID (matcher: $MATCHER)" >> "$LOG_FILE"

# === Success ===
exit 0
