# CARL Settings Configuration

CARL provides a comprehensive settings system to customize audio notifications, hook behavior, and session management through `.carl/carl-settings.json`.

## Settings File Location

The settings file is located at `.carl/carl-settings.json` in your project root. If this file doesn't exist, CARL will use sensible defaults.

## Audio Notifications

### Global Audio Control

```json
{
  "audio": {
    "enabled": true
  }
}
```

**Options:**
- `true`: Enable all audio notifications (subject to individual notification settings)
- `false`: Disable all audio notifications globally

### Individual Notification Types

Each notification type can be configured independently:

```json
{
  "audio": {
    "notifications": {
      "session_start": {
        "enabled": true,
        "message_template": "Good {time_of_day}, we've been working on {active_work}. Next planned: {next_activity}",
        "fallback_message": "Good {time_of_day}, CARL session started"
      }
    }
  }
}
```

**Available Notification Types:**

| Type | Description | Default Enabled |
|------|-------------|-----------------|
| `session_start` | Spoken when SessionStart hook runs | ✅ |
| `stop` | Spoken when Stop hook runs (Claude Code operation complete) | ✅ |
| `attention` | Spoken when Claude Code needs user input | ✅ |
| `progress_milestone` | Spoken when work items reach completion milestones | ❌ |
| `schema_validation_error` | Spoken when CARL file validation fails | ❌ |
| `tech_debt_detected` | Spoken when new technical debt is found | ❌ |

### Message Templates

Message templates support variable substitution:

**Available Variables:**
- `{project}` - Current project name
- `{time_of_day}` - "morning", "afternoon", or "evening"
- `{task_description}` - Description of completed task
- `{work_item}` - Current work item name
- `{active_work}` - Currently active work (from active.work.carl)
- `{next_activity}` - Next planned activity
- `{file_name}` - File name (for validation/tech debt notifications)
- `{milestone_percentage}` - Completion percentage

**Example Templates:**
```json
{
  "session_start": {
    "message_template": "Good {time_of_day}, continuing work on {active_work}"
  },
  "stop": {
    "message_template": "{project} has finished {task_description}"
  }
}
```

### Voice Settings

```json
{
  "audio": {
    "voice": {
      "macos": {
        "voice": "default",
        "rate": 200,
        "volume": 0.5
      },
      "linux": {
        "voice": "default", 
        "rate": "normal",
        "volume": "normal"
      },
      "wsl": {
        "voice": "default",
        "rate": 0,
        "volume": 100
      },
      "windows": {
        "voice": "default",
        "rate": 0,
        "volume": 100
      },
      "elevenlabs": {
        "enabled": false,
        "api_key_env": "ELEVENLABS_API_KEY",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "model": "eleven_monolingual_v1",
        "output_format": "mp3_44100_128",
        "cache_audio": true
      }
    }
  }
}
```

**Platform-Specific Voice Options:**

**macOS (`say` command):**
- `voice`: Voice name (e.g., "Alex", "Samantha") or "default"
- `rate`: Words per minute (default: 200)
- `volume`: 0.0 to 1.0 (default: 0.5)

**Linux (`spd-say`/`espeak`):**
- `voice`: Voice name or "default"
- `rate`: "slow", "normal", "fast", or numeric
- `volume`: "quiet", "normal", "loud"

**Windows/WSL (PowerShell Speech):**
- `voice`: Voice name or "default" 
- `rate`: Speech rate -10 to 10 (default: 0)
- `volume`: Volume 0 to 100 (default: 100)

**ElevenLabs Integration:**
- `enabled`: Enable high-quality AI TTS (requires API key)
- `api_key_env`: Environment variable containing API key
- `voice_id`: ElevenLabs voice identifier
- `model`: TTS model to use
- `output_format`: Audio format for generated speech
- `cache_audio`: Cache generated audio files

## Session Management

```json
{
  "session": {
    "auto_compaction": true,
    "compaction_strategy": "calendar_based",
    "retention_periods": {
      "daily_sessions_days": 7
    },
    "track_agent_performance": true,
    "track_command_metrics": true
  }
}
```

**Session Options:**
- `auto_compaction`: Automatically compact old session files
- `compaction_strategy`: "calendar_based" (weekly/monthly/quarterly boundaries) or "time_based" (configurable intervals)
- `retention_periods.daily_sessions_days`: Days to keep individual daily sessions before weekly compaction
- `track_agent_performance`: Record agent execution metrics
- `track_command_metrics`: Record CARL command performance

**Calendar-Based Compaction (Default):**
- Daily sessions older than 7 days → Weekly files (by calendar week)
- Weekly files from previous months → Monthly files (by calendar month)
- Monthly files from previous quarters → Quarterly files (by calendar quarter)  
- Quarterly files from previous years → Yearly files (by calendar year)

## Hook Configuration

```json
{
  "hooks": {
    "schema_validation": {
      "enabled": true,
      "strict_mode": true,
      "auto_fix_minor_issues": false
    },
    "progress_tracking": {
      "enabled": true,
      "auto_update_percentages": true,
      "milestone_thresholds": [25, 50, 75, 90, 100]
    },
    "tech_debt_extraction": {
      "enabled": true,
      "keywords": ["TODO", "FIXME", "HACK", "XXX", "NOTE"],
      "auto_prioritize": true
    },
    "completion_handler": {
      "enabled": true,
      "auto_move_completed": true,
      "completion_threshold": 100
    }
  }
}
```

**Hook Settings:**

**Note:** Hooks cannot be disabled as they are essential for CARL's consistency. These settings configure hook behavior only.

### Schema Validation
- `strict_mode`: Enforce strict schema compliance
- `auto_fix_minor_issues`: Automatically fix minor formatting issues

### Progress Tracking  
- `auto_update_percentages`: Automatically update completion percentages
- `milestone_thresholds`: Completion percentages that trigger notifications

### Tech Debt Extraction
- `keywords`: Comment keywords to detect as technical debt
- `auto_prioritize`: Automatically assign priority based on keyword

### Completion Handler
- `auto_move_completed`: Move completed items to completed/ directories
- `completion_threshold`: Completion percentage considered "done"

## Context Injection

```json
{
  "context_injection": {
    "enabled": true,
    "carl_commands_only": true,
    "include_active_work": true,
    "include_recent_sessions": false,
    "max_context_tokens": 500
  }
}
```

**Context Options:**
- `enabled`: Enable context injection for CARL commands
- `carl_commands_only`: Only inject context for `/carl:*` commands
- `include_active_work`: Include active work item in context
- `include_recent_sessions`: Include recent session summaries
- `max_context_tokens`: Maximum tokens to inject

## Developer Preferences

```json
{
  "developer": {
    "preferred_time_format": "12h",
    "timezone": "auto",
    "work_hours": {
      "start": "09:00",
      "end": "17:00"
    }
  }
}
```

**Developer Options:**
- `preferred_time_format`: "12h" or "24h" time format
- `timezone`: "auto" or specific timezone
- `work_hours`: Define working hours for context

## Example Configurations

### Minimal Audio (Essential Only)
```json
{
  "audio": {
    "enabled": true,
    "notifications": {
      "session_start": { "enabled": false },
      "stop": { "enabled": true },
      "attention": { "enabled": true },
      "progress_milestone": { "enabled": false },
      "schema_validation_error": { "enabled": false },
      "tech_debt_detected": { "enabled": false }
    }
  }
}
```

### Development Mode (Verbose)
```json
{
  "audio": {
    "enabled": true,
    "notifications": {
      "progress_milestone": { "enabled": true },
      "schema_validation_error": { "enabled": true },
      "tech_debt_detected": { "enabled": true }
    }
  },
  "hooks": {
    "progress_tracking": {
      "milestone_thresholds": [10, 25, 50, 75, 90, 100]
    }
  }
}
```

### Silent Mode (No Audio)
```json
{
  "audio": {
    "enabled": false
  }
}
```

## Performance Notes

- Settings are cached per hook execution for performance
- JSON parsing uses `jq` if available, falls back to simple parsing
- Missing settings use sensible defaults
- Invalid settings are ignored with fallback to defaults

## Troubleshooting

**No Audio Playing:**
1. Check `audio.enabled` is `true`
2. Verify specific notification type is enabled
3. Ensure TTS is available on your platform (`say`, `spd-say`, `espeak`, or `powershell.exe`)
4. Check CARL settings file syntax with `jq . .carl/carl-settings.json`

**Settings Not Taking Effect:**
1. Restart Claude Code to reload settings
2. Verify settings file location (`.carl/carl-settings.json`)
3. Check for JSON syntax errors
4. Ensure file permissions allow reading