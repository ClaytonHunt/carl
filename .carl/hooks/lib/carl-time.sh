#!/bin/bash

# carl-time.sh - Time utility functions for CARL hooks
# Provides consistent time formatting and helpers across all hooks

# Get time of day string based on current hour
get_time_of_day() {
    local hour=$(date +%H)
    if [[ $hour -lt 12 ]]; then
        echo "morning"
    elif [[ $hour -lt 17 ]]; then
        echo "afternoon"
    else
        echo "evening"
    fi
}

# Get formatted timestamp for logging
get_timestamp() {
    local format="${1:-'%Y-%m-%d %H:%M:%S'}"
    date +"$format"
}

# Get ISO timestamp for CARL files
get_iso_timestamp() {
    date '+%Y-%m-%dT%H:%M:%S'
}

# Get date string for file naming
get_date_string() {
    date '+%Y-%m-%d'
}

# Check if current time is within work hours (from CARL settings)
is_work_hours() {
    local start_hour=$(get_setting "developer.work_hours.start" "09:00" | cut -d: -f1)
    local end_hour=$(get_setting "developer.work_hours.end" "17:00" | cut -d: -f1)
    local current_hour=$(date +%H)
    
    # Remove leading zeros for comparison
    start_hour=${start_hour#0}
    end_hour=${end_hour#0}
    current_hour=${current_hour#0}
    
    [[ $current_hour -ge $start_hour && $current_hour -lt $end_hour ]]
}

# Get formatted time in user's preferred format
get_formatted_time() {
    local format_pref=$(get_setting "developer.preferred_time_format" "12h")
    if [[ "$format_pref" == "24h" ]]; then
        date '+%H:%M'
    else
        date '+%I:%M %p'
    fi
}

# Calculate time duration between two timestamps
calculate_time_duration() {
    local start_time="$1"
    local end_time="${2:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
    
    # Ensure we handle UTC times consistently
    # Add Z suffix if not present to indicate UTC
    [[ "$start_time" != *"Z" ]] && start_time="${start_time}Z"
    [[ "$end_time" != *"Z" ]] && end_time="${end_time}Z"
    
    # Convert to epoch seconds
    local start_epoch end_epoch
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS date command
        start_epoch=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" "+%s" 2>/dev/null || echo "0")
        end_epoch=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$end_time" "+%s" 2>/dev/null || date -u "+%s")
    else
        # Linux date command - properly handle UTC
        start_epoch=$(date -u -d "${start_time}" "+%s" 2>/dev/null || echo "0")
        end_epoch=$(date -u -d "${end_time}" "+%s" 2>/dev/null || date -u "+%s")
    fi
    
    # Calculate duration in seconds
    local duration=$((end_epoch - start_epoch))
    
    if [[ $duration -lt 0 || $start_epoch -eq 0 ]]; then
        echo "unknown duration"
        return
    fi
    
    # Format duration as human-readable
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))
    
    if [[ $hours -gt 0 ]]; then
        echo "${hours}h ${minutes}m"
    else
        echo "${minutes}m"
    fi
}