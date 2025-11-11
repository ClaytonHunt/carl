#!/bin/bash
# UserPromptSubmit Hook Example - Context Injection
#
# This hook validates prompts and injects additional context before Claude processes them.
#
# Usage: Called automatically when user submits a prompt
# Exit Codes:
#   0 - Allow prompt (stdout added to Claude's context)
#   2 - Block prompt (error shown to user, prompt erased)
#   Other - Non-blocking error

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Parse prompt information
USER_PROMPT=$(echo "$INPUT" | jq -r '.prompt')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')

# === Prompt Validation ===

# 1. Check for empty prompts
if [[ -z "$USER_PROMPT" ]] || [[ "$USER_PROMPT" == "null" ]]; then
  echo "ERROR: Empty prompt detected" >&2
  exit 2
fi

# 2. Optional: Block certain patterns (example)
# Uncomment to enable blocking specific patterns

# BLOCKED_PATTERNS=("rm -rf /" "delete everything" "format disk")
# for pattern in "${BLOCKED_PATTERNS[@]}"; do
#   if [[ "$USER_PROMPT" == *"$pattern"* ]]; then
#     echo "ERROR: Prompt contains blocked pattern: $pattern" >&2
#     echo "This operation is not allowed for safety reasons." >&2
#     exit 2
#   fi
# done

# === Context Injection ===

# 3. Detect prompt intent and inject relevant context
CONTEXT_INJECTED=false

# Check if asking about project structure
if [[ "$USER_PROMPT" =~ (project|structure|architecture|overview|explain.*project) ]]; then
  CONTEXT_INJECTED=true
  cat <<EOF

## Project Context (Auto-Injected)

### Project Structure
EOF

  # Inject project structure if available
  if [[ -f "${CLAUDE_PROJECT_DIR:-.}/.claude/context/project-structure.md" ]]; then
    cat "${CLAUDE_PROJECT_DIR:-.}/.claude/context/project-structure.md"
  else
    # Generate basic structure
    PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
    if command -v tree &> /dev/null; then
      tree -L 2 -I 'node_modules|.git' "$PROJECT_DIR" 2>/dev/null | head -50 || true
    fi
  fi
fi

# Check if asking about dependencies
if [[ "$USER_PROMPT" =~ (dependencies|packages|requirements|install) ]]; then
  CONTEXT_INJECTED=true
  cat <<EOF

## Dependencies Context (Auto-Injected)

EOF

  PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

  # Node.js project
  if [[ -f "$PROJECT_DIR/package.json" ]]; then
    echo "### package.json"
    jq '.dependencies, .devDependencies' "$PROJECT_DIR/package.json" 2>/dev/null || true
  fi

  # Python project
  if [[ -f "$PROJECT_DIR/requirements.txt" ]]; then
    echo "### requirements.txt"
    cat "$PROJECT_DIR/requirements.txt" | head -20
  fi
fi

# Check if asking about git/version control
if [[ "$USER_PROMPT" =~ (git|commit|branch|merge|pr|pull request) ]]; then
  CONTEXT_INJECTED=true
  cat <<EOF

## Git Context (Auto-Injected)

EOF

  PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
  if [[ -d "$PROJECT_DIR/.git" ]]; then
    cd "$PROJECT_DIR"

    echo "### Current Branch"
    git branch --show-current 2>/dev/null || echo "unknown"

    echo ""
    echo "### Recent Commits"
    git log --oneline -5 2>/dev/null || true

    echo ""
    echo "### Current Status"
    git status --short 2>/dev/null || true
  fi
fi

# Check if asking about testing
if [[ "$USER_PROMPT" =~ (test|testing|spec|jest|pytest|mocha) ]]; then
  CONTEXT_INJECTED=true
  cat <<EOF

## Testing Context (Auto-Injected)

EOF

  PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

  # Node.js testing
  if [[ -f "$PROJECT_DIR/package.json" ]]; then
    echo "### Test Scripts"
    jq '.scripts | with_entries(select(.key | contains("test")))' "$PROJECT_DIR/package.json" 2>/dev/null || true
  fi

  # Test file count
  if command -v find &> /dev/null; then
    TEST_COUNT=$(find "$PROJECT_DIR" -type f \( -name "*.test.*" -o -name "*.spec.*" \) 2>/dev/null | wc -l || echo "0")
    echo ""
    echo "Test files found: $TEST_COUNT"
  fi
fi

# === Environment Information ===

# 4. Always inject current environment info for certain keywords
if [[ "$USER_PROMPT" =~ (environment|env|config|settings|setup) ]]; then
  CONTEXT_INJECTED=true
  cat <<EOF

## Environment Information (Auto-Injected)

EOF

  # List environment variables (non-sensitive)
  echo "### Available Environment Variables"
  env | grep -E '^(NODE_|CARL_|PATH=)' | head -10 || true
fi

# === Load Custom Context Files ===

# 5. Check for custom context files based on keywords
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
CONTEXT_DIR="$PROJECT_DIR/.claude/context"

if [[ -d "$CONTEXT_DIR" ]]; then
  # Map keywords to context files
  declare -A CONTEXT_FILES=(
    ["api"]="api-reference.md"
    ["database"]="database-schema.md"
    ["deployment"]="deployment-guide.md"
    ["architecture"]="architecture.md"
  )

  for keyword in "${!CONTEXT_FILES[@]}"; do
    if [[ "$USER_PROMPT" =~ $keyword ]]; then
      CONTEXT_FILE="$CONTEXT_DIR/${CONTEXT_FILES[$keyword]}"
      if [[ -f "$CONTEXT_FILE" ]]; then
        CONTEXT_INJECTED=true
        echo ""
        echo "## ${CONTEXT_FILES[$keyword]} (Auto-Injected)"
        cat "$CONTEXT_FILE"
      fi
    fi
  done
fi

# === Optional: Advanced Decision Control ===

# 6. Return structured JSON for fine-grained control
# Uncomment to use JSON output instead of simple text

# if [[ "$CONTEXT_INJECTED" == true ]]; then
#   cat <<EOF
# {
#   "continue": true,
#   "systemMessage": "Additional context has been injected based on your prompt",
#   "hookSpecificOutput": {
#     "hookEventName": "UserPromptSubmit",
#     "additionalContext": "Context files loaded: [list files here]"
#   }
# }
# EOF
# fi

# === Logging ===

# 7. Log prompt for analytics (optional)
# LOG_FILE="$PROJECT_DIR/.claude/hooks/logs/prompts.log"
# mkdir -p "$(dirname "$LOG_FILE")"
# TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# PROMPT_PREVIEW=$(echo "$USER_PROMPT" | head -c 100)
# echo "[$TIMESTAMP] $SESSION_ID: $PROMPT_PREVIEW..." >> "$LOG_FILE"

# === Success ===
# If context was injected, the stdout above is added to Claude's context
# If no context injected, hook succeeds silently
exit 0
