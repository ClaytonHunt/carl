#!/bin/bash

# CARL Session End Hook
# Saves CARL session state and provides development session summary

set -e

CARL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Source CARL helper functions
source "$CARL_ROOT/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
source "$CARL_ROOT/.carl/scripts/carl-audio.sh" 2>/dev/null || true

echo "💾 Saving CARL session state..."

# Update session with end time and summary
if [ -f "$CARL_ROOT/.carl/sessions/current.session" ]; then
    current_session="$CARL_ROOT/.carl/sessions/current.session"
    session_file=$(readlink "$current_session" 2>/dev/null || echo "$current_session")
    
    # Append session end information
    cat >> "$session_file" << EOF

# Session End Summary
end_time: $(date -Iseconds)
session_duration: $(carl_calculate_session_duration)
activities_completed:
$(carl_get_session_activities | sed 's/^/  - /')

progress_made:
$(carl_get_session_progress | sed 's/^/  - /')

code_changes:
  files_modified: $(carl_count_modified_files)
  lines_added: $(carl_count_added_lines)
  lines_removed: $(carl_count_removed_lines)

milestones_achieved:
$(carl_get_session_milestones | sed 's/^/  - /')

next_session_recommendations:
$(carl_generate_next_session_recommendations | sed 's/^/  - /')
EOF

    echo "✅ Session state saved to $(basename "$session_file")"
else
    echo "⚠️  No active session found to save"
fi

# Generate and display session summary
echo ""
echo "📊 CARL Development Session Summary"
echo "=========================================="

# Session duration and basic stats
session_duration=$(carl_calculate_session_duration 2>/dev/null || echo "unknown")
echo "⏱️  Session Duration: $session_duration"

# Code changes summary
files_modified=$(carl_count_modified_files 2>/dev/null || echo "0")
lines_added=$(carl_count_added_lines 2>/dev/null || echo "0")
lines_removed=$(carl_count_removed_lines 2>/dev/null || echo "0")

if [ "$files_modified" -gt 0 ]; then
    echo "📝 Code Changes:"
    echo "   Files Modified: $files_modified"
    echo "   Lines Added: +$lines_added"
    echo "   Lines Removed: -$lines_removed"
fi

# Progress and achievements
activities_count=$(carl_get_session_activities 2>/dev/null | wc -l || echo "0")
milestones_count=$(carl_get_session_milestones 2>/dev/null | wc -l || echo "0")

if [ "$activities_count" -gt 0 ]; then
    echo "🎯 Activities Completed: $activities_count"
fi

if [ "$milestones_count" -gt 0 ]; then
    echo "🏆 Milestones Achieved: $milestones_count"
    echo "   $(carl_get_session_milestones 2>/dev/null | head -3 | sed 's/^/   • /')"
fi

# CARL file updates
carl_files_updated=$(find "$CARL_ROOT/.carl" -name "*.intent" -o -name "*.state" -o -name "*.context" -newer "$CARL_ROOT/.carl/sessions/current.session" 2>/dev/null | wc -l || echo "0")
if [ "$carl_files_updated" -gt 0 ]; then
    echo "📋 CARL Files Updated: $carl_files_updated"
fi

# Quality metrics if available
test_results=$(carl_get_latest_test_results 2>/dev/null || echo "")
if [ -n "$test_results" ]; then
    echo "🧪 Latest Test Results: $test_results"
fi

# Next session recommendations
echo ""
echo "💡 Recommendations for Next Session:"
recommendations=$(carl_generate_next_session_recommendations 2>/dev/null || echo "• Continue current development work")
echo "$recommendations" | sed 's/^/   /'

echo "=========================================="

# Update CARL index with session information
carl_update_index_with_session_data

# Play farewell audio with session context
project_name=$(basename "$CARL_ROOT")

if [ "$milestones_count" -gt 0 ]; then
    carl_play_audio "end" "Excellent work today on $project_name! You achieved $milestones_count milestones. CARL has everything saved for next time!"
elif [ "$files_modified" -gt 0 ]; then
    carl_play_audio "end" "Good work today! You modified $files_modified files. CARL is tracking your progress perfectly!"
else
    carl_play_audio "end" "Thanks for the session! CARL has saved all your context for next time. See you later!"
fi

# Clean up temporary session files older than 7 days
find "$CARL_ROOT/.carl/sessions" -name "*.session" -type f -mtime +7 -delete 2>/dev/null || true

echo "👋 CARL session ended. Context saved for seamless continuation!"
echo ""