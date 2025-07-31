#!/bin/bash

# CARL Session Start Hook
# Automatically loads CARL context and initializes audio system when Claude Code starts

set -e

# Source CARL helper functions
CARL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$CARL_ROOT/.carl/scripts/carl-helpers.sh"
source "$CARL_ROOT/.carl/scripts/carl-audio.sh"

# Initialize CARL session
echo "🤖 Starting CARL (Context-Aware Requirements Language) system..."

# Check if CARL is initialized in this project
if [ ! -d "$CARL_ROOT/.carl/project" ]; then
    echo "ℹ️  CARL not initialized in this project."
    echo "📋 Use /analyze to scan existing project or /plan to create new requirements."
    carl_play_audio "start" "Hi there! Looks like CARL hasn't been set up yet. Ready to analyze your project?"
    exit 0
fi

# Load CARL context for AI
echo "📊 Loading CARL project context..."

# Load CARL project context from modern structure
if [ -f "$CARL_ROOT/.carl/project/vision.carl" ]; then
    echo "🔍 CARL Project Vision Available:"
    echo "----------------------------------------"
    head -n 10 "$CARL_ROOT/.carl/project/vision.carl"
    echo "----------------------------------------"
    echo ""
elif [ -f "$CARL_ROOT/.carl/project/roadmap.carl" ]; then
    echo "🔍 CARL Project Context Available:"
    echo "----------------------------------------"
    head -n 10 "$CARL_ROOT/.carl/project/roadmap.carl"
    echo "----------------------------------------"
    echo ""
fi

# Load active session context if exists
if [ -f "$CARL_ROOT/.carl/sessions/current.session" ]; then
    echo "🔄 Resuming previous CARL session..."
    echo "Session Context:"
    echo "----------------------------------------"
    head -n 10 "$CARL_ROOT/.carl/sessions/current.session"
    echo "----------------------------------------"
    echo ""
fi

# Display project health summary
echo "📈 CARL Project Health Summary:"
echo "----------------------------------------"

# Count CARL files for health assessment using modern structure
intent_count=$(find "$CARL_ROOT/.carl/project" -name "*.intent.carl" 2>/dev/null | wc -l || echo "0")
state_count=$(find "$CARL_ROOT/.carl/project" -name "*.state.carl" 2>/dev/null | wc -l || echo "0")
context_count=$(find "$CARL_ROOT/.carl/project" -name "*.context.carl" 2>/dev/null | wc -l || echo "0")

echo "📋 Intent Files: $intent_count (Requirements and features)"
echo "📊 State Files: $state_count (Implementation progress)"
echo "🔗 Context Files: $context_count (System relationships)"

# Check for recent activity
recent_updates=$(find "$CARL_ROOT/.carl/project" -name "*.intent.carl" -o -name "*.state.carl" -o -name "*.context.carl" -newer "$CARL_ROOT/.carl/project" 2>/dev/null | wc -l || echo "0")
if [ "$recent_updates" -gt 0 ]; then
    echo "⚠️  $recent_updates CARL files have been recently updated"
    echo "💡 Project context is actively maintained"
fi

echo "----------------------------------------"

# Play welcome audio
project_name=$(basename "$CARL_ROOT")
if [ "$intent_count" -gt 0 ]; then
    carl_play_audio "start" "Hey there! CARL is ready to help with $project_name. I can see you have $intent_count features to work with!"
else
    carl_play_audio "start" "Hello! CARL is starting up for $project_name. Ready to make some progress!"
fi

# Provide helpful command suggestions
echo "🚀 Quick CARL Commands:"
echo "  /status     - View project progress and health"
echo "  /plan       - Create or update feature plans"
echo "  /task       - Work on implementation with CARL context"  
echo "  /analyze    - Refresh CARL context from codebase"
echo "  /settings   - Configure CARL behavior and audio"
echo ""

# Create new session record
session_id=$(date +%Y%m%d_%H%M%S)
session_file="$CARL_ROOT/.carl/sessions/${session_id}.session"

cat > "$session_file" << EOF
session_id: $session_id
session_type: development
start_time: $(date -Iseconds)
project_context:
  intent_files: $intent_count
  state_files: $state_count
  context_files: $context_count
  recent_updates: $recent_updates
EOF

# Update current session symlink
ln -sf "$session_file" "$CARL_ROOT/.carl/sessions/current.session"

echo "✨ CARL is ready! Context loaded and session $session_id initialized."