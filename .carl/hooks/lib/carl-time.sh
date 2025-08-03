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