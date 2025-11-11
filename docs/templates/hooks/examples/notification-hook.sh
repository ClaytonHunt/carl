#!/bin/bash
# Complete Notification Hook Script
#
# This script provides comprehensive notification capabilities for Claude Code events,
# including desktop notifications, webhooks, chat integrations, and metrics collection.
#
# Usage: Called automatically via PostToolUse, SubagentStop, and Notification hooks
# Exit Codes:
#   0 - Success
#   Other - Non-blocking error (logged but doesn't stop execution)

set -euo pipefail

# === Configuration ===

# Load environment variables if available
WEBHOOK_URL="${CLAUDE_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${CLAUDE_SLACK_WEBHOOK:-}"
DISCORD_WEBHOOK="${CLAUDE_DISCORD_WEBHOOK:-}"
NOTIFICATION_ENABLED="${CLAUDE_NOTIFICATION_ENABLED:-true}"
METRICS_DB="${CLAUDE_METRICS_DB:-${CLAUDE_PROJECT_DIR:-.}/.claude/metrics/events.db}"

# Create directories
mkdir -p "$(dirname "$METRICS_DB")" 2>/dev/null || true
mkdir -p "${CLAUDE_PROJECT_DIR:-.}/.claude/logs" 2>/dev/null || true

# Log file
LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/logs/notifications.log"

# === Read and Parse Input ===

INPUT=$(cat)

# Extract common fields
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# === Notification Functions ===

# Send desktop notification
send_desktop_notification() {
  local title="$1"
  local message="$2"
  local urgency="${3:-normal}"  # low, normal, critical

  # Skip if disabled
  [[ "$NOTIFICATION_ENABLED" != "true" ]] && return 0

  # Linux (notify-send)
  if command -v notify-send &> /dev/null; then
    notify-send -u "$urgency" "$title" "$message" 2>/dev/null || true
    return 0
  fi

  # macOS (osascript)
  if command -v osascript &> /dev/null; then
    osascript -e "display notification \"$message\" with title \"$title\"" 2>/dev/null || true
    return 0
  fi

  # Windows (PowerShell)
  if command -v powershell.exe &> /dev/null; then
    powershell.exe -Command "
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > \$null
      \$Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
      \$RawXml = [xml] \$Template.GetXml()
      (\$RawXml.toast.visual.binding.text|where {(\$_.id -eq '1')|Select -First 1}).AppendChild(\$RawXml.CreateTextNode('$title')) > \$null
      (\$RawXml.toast.visual.binding.text|where {(\$_.id -eq '2')|Select -First 1}).AppendChild(\$RawXml.CreateTextNode('$message')) > \$null
      \$SerializedXml = New-Object Windows.Data.Xml.Dom.XmlDocument
      \$SerializedXml.LoadXml(\$RawXml.OuterXml)
      \$Toast = [Windows.UI.Notifications.ToastNotification]::new(\$SerializedXml)
      \$Toast.Tag = 'Claude'
      \$Toast.Group = 'Claude'
      \$Notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code')
      \$Notifier.Show(\$Toast)
    " 2>/dev/null || true
    return 0
  fi

  return 1
}

# Send webhook notification
send_webhook() {
  local url="$1"
  local payload="$2"

  if [[ -z "$url" ]]; then
    return 0
  fi

  # Send webhook with timeout
  curl -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "X-Claude-Session: $SESSION_ID" \
    -d "$payload" \
    --max-time 10 \
    --silent \
    --show-error \
    2>/dev/null || true

  return 0
}

# Send Slack notification
send_slack() {
  local message="$1"
  local color="${2:-good}"  # good, warning, danger

  [[ -z "$SLACK_WEBHOOK" ]] && return 0

  local payload=$(jq -n \
    --arg text "$message" \
    --arg color "$color" \
    '{
      "attachments": [
        {
          "color": $color,
          "text": $text,
          "footer": "Claude Code",
          "ts": (now | floor)
        }
      ]
    }')

  send_webhook "$SLACK_WEBHOOK" "$payload"
}

# Send Discord notification
send_discord() {
  local message="$1"
  local color="${2:-5814783}"  # Decimal color code

  [[ -z "$DISCORD_WEBHOOK" ]] && return 0

  local payload=$(jq -n \
    --arg content "$message" \
    --argjson color "$color" \
    '{
      "content": $content,
      "embeds": [
        {
          "color": $color,
          "footer": {
            "text": "Claude Code"
          },
          "timestamp": (now | todate)
        }
      ]
    }')

  send_webhook "$DISCORD_WEBHOOK" "$payload"
}

# Log event to file
log_event() {
  local event_type="$1"
  local event_data="$2"

  echo "[$TIMESTAMP] [$event_type] $event_data" >> "$LOG_FILE"
}

# Store metrics in SQLite
store_metrics() {
  local event_type="$1"
  local event_data="$2"

  # Skip if sqlite3 not available
  command -v sqlite3 &> /dev/null || return 0

  # Create table if not exists
  sqlite3 "$METRICS_DB" "
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      event_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  " 2>/dev/null || true

  # Insert event
  sqlite3 "$METRICS_DB" "
    INSERT INTO events (timestamp, session_id, event_type, tool_name, event_data)
    VALUES ('$TIMESTAMP', '$SESSION_ID', '$event_type', '$TOOL_NAME', $(echo "$event_data" | jq -Rs .));
  " 2>/dev/null || true
}

# === Event Handlers ===

handle_file_change() {
  local file_path=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"')
  local success=$(echo "$INPUT" | jq -r '.tool_response.success // false')

  # Skip if operation failed
  [[ "$success" != "true" ]] && return 0

  local filename=$(basename "$file_path")
  local file_ext="${filename##*.}"

  # Desktop notification
  send_desktop_notification "Claude Code" "File modified: $filename" "normal"

  # Slack notification
  send_slack ":memo: File modified: \`$filename\` in session $SESSION_ID" "good"

  # Discord notification
  send_discord "File modified: \`$filename\`" "5814783"

  # Generic webhook
  if [[ -n "$WEBHOOK_URL" ]]; then
    local payload=$(jq -n \
      --arg event "file_change" \
      --arg session "$SESSION_ID" \
      --arg file "$file_path" \
      --arg tool "$TOOL_NAME" \
      --arg timestamp "$TIMESTAMP" \
      '{
        event: $event,
        session_id: $session,
        file_path: $file,
        tool: $tool,
        timestamp: $timestamp
      }')
    send_webhook "$WEBHOOK_URL" "$payload"
  fi

  # Log event
  log_event "file_change" "tool=$TOOL_NAME file=$file_path"

  # Store metrics
  store_metrics "file_change" "$(echo "$INPUT" | jq -c .)"

  # Auto-format if applicable
  case "$file_ext" in
    js|jsx|ts|tsx)
      if command -v prettier &> /dev/null; then
        prettier --write "$file_path" 2>/dev/null && \
          echo "Auto-formatted with Prettier: $filename"
      fi
      ;;
    py)
      if command -v black &> /dev/null; then
        black "$file_path" 2>/dev/null && \
          echo "Auto-formatted with Black: $filename"
      fi
      ;;
    go)
      if command -v gofmt &> /dev/null; then
        gofmt -w "$file_path" 2>/dev/null && \
          echo "Auto-formatted with gofmt: $filename"
      fi
      ;;
  esac
}

handle_bash_execution() {
  local command=$(echo "$INPUT" | jq -r '.tool_input.command // "unknown"')
  local success=$(echo "$INPUT" | jq -r '.tool_response.success // false')

  # Truncate long commands
  local command_preview=$(echo "$command" | head -c 100)
  [[ ${#command} -gt 100 ]] && command_preview="${command_preview}..."

  # Log event
  log_event "bash_execution" "success=$success command='$command_preview'"

  # Store metrics
  store_metrics "bash_execution" "$(echo "$INPUT" | jq -c .)"

  # Send notification for failed commands
  if [[ "$success" != "true" ]]; then
    send_desktop_notification "Claude Code" "Command failed: $command_preview" "critical"
    send_slack ":warning: Command failed: \`$command_preview\`" "danger"
  fi
}

handle_subagent_stop() {
  local subagent_type=$(echo "$INPUT" | jq -r '.subagent_type // "unknown"')

  # Desktop notification
  send_desktop_notification "Claude Code" "Subagent completed: $subagent_type" "normal"

  # Slack notification
  send_slack ":robot_face: Subagent \`$subagent_type\` completed in session $SESSION_ID" "good"

  # Publish event for orchestration (IndyDevDan pattern)
  if [[ -n "$WEBHOOK_URL" ]]; then
    local payload=$(jq -n \
      --arg event "subagent_complete" \
      --arg session "$SESSION_ID" \
      --arg subagent "$subagent_type" \
      --arg timestamp "$TIMESTAMP" \
      '{
        event: $event,
        session_id: $session,
        subagent_type: $subagent,
        timestamp: $timestamp,
        status: "success"
      }')
    send_webhook "$WEBHOOK_URL" "$payload"
  fi

  # Log event
  log_event "subagent_complete" "subagent=$subagent_type"

  # Store metrics
  store_metrics "subagent_complete" "$(echo "$INPUT" | jq -c .)"
}

handle_session_stop() {
  # Calculate session duration if possible
  local duration="unknown"
  if [[ -n "${CARL_START_TIME:-}" ]]; then
    local end_time=$(date +%s)
    duration=$((end_time - CARL_START_TIME))
  fi

  # Desktop notification
  send_desktop_notification "Claude Code" "Session completed (duration: ${duration}s)" "low"

  # Slack notification
  send_slack ":checkered_flag: Session \`$SESSION_ID\` completed (duration: ${duration}s)" "good"

  # Generic webhook
  if [[ -n "$WEBHOOK_URL" ]]; then
    local payload=$(jq -n \
      --arg event "session_complete" \
      --arg session "$SESSION_ID" \
      --arg duration "$duration" \
      --arg timestamp "$TIMESTAMP" \
      '{
        event: $event,
        session_id: $session,
        duration_seconds: $duration,
        timestamp: $timestamp
      }')
    send_webhook "$WEBHOOK_URL" "$payload"
  fi

  # Log event
  log_event "session_complete" "duration=${duration}s"

  # Store metrics
  store_metrics "session_complete" "$(echo "$INPUT" | jq -c .)"

  # Generate session summary
  if command -v sqlite3 &> /dev/null; then
    local file_changes=$(sqlite3 "$METRICS_DB" "SELECT COUNT(*) FROM events WHERE session_id='$SESSION_ID' AND event_type='file_change';" 2>/dev/null || echo "0")
    local bash_commands=$(sqlite3 "$METRICS_DB" "SELECT COUNT(*) FROM events WHERE session_id='$SESSION_ID' AND event_type='bash_execution';" 2>/dev/null || echo "0")

    echo "Session Summary:"
    echo "  Files modified: $file_changes"
    echo "  Commands executed: $bash_commands"
    echo "  Duration: ${duration}s"
  fi
}

handle_notification_event() {
  local notification_type=$(echo "$INPUT" | jq -r '.notification_type // "unknown"')
  local notification_message=$(echo "$INPUT" | jq -r '.message // "Notification from Claude Code"')

  # Forward to desktop
  send_desktop_notification "Claude Code" "$notification_message" "normal"

  # Log event
  log_event "notification" "type=$notification_type message='$notification_message'"

  # Store metrics
  store_metrics "notification" "$(echo "$INPUT" | jq -c .)"
}

# === Main Notification Logic ===

case "$HOOK_EVENT" in
  PostToolUse)
    case "$TOOL_NAME" in
      Write|Edit)
        handle_file_change
        ;;
      Bash)
        handle_bash_execution
        ;;
      *)
        log_event "tool_execution" "tool=$TOOL_NAME"
        store_metrics "tool_execution" "$(echo "$INPUT" | jq -c .)"
        ;;
    esac
    ;;

  SubagentStop)
    handle_subagent_stop
    ;;

  Stop)
    handle_session_stop
    ;;

  Notification)
    handle_notification_event
    ;;

  *)
    log_event "unknown_event" "hook=$HOOK_EVENT"
    ;;
esac

# === Success ===
echo "Notification processing complete for $HOOK_EVENT"
exit 0
