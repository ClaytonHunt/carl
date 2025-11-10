# CARL Notification System

The CARL plugin includes a comprehensive notification system that can alert you when Claude Code reaches stopping points and other important events.

## TTS Providers

The notification system supports multiple Text-to-Speech providers:

### Available TTS Providers

1. **say** - Cross-platform TTS using native system voices (offline, free)
2. **google-tts-api** - Google Text-to-Speech via unofficial API (online, free, 100+ languages)
3. **google-cloud-tts** - Official Google Cloud Text-to-Speech with premium voices (online, requires API key, paid)
4. **coqui-tts** - Neural TTS (not yet implemented)
5. **elevenlabs** - Premium cloud-based TTS (not yet implemented)

### TTS Configuration Options

The following configuration options are available in the `configuration` section:

- **tts_provider**: TTS provider to use (`"none"`, `"say"`, `"google-tts-api"`, `"google-cloud-tts"`, `"coqui-tts"`, `"elevenlabs"`)
- **tts_voice**: Voice/language configuration (provider-dependent, `null` for default)
  - For `say`: Platform-specific voice name (e.g., "Alex", "Samantha", "Microsoft Zira Desktop")
  - For `google-tts-api`: Language code (e.g., "en", "es", "fr", "de", "ja") - see [language list](docs/google-tts-languages.md)
  - For `google-cloud-tts`: Full voice name (e.g., "en-US-Chirp-HD-D", "en-US-Neural2-A") or language code (e.g., "en-US")
- **tts_speed**: Speech rate multiplier (0.5 = 50%, 1.0 = 100%, 2.0 = 200%)
  - **say**: Fully supported
  - **google-cloud-tts**: Fully supported
  - **google-tts-api**: Not supported

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

#### Say Provider
The `say` library provides:
- **macOS**: Uses native 'say' command with fallback
- **Windows**: Uses PowerShell speech synthesis with fallback
- **Linux**: Uses espeak/spd-say with fallback

#### Google-TTS-API Provider (Recommended for Multi-language)
Google Text-to-Speech via unofficial API (free, requires internet):
- **macOS**: Downloads MP3 and plays with afplay
- **Windows**: Downloads MP3 and plays with PowerShell MediaPlayer
- **Linux**: Downloads MP3 and plays with mpg123, mpg321, or ffplay
- **Languages**: Supports 43 languages via language codes
- **Quality**: High-quality Google neural voices
- **Cost**: Free (uses unofficial API)

#### Google-Cloud-TTS Provider (Premium Voices)
Official Google Cloud Text-to-Speech API (requires API key and billing):
- **All Platforms**: Downloads MP3 and plays with platform-specific audio player
- **Voices**: Access to all Google Cloud voices including:
  - **Standard**: Basic quality voices
  - **WaveNet**: High-quality neural voices
  - **Neural2**: Latest generation neural voices
  - **Studio**: Professional studio-quality voices
  - **Chirp**: Cutting-edge multilingual model (e.g., "en-US-Chirp-HD-D")
- **Languages**: 100+ languages with multiple voice options per language
- **Features**: Speed control, pitch control, audio effects
- **Cost**: Paid (see [Google Cloud pricing](https://cloud.google.com/text-to-speech/pricing))
- **Setup**: Requires `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to service account JSON file

### Available Voices

**Important**: Voice configuration differs by provider:
- **say**: Platform-specific voice names. A voice available on macOS (like "Samantha") won't work on Windows. For cross-platform compatibility, use `"tts_voice": null` for the system default.
- **google-tts-api**: Language codes (e.g., "en", "es", "fr", "ja"). Works the same across all platforms. See [complete language list](docs/google-tts-languages.md).
- **google-cloud-tts**: Full voice names (e.g., "en-US-Chirp-HD-D") or language codes (e.g., "en-US"). See [Google Cloud voice list](https://cloud.google.com/text-to-speech/docs/voices).

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

### Using Google-TTS-API (Recommended for Multi-language)

Google-TTS-API provides high-quality, natural-sounding speech using Google's unofficial Text-to-Speech API. It's free, requires an internet connection, and supports 43 languages.

#### Installation

The package is pre-installed. If you need to reinstall:
```bash
cd plugins/carl
npm install google-tts-api
```

#### Configuration Examples

##### English (default):
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "en",
    "tts_speed": 1.0
  }
}
```

##### Spanish:
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "es",
    "tts_speed": 1.0
  }
}
```

##### French:
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "fr",
    "tts_speed": 1.0
  }
}
```

##### Japanese:
```json
{
  "configuration": {
    "tts_provider": "google-tts-api",
    "tts_voice": "ja",
    "tts_speed": 1.0
  }
}
```

#### Supported Language Codes

Google-TTS-API supports 43 languages including:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese (Simplified)
- `zh-CN` - Chinese (Simplified - China)
- `zh-TW` - Chinese (Traditional - Taiwan)
- `ar` - Arabic
- `hi` - Hindi
- And many more...

**For the complete list of 43 supported languages**, see [google-tts-languages.md](docs/google-tts-languages.md).

**Note**: The `tts_speed` setting is not supported by google-tts-api.

### Using Google Cloud Text-to-Speech (Premium Voices)

Google Cloud TTS provides access to the highest quality voices including Chirp, Neural2, and Studio voices. This is the official Google Cloud API and requires authentication.

#### Setup

1. **Create a Google Cloud Project** and enable the Text-to-Speech API
2. **Create a Service Account** and download the JSON key file
3. **Set environment variable**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```
4. **Install the package** (already installed):
   ```bash
   cd plugins/carl
   npm install @google-cloud/text-to-speech
   ```

#### Configuration Examples

##### Using Chirp HD voice (latest model):
```json
{
  "configuration": {
    "tts_provider": "google-cloud-tts",
    "tts_voice": "en-US-Chirp-HD-D",
    "tts_speed": 1.0
  }
}
```

##### Using Neural2 voice:
```json
{
  "configuration": {
    "tts_provider": "google-cloud-tts",
    "tts_voice": "en-US-Neural2-A",
    "tts_speed": 1.2
  }
}
```

##### Using Studio voice (professional quality):
```json
{
  "configuration": {
    "tts_provider": "google-cloud-tts",
    "tts_voice": "en-US-Studio-O",
    "tts_speed": 1.0
  }
}
```

##### Using just language code (auto-selects voice):
```json
{
  "configuration": {
    "tts_provider": "google-cloud-tts",
    "tts_voice": "en-US",
    "tts_speed": 1.0
  }
}
```

#### Available Voice Types

- **Standard**: Basic quality voices (cheapest)
- **WaveNet**: High-quality neural voices
- **Neural2**: Latest generation neural voices
- **Studio**: Professional studio-quality voices
- **Chirp**: Cutting-edge multilingual model

For the complete list of available voices, see [Google Cloud TTS Voices](https://cloud.google.com/text-to-speech/docs/voices).

#### Features

- **Speed Control**: Adjust speaking rate from 0.25x to 4.0x
- **Pitch Control**: Adjust voice pitch
- **Audio Effects**: Apply audio profiles
- **SSML Support**: Use Speech Synthesis Markup Language for fine control

#### Cost

Google Cloud TTS is a paid service. See [pricing details](https://cloud.google.com/text-to-speech/pricing). The free tier includes:
- Standard voices: 4 million characters/month
- WaveNet/Neural2 voices: 1 million characters/month

### Testing Notifications

Test the notification system directly:

```bash
cd plugins/carl
node lib/notify.cjs "Test message" "tts" "Test Title"
```

Or with environment variables:

#### Testing Say Provider
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

#### Testing Google-TTS-API Provider
```bash
# Test with default English
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-tts-api node lib/notify.cjs "Hello, this is a test" "tts"

# Test with Spanish
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-tts-api CARL_CARL_CONFIGURATION_TTS_VOICE=es node lib/notify.cjs "Hola, esto es una prueba" "tts"

# Test with French
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-tts-api CARL_CARL_CONFIGURATION_TTS_VOICE=fr node lib/notify.cjs "Bonjour, ceci est un test" "tts"

# Test with Japanese
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-tts-api CARL_CARL_CONFIGURATION_TTS_VOICE=ja node lib/notify.cjs "こんにちは、これはテストです" "tts"
```

#### Testing Google Cloud TTS Provider
```bash
# Ensure GOOGLE_APPLICATION_CREDENTIALS is set first
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Test with Chirp HD voice
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-cloud-tts CARL_CARL_CONFIGURATION_TTS_VOICE="en-US-Chirp-HD-D" node lib/notify.cjs "Testing Chirp HD voice" "tts"

# Test with Neural2 voice
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-cloud-tts CARL_CARL_CONFIGURATION_TTS_VOICE="en-US-Neural2-A" node lib/notify.cjs "Testing Neural2 voice" "tts"

# Test with Studio voice
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-cloud-tts CARL_CARL_CONFIGURATION_TTS_VOICE="en-US-Studio-O" node lib/notify.cjs "Testing Studio voice" "tts"

# Test with speed control
CARL_CARL_CONFIGURATION_TTS_PROVIDER=google-cloud-tts CARL_CARL_CONFIGURATION_TTS_VOICE="en-US-Neural2-A" CARL_CARL_CONFIGURATION_TTS_SPEED=1.5 node lib/notify.cjs "Testing faster speech" "tts"
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
