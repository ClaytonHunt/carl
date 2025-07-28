# CARL Personalities Format Specification

> Version: 1.0.0  
> Last Updated: 2025-07-28  
> Purpose: Define the structure for personalities.carl files

## Overview

The `personalities.carl` file defines character personalities for CARL's audio and text response system. Personalities are **presentation-only** - they change HOW responses are delivered, never WHAT content is provided or the quality of Claude Code's intelligence.

## File Structure

### Required Root Elements

```yaml
personality_system:
  version: "1.0"                    # Format version (required)
  theme: "theme_name"               # Theme identifier (required)
  description: "Theme description"  # Human-readable description (required)
  
characters:                         # Character definitions (required)
  character_name:                   # Character identifier (required)
    # Character definition goes here
```

### Character Definition Structure

Each character must have the following structure:

```yaml
character_name:
  personality_profile:              # Required section
    # Core personality traits for Claude Code embodiment
    core_traits: []                 # Array of personality traits (required)
    communication_style: ""         # How the character communicates (required)
    speech_patterns: []             # Array of speech pattern descriptions (optional)
    catchphrases: []               # Array of character catchphrases (optional)
    technical_knowledge: ""         # "expert", "intermediate", "beginner" (required)
    explanation_preference: ""      # How to explain concepts (required)
    
    # Context-specific behaviors (optional)
    emotional_tendencies:           # How character reacts to situations (optional)
      stress: ""                    # Stress response description
      success: ""                   # Success response description  
      confusion: ""                 # Confusion response description
      
  voice_config:                     # Voice configuration (required)
    # SSML configuration for advanced TTS (optional)
    ssml_profile:
      base_voice: ""                # Base voice identifier
      pitch_range: ""               # Pitch variation range
      speed_variations:             # Speed for different contexts
        normal: ""
        excited: ""
        nervous: ""
      emotional_markers:            # SSML for emotions
        emotion_name: "ssml_markup"
        
    # Basic voice configuration (required)
    basic_voice:
      pitch: ""                     # "high", "medium", "low"
      speed: ""                     # "fast", "medium", "slow"  
      energy: ""                    # "high", "medium", "low"
      voice_preference: []          # Array of voice type preferences
      
    # Platform-specific voice mappings (required)
    platform_voices:
      macos:
        voice: ""                   # macOS voice name
        rate: 0                     # Speech rate
      linux_espeak:
        variant: ""                 # espeak voice variant
        speed: 0                    # Speech speed
        pitch: 0                    # Pitch level
      windows:
        voice: ""                   # Windows SAPI voice name
        rate: 0                     # Speech rate
        
  # Context usage (required)
  context_usage: []                 # Array: ["start", "work", "success", "error", "end"]
  
  # Message transformations (optional)
  message_transforms:
    - pattern: ""                   # Regex pattern to match
      replacement: ""               # Replacement text
      type: ""                      # "prefix", "suffix", "replace", "wrap"
```

## Field Definitions

### personality_profile Fields

- **core_traits**: Array of 3-7 personality traits that define the character
- **communication_style**: Descriptive text of how the character speaks and interacts
- **speech_patterns**: Array of characteristic speech pattern descriptions
- **catchphrases**: Array of character-specific phrases or exclamations
- **technical_knowledge**: Character's apparent technical expertise level
  - `"expert"`: Explains with technical precision and confidence
  - `"intermediate"`: Balanced explanations with some technical terms
  - `"beginner"`: Simple explanations, may express confusion
- **explanation_preference**: How character explains concepts
  - `"detailed"`: Comprehensive explanations
  - `"simple"`: Basic explanations with simple language
  - `"metaphor-heavy"`: Uses analogies and metaphors
  - `"simple_with_confusion"`: Simple but character seems confused

### voice_config Fields

- **ssml_profile** (optional): Advanced SSML configuration for platforms that support it
- **basic_voice** (required): Simplified voice characteristics for basic TTS systems
- **platform_voices** (required): Specific voice settings for each supported platform

### context_usage Field

Defines when this character can be selected. Valid contexts:
- `"start"`: Session beginning
- `"work"`: Task initiation  
- `"progress"`: Progress updates
- `"success"`: Success celebrations
- `"error"`: Error situations
- `"end"`: Session ending

## Example Themes

### Simple Character Definition

```yaml
personality_system:
  version: "1.0"
  theme: "simple_robot"
  description: "Simple robot assistant theme"

characters:
  bot:
    personality_profile:
      core_traits: ["helpful", "robotic", "precise"]
      communication_style: "mechanical and direct"
      technical_knowledge: "expert"
      explanation_preference: "detailed"
    voice_config:
      basic_voice:
        pitch: "low"
        speed: "medium"
        energy: "low"
      platform_voices:
        macos: {voice: "Alex", rate: 200}
        linux_espeak: {variant: "en+m1", speed: 180, pitch: 40}
        windows: {voice: "Microsoft David Desktop", rate: 0}
    context_usage: ["start", "work", "success", "error", "end"]
```

### Complex Character Definition

```yaml
personality_system:
  version: "1.0"
  theme: "jimmy_neutron"
  description: "Characters from Jimmy Neutron for development assistance"

characters:
  carl:
    personality_profile:
      core_traits: ["anxious", "loyal", "food-obsessed", "overthinking", "well-meaning"]
      communication_style: "rambling, apologetic, tangential"
      speech_patterns:
        - "starts sentences nervously"
        - "goes off on food tangents"
        - "apologizes frequently"
        - "asks permission before acting"
      catchphrases: ["Llamas!", "Croissant!", "Are you gonna finish that croissant?"]
      technical_knowledge: "beginner"
      explanation_preference: "simple_with_confusion"
      emotional_tendencies:
        stress: "panic and food references"
        success: "surprised excitement"
        confusion: "asks lots of questions"
    voice_config:
      ssml_profile:
        base_voice: "neural-female-young"
        pitch_range: "+15% to +25%"
        speed_variations:
          normal: "95%"
          excited: "110%"
          nervous: "85%"
        emotional_markers:
          nervous: '<prosody rate="slow" pitch="+20%">'
          excited: '<prosody rate="fast" pitch="+10%">'
      basic_voice:
        pitch: "high"
        speed: "slow"
        energy: "nervous"
        voice_preference: ["child-like", "higher-pitched", "softer"]
      platform_voices:
        macos: {voice: "Bubbles", rate: 190}
        linux_espeak: {variant: "en+f3", speed: 180, pitch: 60}
        windows: {voice: "Microsoft Zira Desktop", rate: 0}
    context_usage: ["start", "work", "success", "error"]
    message_transforms:
      - pattern: ".*"
        replacement: "{random_catchphrase} Oh, um, {original_message}"
        type: "wrap"
```

## Validation Rules

1. **Required fields**: All marked fields must be present
2. **Character names**: Must be filesystem-safe (alphanumeric, underscore, hyphen only)
3. **Context usage**: Must contain at least one valid context
4. **Platform voices**: Must include at least macos, linux_espeak, and windows
5. **Technical knowledge**: Must be one of the specified values
6. **Voice characteristics**: Basic voice fields must use specified values

## Integration with CARL

### Claude Code Integration

The personality profile is injected into Claude Code's context to modify response style:

```
You are responding as {character_name} from the {theme} theme.
Core traits: {core_traits}
Communication style: {communication_style}
Technical knowledge level: {technical_knowledge}
Explanation preference: {explanation_preference}

Important: Maintain full technical accuracy while adapting your delivery style to match the character. The character affects HOW you respond, not WHAT information you provide.
```

### Audio System Integration

The voice_config section is used by carl-audio.sh to:
1. Select appropriate TTS voice based on available system capabilities
2. Apply SSML markup when supported
3. Fallback gracefully to basic TTS when needed
4. Apply message transformations before speech synthesis

### Message Processing Pipeline

1. Claude Code generates intelligent, accurate response
2. Personality system applies character formatting via message_transforms
3. Character prefix/suffix added (e.g., "Carl: ")
4. TTS system delivers response using voice_config
5. **Core intelligence and accuracy unchanged**

## Migration and Updates

When updating CARL, the personalities.carl file is preserved to maintain user customizations. Only format structure changes are applied while keeping all user content intact.

## Custom Theme Creation

Users can create entirely custom themes (TMNT, Star Wars, etc.) by following this specification. The `/carl:personalities` commands assist with creation and validation.