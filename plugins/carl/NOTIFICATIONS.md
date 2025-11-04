# CARL Notification System

The CARL plugin includes a comprehensive notification system that can alert you when Claude Code reaches stopping points and other important events.

## TTS Notifications with Say Library

The notification system now uses the `say` npm library for cross-platform text-to-speech support, with fallback to native platform commands.

### TTS Configuration Options

The following configuration options are available in the `configuration` section:

- **tts_provider**: TTS provider to use (`"none"`, `"say"`, etc.)
- **tts_voice**: Voice name to use (platform-dependent, `null` for system default)
- **tts_speed**: Speech rate multiplier (0.5 = 50%, 1.0 = 100%, 2.0 = 200%)

### Enabling TTS Notifications

To enable TTS notifications when Claude Code completes tasks:

1. Open `plugins/carl/defaults/settings.json` or your user settings
2. Update the following settings:

```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": null,
    "tts_speed": 1.0
  },
  "notifications": {
    "enabled": true,
    "agent_events": {
      "enabled": true,
      "agent_stop": {
        "enabled": true,
        "delivery_methods": ["tts"],
        "message": "${project_name}: Task completed"
      }
    }
  }
}
```

### Available Notification Events

#### Agent Events (Perfect for stopping points)
- **agent_stop**: Notifies when the main Claude agent completes a task
- **subagent_stop**: Notifies when a sub-agent completes its task

#### Session Events
- **session_start**: When a session starts, resumes, clears, or compacts
- **session_end**: When a session ends for any reason

#### Tool Events
Notifications for specific tool executions (Bash, Read, Write, Edit, Glob, Grep, WebFetch, etc.)

#### Custom Pattern Events
- **git_operations**: Git commands (commit, push, pull, etc.)
- **build_operations**: Build commands (npm build, etc.)
- **test_operations**: Test commands (npm test, jest, pytest, etc.)
- **install_operations**: Package installation commands

### Delivery Methods

Each notification can use multiple delivery methods:
- **tts**: Text-to-speech using the say library (cross-platform)
- **desktop**: Native desktop notifications

### Template Variables

Messages support template variables:
- `${project_name}`: Current project name
- `${project_path}`: Full project path
- `${timestamp}`: Current time
- `${date}`: Current date
- `${session_id}`: Session identifier

### Platform Support

The `say` library provides:
- **macOS**: Uses native 'say' command with fallback
- **Windows**: Uses PowerShell speech synthesis with fallback
- **Linux**: Uses espeak/spd-say with fallback

### Available Voices

**Important**: Voice names are platform-specific. A voice available on macOS (like "Samantha") won't work on Windows, and vice versa. If you specify an unavailable voice, the system will fall back to the default voice. For cross-platform compatibility, use `"tts_voice": null` to always use the system default.

#### macOS
To list available voices on macOS:
```bash
say -v "?"
```

Common voices:
- `Alex` - Default male voice
- `Samantha` - Siri's voice
- `Victoria` - Female voice
- `Daniel` - UK English male
- `Karen` - Australian female

#### Windows
Common voices (may vary by Windows version):
- `Microsoft David Desktop` - US English male
- `Microsoft Zira Desktop` - US English female
- `Microsoft Mark` - US English male (older)
- `Microsoft Hazel Desktop` - UK English female

To see installed voices, run:
```powershell
Add-Type -AssemblyName System.Speech
(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices()
```

#### Linux
The available voices depend on your TTS engine:
- `espeak` default voices (varies by installation)
- Install additional voices: `sudo apt-get install espeak-data`

### Voice Configuration Examples

#### Using macOS Siri voice at faster speed:
```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": "Samantha",
    "tts_speed": 1.3
  }
}
```

#### Using Windows female voice at slower speed:
```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": "Microsoft Zira Desktop",
    "tts_speed": 0.8
  }
}
```

#### Using system default voice at normal speed:
```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": null,
    "tts_speed": 1.0
  }
}
```

### Testing Notifications

Test the notification system directly:

```bash
cd plugins/carl
node lib/notify.cjs "Test message" "tts" "Test Title"
```

Or with environment variables:
```bash
# Test with default voice and speed
CARL_CARL_CONFIGURATION_TTS_PROVIDER=say node lib/notify.cjs "Test message" "tts"

# Test with custom voice (macOS)
CARL_CARL_CONFIGURATION_TTS_PROVIDER=say CARL_CARL_CONFIGURATION_TTS_VOICE="Samantha" node lib/notify.cjs "Test message" "tts"

# Test with custom speed (slower)
CARL_CARL_CONFIGURATION_TTS_PROVIDER=say CARL_CARL_CONFIGURATION_TTS_SPEED=0.8 node lib/notify.cjs "Test message" "tts"

# Test with custom voice and speed
CARL_CARL_CONFIGURATION_TTS_PROVIDER=say CARL_CARL_CONFIGURATION_TTS_VOICE="Alex" CARL_CARL_CONFIGURATION_TTS_SPEED=1.5 node lib/notify.cjs "Test message" "tts"
```

### Example Configuration for Claude Code Stopping Points

The most useful configuration for getting notified when Claude finishes:

```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": null,
    "tts_speed": 1.2
  },
  "notifications": {
    "enabled": true,
    "agent_events": {
      "enabled": true,
      "delivery_methods": ["tts"],
      "agent_stop": {
        "enabled": true,
        "delivery_methods": ["tts"],
        "message": "${project_name}: Task completed"
      },
      "subagent_stop": {
        "enabled": true,
        "delivery_methods": ["tts"],
        "message": "${project_name}: Subagent task completed"
      }
    }
  }
}
```

This will announce "CARL: Task completed" (or your project name) when Claude Code finishes its work at a slightly faster speed (1.2x).

For a more personalized experience with a specific voice:

```json
{
  "configuration": {
    "tts_provider": "say",
    "tts_voice": "Samantha",
    "tts_speed": 1.0
  },
  "notifications": {
    "enabled": true,
    "agent_events": {
      "enabled": true,
      "agent_stop": {
        "enabled": true,
        "delivery_methods": ["tts"],
        "message": "${project_name}: All done"
      }
    }
  }
}
```
