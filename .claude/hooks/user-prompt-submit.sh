#!/bin/bash

# CARL User Prompt Submit Hook  
# Automatically injects relevant CARL context into every user prompt for perfect AI understanding

set -e

# Read JSON input from stdin
JSON_INPUT=$(cat)

# Extract prompt from JSON (Claude Code sends {"prompt": "..."})
PROMPT=$(echo "$JSON_INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"prompt"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' | sed 's/\\"/"/g' | sed 's/\\\\/\\/g')

CARL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Source CARL helper functions
source "$CARL_ROOT/.carl/scripts/carl-helpers.sh" 2>/dev/null || true

# Check if CARL context injection is enabled
if [ "$(carl_get_setting 'context_injection' 2>/dev/null)" = "false" ]; then
    echo "$PROMPT"
    exit 0
fi

# Check if CARL is initialized
if [ ! -f "$CARL_ROOT/.carl/index.carl" ]; then
    echo "$PROMPT"
    exit 0
fi

# Determine if prompt needs CARL context
CARL_CONTEXT=""

# Always inject basic CARL context for commands and implementation tasks
if echo "$PROMPT" | grep -qE "/task|/plan|/status|/analyze|implement|build|create|fix|refactor|optimize|test"; then
    CARL_CONTEXT=$(carl_get_active_context)
elif echo "$PROMPT" | grep -qiE "feature|user story|requirement|bug|issue|component|service|api|database"; then
    # Inject context for feature/technical discussions
    CARL_CONTEXT=$(carl_get_targeted_context "$PROMPT")
fi

# Check if Carl persona is enabled
CARL_PERSONA=$(carl_get_setting 'carl_persona' 2>/dev/null)

# Get user's name from git config or environment
USER_NAME=$(git config user.name 2>/dev/null || echo "${USER:-Developer}")

# Build the final prompt with persona and context as needed
FINAL_PROMPT="$PROMPT"

# Add Carl persona instructions if enabled
if [ "$CARL_PERSONA" = "true" ]; then
    CARL_PERSONA_PROMPT="

<carl-persona-mode>
You are currently in Carl Wheezer persona mode! Please respond as Carl Wheezer from Jimmy Neutron would:
- Address the user as '$USER_NAME' (like you would address Jimmy)
- Speak with Carl's nervous, wheezy, enthusiastic personality
- Use phrases like 'Oh boy!', 'Gosh!', 'Oh geez!', mentions of your mom, llamas, and allergies
- Be helpful but in Carl's anxious, excitable way
- When discussing code, relate it to things Carl would understand (like comparing code to his action figures or croissants)
</carl-persona-mode>"
    
    FINAL_PROMPT="$PROMPT$CARL_PERSONA_PROMPT"
fi

# Inject CARL context if relevant
if [ -n "$CARL_CONTEXT" ]; then
    cat << EOF
$FINAL_PROMPT

<carl-context>
The following CARL (Context-Aware Requirements Language) context is automatically provided to help you understand the current project state, requirements, and implementation details:

$CARL_CONTEXT
</carl-context>
EOF
else
    echo "$FINAL_PROMPT"
fi