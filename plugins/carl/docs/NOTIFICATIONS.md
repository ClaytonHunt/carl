# CARL Notification System

The CARL notification system provides comprehensive event notifications through Text-to-Speech (TTS) and desktop notifications, allowing you to stay informed about what's happening in your Claude Code sessions.

## Features

- **Multiple delivery methods**: TTS and/or desktop notifications
- **Granular control**: Enable/disable notifications for specific events
- **Customizable messages**: Template-based messages with variable substitution
- **Project awareness**: Notifications include project name for multi-project workflows
- **Pattern matching**: Detect git operations, builds, tests, and more
- **Timing flexibility**: Configure before/after notifications per action
- **Failure handling**: Separate settings for success vs. failure notifications

## Quick Start

### Enable Notifications

1. Edit your settings file: `.claude/.carl/carl.settings.json`
2. Set `notifications.enabled` to `true`
3. Configure specific event types you want to be notified about

### Example: Enable Git Operation Notifications

```json
{
  "notifications": {
    "enabled": true,
    "tool_events": {
      "enabled": true,
      "tools": {
        "git_operations": {
          "enabled": true,
          "delivery_methods": ["tts", "desktop"],
          "messages": {
            "after_success": "${project_name}: Git ${operation} completed"
          }
        }
      }
    }
  }
}
```

## Available Template Variables

### Global Variables (available in all notifications)
- `${project_name}` - Project directory name
- `${project_path}` - Full project directory path
- `${timestamp}` - Current timestamp (e.g., "2:30 PM")
- `${date}` - Current date (e.g., "Nov 4, 2025")
- `${session_id}` - Current session ID

### Tool Event Variables
- `${tool_name}` - Name of the tool (e.g., "Bash", "Write")
- `${file_path}` - File path (for Read/Write/Edit tools)
- `${file_name}` - Just the filename without path
- `${command}` - Bash command being executed
- `${pattern}` - Search pattern (for Grep/Glob)
- `${url}` - URL (for WebFetch/WebSearch)
- `${error_message}` - Error message (on failure)
- `${operation}` - Detected operation type (e.g., "commit", "push")
- `${build_type}` - Detected build/test type

### Session Event Variables
- `${session_type}` - Session type (startup, resume, clear, compact)
- `${end_reason}` - End reason (clear, logout, prompt_input_exit, other)

### User Event Variables
- `${prompt_preview}` - Preview of user's prompt (truncated)
- `${prompt_length}` - Character count of prompt

### Agent Event Variables
- `${agent_type}` - "main" or "subagent"
- `${subagent_name}` - Name of subagent (if applicable)

### Compact Event Variables
- `${compact_type}` - "manual" or "auto"

## Notification Categories

### 1. Tool Events
Notifications for tool execution (Read, Write, Edit, Bash, etc.)

**Special Pattern-Based Tools:**
- `git_operations` - Detects git commands automatically
- `build_operations` - Detects build commands (npm/yarn/pnpm/bun build)
- `test_operations` - Detects test commands
- `install_operations` - Detects dependency installation

**Configuration:**
```json
"tool_events": {
  "enabled": true,
  "notify_before": false,
  "notify_after": true,
  "notify_on_failure": true,
  "tools": {
    "Write": {
      "enabled": true,
      "delivery_methods": ["desktop"],
      "messages": {
        "before": "[${project_name}] Writing ${file_name}",
        "after_success": "[${project_name}] Wrote ${file_name}",
        "after_failure": "[${project_name}] Failed to write ${file_name}"
      }
    }
  }
}
```

### 2. Session Events
Notifications for session lifecycle events

**Configuration:**
```json
"session_events": {
  "enabled": true,
  "session_start": {
    "enabled": true,
    "matchers": {
      "startup": {
        "enabled": true,
        "delivery_methods": ["tts"],
        "message": "${project_name} session started"
      },
      "resume": {
        "enabled": true,
        "message": "${project_name} session resumed"
      }
    }
  },
  "session_end": {
    "enabled": true,
    "reasons": {
      "logout": {
        "enabled": true,
        "message": "${project_name} session ended"
      }
    }
  }
}
```

### 3. User Events
Notifications when user submits prompts

**Configuration:**
```json
"user_events": {
  "enabled": true,
  "user_prompt_submit": {
    "enabled": true,
    "include_prompt_preview": true,
    "max_preview_length": 50,
    "delivery_methods": ["desktop"],
    "message": "[${project_name}] Processing: ${prompt_preview}"
  }
}
```

### 4. Agent Events
Notifications for agent task completion

**Configuration:**
```json
"agent_events": {
  "enabled": true,
  "agent_stop": {
    "enabled": true,
    "delivery_methods": ["tts"],
    "message": "${project_name}: Task completed"
  },
  "subagent_stop": {
    "enabled": false,
    "message": "${project_name}: Subagent task completed"
  }
}
```

### 5. System Events
Notifications for Claude Code system events

**Configuration:**
```json
"system_events": {
  "enabled": true,
  "notification": {
    "enabled": true,
    "delivery_methods": ["desktop"],
    "message": "[${project_name}] System notification"
  }
}
```

### 6. Compact Events
Notifications before context compaction

**Configuration:**
```json
"compact_events": {
  "enabled": true,
  "matchers": {
    "manual": {
      "enabled": true,
      "message": "[${project_name}] Manual compact starting"
    },
    "auto": {
      "enabled": true,
      "message": "[${project_name}] Auto-compact starting"
    }
  }
}
```

## Delivery Methods

### TTS (Text-to-Speech)
Speaks notifications using your system's TTS capabilities.

**Platform Support:**
- **macOS**: Uses built-in `say` command
- **Windows**: Uses PowerShell Speech Synthesizer
- **Linux**: Uses `espeak` or `spd-say`

**Requirements:**
- Set `configuration.tts_provider` to something other than "none" in settings
- Ensure TTS software is installed on your system

### Desktop Notifications
Shows native desktop notifications/toasts.

**Platform Support:**
- **macOS**: Uses `osascript` for notification center
- **Windows**: Uses PowerShell toast notifications
- **Linux**: Uses `notify-send`

## Common Use Cases

### 1. Long-Running Build Notifications
Get notified when builds complete so you can multitask:

```json
"tool_events": {
  "enabled": true,
  "tools": {
    "build_operations": {
      "enabled": true,
      "delivery_methods": ["tts"],
      "messages": {
        "after_success": "${project_name}: Build completed successfully",
        "after_failure": "${project_name}: Build failed"
      }
    }
  }
}
```

### 2. Test Completion with TTS
Hear when tests finish:

```json
"tool_events": {
  "enabled": true,
  "tools": {
    "test_operations": {
      "enabled": true,
      "delivery_methods": ["tts"],
      "messages": {
        "after_success": "${project_name}: All tests passed",
        "after_failure": "${project_name}: Tests failed"
      }
    }
  }
}
```

### 3. Git Operation Tracking
Track git operations across projects:

```json
"tool_events": {
  "enabled": true,
  "tools": {
    "git_operations": {
      "enabled": true,
      "delivery_methods": ["tts", "desktop"],
      "messages": {
        "after_success": "${project_name}: Git ${operation} completed"
      }
    }
  }
}
```

### 4. Task Completion Alerts
Get notified when Claude finishes tasks:

```json
"agent_events": {
  "enabled": true,
  "agent_stop": {
    "enabled": true,
    "delivery_methods": ["tts"],
    "message": "${project_name}: Task completed"
  }
}
```

## Troubleshooting

### TTS Not Working

**Check TTS provider setting:**
```bash
# In your settings file, ensure tts_provider is not "none"
"configuration": {
  "tts_provider": "say"  // or another provider
}
```

**Platform-specific checks:**
- macOS: `say` command should be available by default
- Windows: PowerShell must be available
- Linux: Install `espeak` or `speech-dispatcher`

### Desktop Notifications Not Appearing

**macOS:**
- Check System Preferences → Notifications
- Ensure notifications are enabled for "Script Editor" or "osascript"

**Windows:**
- Check Settings → System → Notifications & actions
- Ensure notifications are enabled

**Linux:**
- Install `libnotify-bin` package: `sudo apt-get install libnotify-bin`

### No Notifications Showing

1. Check master toggle: `notifications.enabled` must be `true`
2. Check category toggle: e.g., `tool_events.enabled` must be `true`
3. Check specific event: e.g., `tool_events.tools.Write.enabled` must be `true`
4. Verify settings are loaded: Check session start output for settings validation

## File Structure

```
plugins/carl/
├── hooks/
│   ├── notify-tool-events.cjs       # Tool execution notifications
│   ├── notify-session-events.cjs    # Session lifecycle notifications
│   ├── notify-user-events.cjs       # User interaction notifications
│   ├── notify-agent-events.cjs      # Agent completion notifications
│   ├── notify-system-events.cjs     # System event notifications
│   ├── notify-compact-events.cjs    # Context compaction notifications
│   └── hooks.json                   # Hook registration
├── lib/
│   └── notify.cjs                   # Core notification library
└── defaults/
    └── settings.json                # Default notification settings
```

## Advanced Configuration

### Per-Tool Delivery Methods
Different tools can use different notification methods:

```json
"tools": {
  "Write": {
    "delivery_methods": ["desktop"]  // Only show toast
  },
  "git_operations": {
    "delivery_methods": ["tts", "desktop"]  // Both TTS and toast
  },
  "test_operations": {
    "delivery_methods": ["tts"]  // Only TTS
  }
}
```

### Notification Timing
Control when notifications fire:

```json
"tool_events": {
  "notify_before": true,   // Notify before tool executes
  "notify_after": true,    // Notify after tool completes
  "notify_on_failure": true  // Notify even on failures
}
```

### Message Customization
Craft messages that work for you:

```json
"messages": {
  "before": "⏳ ${project_name}: Starting ${operation}",
  "after_success": "✅ ${project_name}: ${operation} done!",
  "after_failure": "❌ ${project_name}: ${operation} failed - ${error_message}"
}
```

## Contributing

Found a bug or want to add features? Check the main CARL repository for contribution guidelines.

## License

MIT - See LICENSE file in the CARL project root.
