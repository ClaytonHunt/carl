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

### Configure Response Style
```bash
/carl:personality --style single     # Single character responses
/carl:personality --style multi      # Enable multi-character conversations
/carl:personality --style auto       # Let CARL decide based on context (default)
```

## How It Works

Characters are contextually selected based on development actions for both audio feedback and Claude Code text responses:

- **start**: Beginning tasks, greetings
- **work**: During development activities  
- **success**: Celebrating completions
- **error**: Handling problems and debugging

### Response Format

Characters speak in play script format with color-coded names:

```
🎭 Jimmy: Brain blast! I've analyzed your code structure.
🎭 Cindy: Obviously, there are some optimization opportunities here.
🎭 Carl: Um, should we maybe test it first? *nervous*
```

### Character Features

Each character has unique:
- **Communication style**: How they speak and explain things
- **Speech patterns**: Specific phrases and mannerisms
- **Message transforms**: Text modifications for character voice
- **Color coding**: Visual identification in responses
- **Voice settings**: Audio characteristics for TTS

### Multi-Character Interactions

When appropriate, multiple characters may interact in a conversation:
- **Debates**: Technical discussions between Jimmy and Cindy
- **Support**: Carl offering encouragement during errors
- **Celebrations**: Sheen's excitement paired with Libby's cool validation
- **Teaching**: Ms. Fowl explaining with Principal Willoughby's authority

The system intelligently selects single or multi-character responses based on context.

## Example Interactions

### Single Character Response
```
🎭 Carl: Oh, um, I found a potential memory leak in your forEach loop.
      Maybe we should, uh, use a for...of instead? *fidgets nervously*
```

### Multi-Character Technical Discussion
```
🎭 Jimmy: According to my calculations, this algorithm has O(n²) complexity.
🎭 Cindy: Obviously. That's why I suggested using a hash map approach.
🎭 Jimmy: Actually, given the data constraints, a binary search tree would be optimal.
🎭 Libby: Both of you have good points. Why not benchmark them?
```

### Error Handling Support
```
🎭 Ms. Fowl: *squawk* Class! Pay attention! You have a syntax error on line 42.
🎭 Carl: Don't worry! Even Jimmy makes mistakes sometimes. Let's fix it together!
🎭 Judy: Now sweetie, remember to check your brackets. Safety first!
```

### Success Celebration
```
🎭 Sheen: ULTRA LORD! All tests are passing! This is AMAZING!
🎭 Hugh: You know, this reminds me of when I fixed the toaster... Great job!
🎭 Sam: Welcome to success! Have some free samples of victory!
```

### Alternative Theme Examples

#### TMNT Theme
```
🎭 Donatello: I've analyzed the code architecture and found 3 optimization points.
🎭 Raphael: Just smash through it! Refactor the whole thing!
🎭 Leonardo: Let's approach this systematically. We should plan first.
🎭 Michelangelo: Cowabunga! Whatever works, dudes! Pizza break?
```

#### Star Wars Theme
```
🎭 Yoda: A bug in your code, I sense. Fix it, you must.
🎭 C-3PO: Oh my! The probability of this working is approximately 3,720 to 1!
🎭 R2-D2: *beep boop beep* [Running diagnostic tests...]
🎭 Obi-Wan: The Force suggests using dependency injection here.
```

#### Office Workers Theme
```
🎭 Senior Dev: I've seen this pattern before. Try the Factory approach.
🎭 Project Manager: What's our timeline looking like? Any blockers?
🎭 QA Engineer: Found 3 edge cases that need handling.
🎭 Intern: Wow! This is so cool! Can I help with the tests?
```

## Configuration Files

### Theme Files
- `personalities.config.carl` - Active theme configuration
- `[theme].personalities.config.carl` - Backup/alternate theme configs (e.g., `starwars.personalities.config.carl`)

### Settings Integration
```json
// .carl/config/carl-settings.json
{
  "audio_settings": {
    "personality_theme": "jimmy_neutron",
    "personality_response_style": "auto"
  }
}
```

**Response Style Options:**
- `"single"` - Always use one character per response
- `"multi"` - Enable multi-character conversations when appropriate  
- `"auto"` - CARL intelligently chooses based on context (default)

Settings are loaded at session start and persist across Claude Code restarts.