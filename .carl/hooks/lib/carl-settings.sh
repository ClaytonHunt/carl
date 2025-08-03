#!/bin/bash
# carl-settings.sh - CARL settings management utilities
# Dependencies: None (pure bash + jq for JSON parsing)

# Settings file path
CARL_SETTINGS_FILE=".carl/carl-settings.json"

# Cache variables (set once per session for performance)
declare -A CARL_SETTINGS_CACHE

# Check if jq is available for JSON parsing
has_jq() {
    command -v jq >/dev/null 2>&1
}

# Fallback JSON parsing for simple string values (when jq unavailable)
simple_json_get() {
    local file="$1"
    local path="$2"
    local default="$3"
    
    # Convert dot notation to grep pattern (basic implementation)
    local pattern=$(echo "$path" | sed 's/\./\\./g')
    
    # Try to extract value (very basic - works for simple string values)
    local value=$(grep -o "\"$pattern\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$file" 2>/dev/null | \
                  sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
    
    if [[ -n "$value" ]]; then
        echo "$value"
    else
        echo "$default"
    fi
}

# Get setting value with fallback
get_carl_setting() {
    local setting_path="$1"
    local default_value="$2"
    local cache_key="$setting_path"
    
    # Return cached value if available
    if [[ -n "${CARL_SETTINGS_CACHE[$cache_key]}" ]]; then
        echo "${CARL_SETTINGS_CACHE[$cache_key]}"
        return 0
    fi
    
    # Check if settings file exists
    if [[ ! -f "$CARL_SETTINGS_FILE" ]]; then
        echo "$default_value"
        return 1
    fi
    
    local value
    if has_jq; then
        # Use jq for robust JSON parsing
        value=$(jq -r ".$setting_path // \"$default_value\"" "$CARL_SETTINGS_FILE" 2>/dev/null)
    else
        # Fallback to simple parsing
        value=$(simple_json_get "$CARL_SETTINGS_FILE" "$setting_path" "$default_value")
    fi
    
    # Cache the value
    CARL_SETTINGS_CACHE[$cache_key]="$value"
    
    echo "$value"
}

# Check if audio is enabled globally
is_audio_enabled() {
    local enabled=$(get_carl_setting "audio.enabled" "true")
    [[ "$enabled" == "true" ]]
}

# Check if specific notification type is enabled
is_notification_enabled() {
    local notification_type="$1"
    local global_enabled=$(get_carl_setting "audio.enabled" "true")
    local specific_enabled=$(get_carl_setting "audio.notifications.$notification_type.enabled" "true")
    
    [[ "$global_enabled" == "true" && "$specific_enabled" == "true" ]]
}

# Get notification message template
get_notification_message() {
    local notification_type="$1"
    local fallback="$2"
    
    if ! is_notification_enabled "$notification_type"; then
        return 1
    fi
    
    local template=$(get_carl_setting "audio.notifications.$notification_type.message_template" "")
    local fallback_template=$(get_carl_setting "audio.notifications.$notification_type.fallback_message" "$fallback")
    
    echo "${template:-$fallback_template}"
}

# Get time of day greeting
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

# Replace template variables in notification message
replace_message_variables() {
    local message="$1"
    local project_name="${2:-$(basename "$(pwd)")}"
    local task_description="$3"
    local work_item="$4"
    
    # Replace common variables
    message="${message//\{project\}/$project_name}"
    message="${message//\{time_of_day\}/$(get_time_of_day)}"
    message="${message//\{task_description\}/$task_description}"
    message="${message//\{work_item\}/$work_item}"
    
    # Add more variable replacements as needed
    echo "$message"
}

# Check if hook is enabled
is_hook_enabled() {
    local hook_name="$1"
    local enabled=$(get_carl_setting "hooks.$hook_name.enabled" "true")
    [[ "$enabled" == "true" ]]
}

# Get hook setting
get_hook_setting() {
    local hook_name="$1"
    local setting_name="$2"
    local default_value="$3"
    
    get_carl_setting "hooks.$hook_name.$setting_name" "$default_value"
}

# Initialize settings cache (call once per hook execution)
init_carl_settings() {
    # Pre-cache commonly used settings for performance
    get_carl_setting "audio.enabled" "true" >/dev/null
    get_carl_setting "session.auto_compaction" "true" >/dev/null
    get_carl_setting "context_injection.enabled" "true" >/dev/null
}

# Create default settings file if it doesn't exist
ensure_carl_settings() {
    if [[ ! -f "$CARL_SETTINGS_FILE" ]]; then
        echo "CARL settings file not found. Using defaults." >&2
        return 1
    fi
    return 0
}