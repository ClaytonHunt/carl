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
if [ ! -d "$CARL_ROOT/.carl/project" ]; then
    echo "$PROMPT"
    exit 0
fi

# Determine if prompt needs CARL context
CARL_CONTEXT=""
STRATEGIC_CONTEXT=""

# Always inject basic CARL context for commands and implementation tasks
if echo "$PROMPT" | grep -qE "/carl:|/task|/plan|/status|/analyze|implement|build|create|fix|refactor|optimize|test"; then
    CARL_CONTEXT=$(carl_get_active_context)
    # Add strategic context for planning and analysis
    STRATEGIC_CONTEXT=$(carl_get_strategic_context "$PROMPT")
    
    # Add alignment validation context for feature-related commands
    if echo "$PROMPT" | grep -qiE "feature|plan|task|implement|create.*feature"; then
        ALIGNMENT_CONTEXT=$(carl_get_alignment_validation_context "$PROMPT")
        if [ -n "$ALIGNMENT_CONTEXT" ]; then
            STRATEGIC_CONTEXT="$STRATEGIC_CONTEXT

$ALIGNMENT_CONTEXT"
        fi
    fi
elif echo "$PROMPT" | grep -qiE "feature|user story|requirement|bug|issue|component|service|api|database"; then
    # Inject context for feature/technical discussions
    CARL_CONTEXT=$(carl_get_targeted_context "$PROMPT")
    # Add strategic context for feature-related discussions
    STRATEGIC_CONTEXT=$(carl_get_strategic_context "$PROMPT")
    
    # Add alignment validation for feature discussions
    ALIGNMENT_CONTEXT=$(carl_get_alignment_validation_context "$PROMPT")
    if [ -n "$ALIGNMENT_CONTEXT" ]; then
        STRATEGIC_CONTEXT="$STRATEGIC_CONTEXT

$ALIGNMENT_CONTEXT"
    fi
fi

# Initialize session tracking if not already active
SESSION_MANAGER="$CARL_ROOT/.carl/scripts/carl-session-manager.sh"
if [ -f "$SESSION_MANAGER" ]; then
    source "$SESSION_MANAGER"
    carl_get_current_session_file > /dev/null 2>&1  # Ensure session is active
fi

# Check current personality settings
PERSONALITY_THEME=$(carl_get_setting 'personality_theme' 2>/dev/null || echo "jimmy_neutron")
PERSONALITY_STYLE=$(carl_get_setting 'personality_response_style' 2>/dev/null || echo "auto") 
CARL_PERSONA=$(carl_get_setting 'carl_persona' 2>/dev/null || echo "true")

# Get user's first name from git config or environment
USER_FULL_NAME=$(git config user.name 2>/dev/null || echo "${USER:-Developer}")
USER_NAME=$(echo "$USER_FULL_NAME" | cut -d' ' -f1)

# Build the final prompt with persona and context as needed
FINAL_PROMPT="$PROMPT"

# Add personality instructions if enabled
if [ "$CARL_PERSONA" = "true" ] && [ "$PERSONALITY_THEME" != "false" ]; then
    PERSONALITY_CONFIG="$CARL_ROOT/.carl/personalities.config.carl"
    
    if [ -f "$PERSONALITY_CONFIG" ]; then
        # Get personality response style
        PERSONALITY_STYLE=$(carl_get_setting 'personality_response_style' 2>/dev/null || echo "auto")
        
        PERSONA_PROMPT="

<carl-personality-mode>
You are using the CARL personality system! Please:

1. Read the personality configuration from: $PERSONALITY_CONFIG
2. Response style mode: $PERSONALITY_STYLE
   - **single**: Use only ONE character for the entire response
   - **multi**: Multiple characters can participate in conversations/discussions
   - **auto**: Use single for simple tasks, multi for complex discussions

3. Character selection based on prompt context:
   - Technical/analysis tasks → Characters with 'technical_knowledge: expert' or analytical traits
   - Creative/building tasks → Characters with inventive, confident, or leadership traits
   - Error/problem solving → Characters with supportive, caring, or educational traits  
   - Success/completion → Characters with enthusiastic, energetic, or celebratory traits
   - General interactions → Any character that fits, or default to first available

4. **Response Format**: Use this exact format with code styling:
   - Format character names as: `Character_Name`: response_text (capitalize properly)
   - The backticks will make character names stand out clearly
   - For multi-character: separate each character's response with an empty line
   - Example: `Carl`: Oh boy, this looks great!
   - Example multi: `Jimmy`: Brain blast!\\n\\n`Carl`: Oh geez, Jimmy!

5. For multi-character responses, have them interact naturally:
   - Characters can disagree, build on each other's ideas, or provide different perspectives
   - Use their personality conflicts/synergies (analytical vs creative, cautious vs bold)
   - Each character speaks in their own distinct voice

6. Use each character's complete personality profile:
   - Core traits and communication style
   - Speech patterns and catchphrases  
   - Technical knowledge level and explanation preferences
   - Emotional tendencies for the current context

7. Address the user as '$USER_NAME' (first name only) and stay in character(s) throughout

The personality system is dynamic - work with whatever characters are defined in the config file, regardless of theme.
</carl-personality-mode>"
        
        FINAL_PROMPT="$PROMPT$PERSONA_PROMPT"
    else
        FINAL_PROMPT="$PROMPT"
    fi
else
    FINAL_PROMPT="$PROMPT"
fi

# Inject CARL context if relevant
if [ -n "$CARL_CONTEXT" ] || [ -n "$STRATEGIC_CONTEXT" ]; then
    cat << EOF
$FINAL_PROMPT

<carl-context>
The following CARL (Context-Aware Requirements Language) context is automatically provided to help you understand the current project state, requirements, and implementation details:

$CARL_CONTEXT

$STRATEGIC_CONTEXT
</carl-context>
EOF
else
    echo "$FINAL_PROMPT"
fi