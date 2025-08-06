#!/bin/bash

# doc-quality-check.sh - Hook to trigger documentation quality analysis
# Invokes the documentation-quality-auditor subagent when documentation files are modified

set -euo pipefail

# Configuration
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_FILE="$CLAUDE_PROJECT_DIR/.carl/sessions/doc-quality.log"

# Only run in interactive Claude Code sessions, not in hooks during automation
if [[ "${CLAUDE_HOOK_CONTEXT:-}" == "automation" ]]; then
    exit 0
fi

# Log the hook trigger
{
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Documentation quality check triggered"
    echo "Modified file pattern: ${CLAUDE_TOOL_ARGS:-unknown}"
} >> "$LOG_FILE" 2>/dev/null || true

# Simple check to avoid excessive triggers
LAST_CHECK_FILE="$CLAUDE_PROJECT_DIR/.carl/.last_doc_check"
CURRENT_TIME=$(date +%s)

if [[ -f "$LAST_CHECK_FILE" ]]; then
    LAST_CHECK=$(cat "$LAST_CHECK_FILE" 2>/dev/null || echo "0")
    TIME_DIFF=$((CURRENT_TIME - LAST_CHECK))
    
    # Only run quality check if more than 5 minutes since last check
    if [[ $TIME_DIFF -lt 300 ]]; then
        exit 0
    fi
fi

# Update last check time
echo "$CURRENT_TIME" > "$LAST_CHECK_FILE"

# Create a context file for the subagent
CONTEXT_FILE="$CLAUDE_PROJECT_DIR/.carl/.doc_quality_context"
cat > "$CONTEXT_FILE" << EOF
Documentation Quality Check Requested
=====================================

Trigger: Documentation file modification detected
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Project: $CLAUDE_PROJECT_DIR

Please analyze the current documentation quality and provide:
1. Overall quality assessment and scoring
2. Specific issues found (broken links, outdated content, etc.)
3. Actionable improvement recommendations
4. Priority ranking for fixes

Focus on recently modified files and overall project documentation health.
EOF

# Log the subagent trigger
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Triggering documentation-quality-auditor subagent" >> "$LOG_FILE" 2>/dev/null || true

# Note: The actual subagent invocation would typically be handled by Claude Code's Task tool
# This hook sets up the context and creates a signal that documentation analysis is needed
# The user or another automation can then use: claude task --agent documentation-quality-auditor

# For now, we create a simple indicator file that can be checked
touch "$CLAUDE_PROJECT_DIR/.carl/.doc_quality_requested"

exit 0