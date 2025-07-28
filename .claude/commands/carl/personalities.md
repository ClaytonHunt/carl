# CARL Personality Management

Manage character personality themes for development feedback. Controls both audio output and Claude Code text response styling with contextual character selection.

## Usage

### View Current Theme
```bash
/carl:personality                    # Show current theme and description
```

### Enable/Disable System
```bash
/carl:personality --enable           # Activate current personalities.config.carl theme
/carl:personality --enable starwars  # Switch to and activate Star Wars theme
/carl:personality --enable tmnt      # Switch to and activate TMNT theme
/carl:personality --disable          # Turn off personality system  
```

### Create New Theme
```bash
/carl:personality --create           # Create new personality theme
                                     # Backs up current config to [theme].personalities.config.carl
                                     # Generates new config from template
```

## How It Works

Characters are contextually selected based on development actions for both audio feedback and Claude Code text responses:

- **start**: Beginning tasks, greetings
- **work**: During development activities  
- **success**: Celebrating completions
- **error**: Handling problems and debugging

Each character has unique:
- **Communication style**: How they speak and explain things
- **Speech patterns**: Specific phrases and mannerisms
- **Message transforms**: Text modifications for character voice
- **Color coding**: Visual identification in responses
- **Voice settings**: Audio characteristics for TTS

The system randomly picks appropriate characters with matching context, applies their personality to both text and audio output.

## Theme Files

- `personalities.config.carl` - Active theme configuration
- `[theme].personalities.config.carl` - Backup/alternate theme configs (e.g., `starwars.personalities.config.carl`)