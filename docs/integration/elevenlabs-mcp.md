# ElevenLabs MCP Integration

CARL supports high-quality text-to-speech through ElevenLabs Model Context Protocol (MCP) integration, offering three levels of integration from basic caching to full API access.

## Integration Levels

### 1. Disabled (`integration_level: "disabled"`)
- Uses platform-specific TTS only (say, spd-say, PowerShell Speech)
- No ElevenLabs functionality
- **Best for**: Users who prefer system TTS or don't want cloud dependencies

### 2. Cached Generic (`integration_level: "cached_generic"`)
- Pre-generates high-quality audio for standard CARL messages
- Uses fallback/generic messages only (no custom content)
- Caches audio files locally to minimize API calls
- **Best for**: Users who want better audio quality without frequent API usage

### 3. Live API (`integration_level: "live_api"`)
- Real-time TTS generation for all messages including custom content
- Uses ElevenLabs MCP for dynamic voice generation
- Full template variable support with custom messages
- **Best for**: Users who want maximum flexibility and personalization

## Setup Requirements

### Prerequisites
1. **ElevenLabs Account**: Sign up at [elevenlabs.io](https://elevenlabs.io)
2. **API Key**: Get your API key from ElevenLabs dashboard (free tier: 10k credits/month)
3. **Python Installation**: ElevenLabs MCP server requires Python (uses `uvx` command)
4. **MCP Support**: Claude Code with MCP support enabled

### Environment Setup
```bash
# Set your ElevenLabs API key
export ELEVENLABS_API_KEY="your_api_key_here"
```

### MCP Server Installation

#### For Claude Code CLI:
```bash
# Add ElevenLabs MCP server
claude mcp add-json "ElevenLabs" '{
  "command": "uvx",
  "args": ["elevenlabs-mcp"],
  "env": {
    "ELEVENLABS_API_KEY": "your_api_key_here"
  }
}'
```

#### For Claude Desktop:
1. Open Claude Desktop → Help → Enable Developer Mode
2. Claude → Settings → Developer → Edit Config
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ElevenLabs": {
      "command": "uvx",
      "args": ["elevenlabs-mcp"],
      "env": {
        "ELEVENLABS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## CARL Configuration

### Cached Generic Mode
```json
{
  "audio": {
    "voice": {
      "elevenlabs": {
        "integration_level": "cached_generic",
        "mcp_enabled": true,
        "api_key_env": "ELEVENLABS_API_KEY",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "cache_audio": true,
        "cache_duration_hours": 168,
        "generic_messages_only": true
      }
    }
  }
}
```

**Features:**
- Pre-generates audio for standard messages on first use
- Caches files for 7 days (168 hours) by default
- Uses only fallback messages (no custom variables)
- Minimal API usage after initial generation

**Example Cached Messages:**
- "Good morning, CARL session started"
- "carl operation completed"
- "carl needs your attention"

### Live API Mode
```json
{
  "audio": {
    "voice": {
      "elevenlabs": {
        "integration_level": "live_api",
        "mcp_enabled": true,
        "api_key_env": "ELEVENLABS_API_KEY",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "cache_audio": true,
        "cache_duration_hours": 24,
        "generic_messages_only": false
      }
    }
  }
}
```

**Features:**
- Real-time generation for all messages
- Full template variable support
- Custom content generation
- Shorter cache duration (24 hours) for fresh content

**Example Dynamic Messages:**
- "Good morning, we've been working on user-authentication. Next planned: API testing"
- "carl has finished implementing JWT validation"
- "user-auth-feature reached 75% completion"

## Voice Configuration

### Available Voice IDs
Popular ElevenLabs voice options:

| Voice ID | Name | Description |
|----------|------|-------------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | American female, clear and professional |
| `29vD33N1CtxCmqQRPOHJ` | Drew | American male, warm and friendly |
| `2EiwWnXFnvU5JabPnv8n` | Clyde | American male, middle-aged |
| `5Q0t7uMcjvnagumLfvZi` | Paul | American male, deep and confident |
| `AZnzlk1XvdvUeBnXmlld` | Domi | American female, young and energetic |

### Model Options
- `eleven_monolingual_v1`: High quality, English only
- `eleven_multilingual_v1`: Multi-language support
- `eleven_multilingual_v2`: Latest multi-language model
- `eleven_turbo_v2`: Fastest generation, good quality

### Output Formats
- `mp3_22050_32`: Compact, lower quality
- `mp3_44100_128`: Standard quality (recommended)
- `pcm_16000`: Raw PCM for processing
- `pcm_22050`: Higher quality PCM
- `pcm_44100`: Highest quality PCM

## Performance Considerations

### API Usage Optimization

**Cached Generic Mode:**
- ~5-10 API calls for initial setup
- Near-zero ongoing usage (cached files)
- ~500-1000 credits for full message set

**Live API Mode:**
- 1 API call per unique message
- Higher ongoing usage
- ~50-100 credits per working day

### Cache Management
```json
{
  "cache_audio": true,
  "cache_duration_hours": 168,
  "cache_cleanup_on_start": true
}
```

**Cache Strategy:**
- Audio files stored in `.carl/audio-cache/`
- Automatic cleanup based on duration
- Files named by message hash for deduplication

## Troubleshooting

### Common Issues

**"MCP server not found":**
```bash
# Check if ElevenLabs MCP is installed
claude mcp list

# Reinstall if needed
claude mcp remove ElevenLabs
claude mcp add-json "ElevenLabs" '...'
```

**"API key not found":**
```bash
# Verify environment variable
echo $ELEVENLABS_API_KEY

# Set if missing
export ELEVENLABS_API_KEY="your_key_here"
```

**"Audio playback issues":**
- Ensure system audio drivers are working
- Check platform TTS fallback is functioning
- Verify audio file permissions in cache directory

### Fallback Behavior
When ElevenLabs integration fails:
1. Logs error to CARL session file
2. Falls back to platform-specific TTS
3. Continues normal operation with system voice

### Debug Mode
```json
{
  "elevenlabs": {
    "debug_mode": true,
    "log_api_calls": true,
    "save_failed_audio": true
  }
}
```

## Cost Management

### Free Tier Limits
- 10,000 characters per month
- ~200-300 CARL notifications
- Resets monthly

### Usage Monitoring
CARL tracks ElevenLabs usage in session files:
```yaml
elevenlabs_usage:
  - date: "2025-08-03"
    characters_used: 150
    api_calls: 3
    cached_hits: 12
```

### Optimization Tips
1. **Use Cached Generic** for most users
2. **Set longer cache duration** for stable messages
3. **Monitor usage** in session files
4. **Consider shorter messages** to reduce character count

## Migration from Legacy Settings

### Updating Existing Configuration
```bash
# Backup current settings
cp .carl/carl-settings.json .carl/carl-settings.json.backup

# Update integration_level
# Change "enabled": false to "integration_level": "disabled"
# Add mcp_enabled, generic_messages_only, cache_duration_hours
```

### Testing Integration
```bash
# Test notification with ElevenLabs
.carl/hooks/notify-attention.sh

# Check cache directory
ls -la .carl/audio-cache/

# Verify session logging
tail .carl/sessions/session-*.carl
```

This integration provides professional-quality voice notifications while maintaining CARL's performance and reliability standards.