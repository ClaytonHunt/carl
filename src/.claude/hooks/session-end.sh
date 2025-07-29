#!/bin/bash

# CARL Session End Hook
# Saves CARL session state and provides development session summary

CARL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Source CARL session manager (primary) and helper functions
source "$CARL_ROOT/.carl/scripts/carl-session-manager.sh" 2>/dev/null || true
source "$CARL_ROOT/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
source "$CARL_ROOT/.carl/scripts/carl-audio.sh" 2>/dev/null || true

echo "💾 Saving CARL session state..."

# Use the proper session manager to end the session
if [ -f "$CARL_ROOT/.carl/sessions/current.session" ]; then
    # End session using session manager (this handles metrics safely)
    carl_end_session
    echo "✅ Session ended and archived successfully"
else
    echo "⚠️  No active session found to save"
fi

# Generate and display session summary
echo ""
echo "📊 CARL Development Session Summary"
echo "=========================================="

# Get session context from session manager
session_context=$(carl_get_session_context 2>/dev/null || echo "")
if [ -n "$session_context" ]; then
    echo "$session_context"
else
    # Fallback to basic summary if session manager unavailable
    session_duration=$(carl_calculate_session_duration 2>/dev/null || echo "unknown")
    echo "⏱️  Session Duration: $session_duration"
    
    # Code changes summary using sanitized functions
    files_modified=$(carl_count_modified_files 2>/dev/null || echo "0")
    lines_added=$(carl_count_added_lines 2>/dev/null || echo "0")
    lines_removed=$(carl_count_removed_lines 2>/dev/null || echo "0")
    
    # Sanitize these variables just in case
    files_modified=$(echo "$files_modified" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0")
    lines_added=$(echo "$lines_added" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0")
    lines_removed=$(echo "$lines_removed" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0")
    
    if [ "$files_modified" -gt 0 ] 2>/dev/null; then
        echo "📝 Code Changes:"
        echo "   Files Modified: $files_modified"
        echo "   Lines Added: +$lines_added"
        echo "   Lines Removed: -$lines_removed"
    fi
    
    # CARL file updates
    carl_files_updated=$(find "$CARL_ROOT/.carl" -name "*.intent.carl" -o -name "*.state.carl" -o -name "*.context.carl" 2>/dev/null | wc -l || echo "0")
    carl_files_updated=$(echo "$carl_files_updated" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0")
    if [ "$carl_files_updated" -gt 0 ] 2>/dev/null; then
        echo "📋 CARL Files Available: $carl_files_updated"
    fi
fi

echo "=========================================="

# Update CARL index with session information (safely)
carl_update_index_with_session_data

# Play farewell audio with session context
project_name=$(basename "$CARL_ROOT")

# Get safe metrics for audio message (these are now sanitized)
files_modified=$(carl_count_modified_files 2>/dev/null || echo "0")
files_modified=$(echo "$files_modified" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0")

# Simple audio message that doesn't rely on potentially problematic variables
if [ "$files_modified" -gt 0 ] 2>/dev/null; then
    carl_play_audio "end" "Good work today on $project_name! CARL is tracking your progress perfectly!"
else
    carl_play_audio "end" "Thanks for the session! CARL has saved all your context for next time. See you later!"
fi

# Clean up old session files (using session manager if available)
if command -v carl_cleanup_old_sessions >/dev/null 2>&1; then
    carl_cleanup_old_sessions
else
    # Fallback cleanup
    find "$CARL_ROOT/.carl/sessions" -name "*.session.carl" -type f -mtime +7 -delete 2>/dev/null || true
fi

echo "👋 CARL session ended. Context saved for seamless continuation!"
echo ""