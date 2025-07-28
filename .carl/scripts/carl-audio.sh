#!/bin/bash

# CARL Audio System - Carl Wheezer Voice Feedback
# Cross-platform audio system for development feedback and encouragement

# Get CARL root directory
carl_audio_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Load personalities from personalities.carl file
load_personalities() {
    local carl_root="$(carl_audio_get_root)"
    local personalities_file="$carl_root/.carl/personalities.carl"
    
    # Check if personalities file exists
    if [ ! -f "$personalities_file" ]; then
        echo "⚠️  personalities.carl not found, using fallback personalities" >&2
        return 1
    fi
    
    # Validate YAML format (basic check)
    if ! grep -q "personality_system:" "$personalities_file" 2>/dev/null; then
        echo "⚠️  Invalid personalities.carl format, using fallback personalities" >&2
        return 1
    fi
    
    return 0
}

# Parse character data from personalities.carl
get_character_data() {
    local character="$1"
    local data_type="$2"  # "catchphrases", "transforms", "voice_config", etc.
    local carl_root="$(carl_audio_get_root)"
    local personalities_file="$carl_root/.carl/personalities.carl"
    
    if [ ! -f "$personalities_file" ]; then
        return 1
    fi
    
    # Basic YAML parsing for character data
    # This is a simplified parser - in production, might want to use proper YAML parser
    case "$data_type" in
        "catchphrases")
            # Extract catchphrases array for character
            sed -n "/characters:/,/^[[:space:]]*[^[:space:]]/p" "$personalities_file" | \
            sed -n "/${character}:/,/^[[:space:]]*[a-zA-Z]/p" | \
            sed -n "/catchphrases:/,/^[[:space:]]*[a-zA-Z]/p" | \
            grep -E '^\s*-\s*".*"' | sed 's/.*"\(.*\)".*/\1/'
            ;;
        "voice_macos")
            # Extract macOS voice settings
            sed -n "/characters:/,/^[[:space:]]*[^[:space:]]/p" "$personalities_file" | \
            sed -n "/${character}:/,/^[[:space:]]*[a-zA-Z]/p" | \
            sed -n "/platform_voices:/,/^[[:space:]]*[a-zA-Z]/p" | \
            sed -n "/macos:/,/^[[:space:]]*[a-zA-Z]/p"
            ;;
    esac
}

# Apply character-specific personality transforms from personalities.carl
add_character_personality() {
    local character="$1"
    local message="$2"
    local carl_root="$(carl_audio_get_root)"
    local personalities_file="$carl_root/.carl/personalities.carl"
    
    # If personalities.carl doesn't exist or is invalid, use fallback
    if ! load_personalities; then
        # Fallback to original hardcoded personalities for Jimmy Neutron characters
        case "$character" in
            "Jimmy"|"jimmy")
                echo "$message" | sed -E 's/\b(great|good|nice)\b/brain blast!/gi' | \
                sed -E 's/\b(let'\''s|we should)\b/according to my calculations, we should/gi' | \
                sed -E 's/\b(done|finished|complete)\b/scientifically sound!/gi'
                ;;
            "Carl"|"carl")
                local carl_phrases=("Llamas!" "Croissant!" "Are you gonna finish that croissant?")
                local random_phrase="${carl_phrases[$((RANDOM % ${#carl_phrases[@]}))]}"
                echo "$random_phrase Oh, um, $message"
                ;;
            "Sheen"|"sheen")
                echo "$message" | sed -E 's/\b(awesome|cool|great)\b/ULTRA LORD!/gi' | \
                sed -E 's/\b(ready|excited)\b/ultra-mega ready!/gi' | \
                sed -E 's/$/! This is like an Ultra Lord episode!/'
                ;;
            *)
                echo "$message"
                ;;
        esac
        return
    fi
    
    # Parse transforms from personalities.carl file
    local transformed_message="$message"
    local char_lower=$(echo "$character" | tr '[:upper:]' '[:lower:]')
    
    # Extract message transforms for this character
    local in_character=false
    local in_transforms=false
    
    while IFS= read -r line; do
        # Check if we're in the right character section
        if [[ "$line" =~ ^[[:space:]]*${char_lower}:[[:space:]]*$ ]]; then
            in_character=true
            continue
        elif [[ "$line" =~ ^[[:space:]]*[a-zA-Z_]+:[[:space:]]*$ ]] && [ "$in_character" = true ]; then
            # Entered a new character section
            in_character=false
            in_transforms=false
            continue
        fi
        
        # Check if we're in the message_transforms section
        if [ "$in_character" = true ] && [[ "$line" =~ ^[[:space:]]*message_transforms:[[:space:]]*$ ]]; then
            in_transforms=true
            continue
        elif [ "$in_character" = true ] && [[ "$line" =~ ^[[:space:]]*[a-zA-Z_]+:[[:space:]]*$ ]]; then
            in_transforms=false
            continue
        fi
        
        # Process transform rules
        if [ "$in_transforms" = true ]; then
            if [[ "$line" =~ pattern:[[:space:]]*\"(.*)\" ]]; then
                local pattern="${BASH_REMATCH[1]}"
                # Store pattern for next replacement line
                current_pattern="$pattern"
            elif [[ "$line" =~ replacement:[[:space:]]*\"(.*)\" ]]; then
                local replacement="${BASH_REMATCH[1]}"
                # Store replacement for next type line
                current_replacement="$replacement"
            elif [[ "$line" =~ type:[[:space:]]*\"(.*)\" ]]; then
                local transform_type="${BASH_REMATCH[1]}"
                
                # Apply the transformation
                case "$transform_type" in
                    "replace")
                        if [ -n "$current_pattern" ] && [ -n "$current_replacement" ]; then
                            # Handle special replacement tokens
                            if [[ "$current_replacement" == *"{random_catchphrase}"* ]]; then
                                # Get random catchphrase for character
                                local catchphrases=($(get_character_data "$char_lower" "catchphrases"))
                                if [ ${#catchphrases[@]} -gt 0 ]; then
                                    local random_catchphrase="${catchphrases[$((RANDOM % ${#catchphrases[@]}))]}"
                                    current_replacement="${current_replacement//\{random_catchphrase\}/$random_catchphrase}"
                                fi
                            fi
                            transformed_message=$(echo "$transformed_message" | sed -E "s/$current_pattern/$current_replacement/gi")
                        fi
                        ;;
                    "prefix")
                        transformed_message="$current_replacement$transformed_message"
                        ;;
                    "suffix")
                        transformed_message="$transformed_message$current_replacement"
                        ;;
                    "wrap")
                        if [[ "$current_replacement" == *"{original_message}"* ]]; then
                            # Handle special replacement tokens for wrap
                            local final_replacement="$current_replacement"
                            if [[ "$final_replacement" == *"{random_catchphrase}"* ]]; then
                                local catchphrases=($(get_character_data "$char_lower" "catchphrases"))
                                if [ ${#catchphrases[@]} -gt 0 ]; then
                                    local random_catchphrase="${catchphrases[$((RANDOM % ${#catchphrases[@]}))]}"
                                    final_replacement="${final_replacement//\{random_catchphrase\}/$random_catchphrase}"
                                fi
                            fi
                            transformed_message="${final_replacement//\{original_message\}/$transformed_message}"
                        fi
                        ;;
                esac
                
                # Clear stored values
                current_pattern=""
                current_replacement=""
            fi
        fi
    done < "$personalities_file"
    
    echo "$transformed_message"
}

# Get characters available for a context from personalities.carl
get_characters_for_context() {
    local category="$1"
    local carl_root="$(carl_audio_get_root)"
    local personalities_file="$carl_root/.carl/personalities.carl"
    local available_characters=()
    
    if [ ! -f "$personalities_file" ]; then
        return 1
    fi
    
    # Simple approach: extract character names and their context_usage
    # Look for patterns like "  jimmy:" followed by context_usage containing our category
    local current_character=""
    local in_characters_section=false
    
    while IFS= read -r line; do
        # Skip empty lines and comments
        [[ "$line" =~ ^[[:space:]]*$ ]] && continue
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        
        # Check if we're in the characters section
        if [[ "$line" =~ ^characters:[[:space:]]*$ ]]; then
            in_characters_section=true
            continue
        fi
        
        # If we hit a top-level section that's not characters, exit characters section
        if [[ "$line" =~ ^[a-zA-Z_]+:[[:space:]]*$ ]] && [ "$in_characters_section" = true ]; then
            in_characters_section=false
            continue
        fi
        
        # Look for character definitions (2+ spaces indented under characters)
        if [ "$in_characters_section" = true ] && [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z_]+):[[:space:]]*$ ]]; then
            current_character="${BASH_REMATCH[1]}"
            continue
        fi
        
        # Look for context_usage lines for current character
        if [ -n "$current_character" ] && [[ "$line" =~ context_usage:[[:space:]]*\[(.*)\] ]]; then
            local context_list="${BASH_REMATCH[1]}"
            # Check if our category is in the list
            if [[ "$context_list" == *"\"$category\""* ]]; then
                available_characters+=("$current_character")
            fi
            current_character=""  # Reset after processing
        fi
        
    done < "$personalities_file"
    
    # Output available characters
    printf '%s\n' "${available_characters[@]}"
}

# Character selection with color coding from personalities.carl
carl_select_character() {
    local category="$1"
    local characters
    local character_colors
    
    # Try to get characters from personalities.carl
    if load_personalities; then
        local available_chars=($(get_characters_for_context "$category"))
        if [ ${#available_chars[@]} -gt 0 ]; then
            characters=("${available_chars[@]}")
            # Generate colors for available characters (simple hash-based coloring)
            character_colors=()
            for char in "${characters[@]}"; do
                # Simple hash-based color assignment
                local hash=$(echo -n "$char" | md5sum | cut -c1-2)
                local color_index=$((0x$hash % 8))
                case $color_index in
                    0) character_colors+=("\033[1;34m") ;;  # Blue
                    1) character_colors+=("\033[1;33m") ;;  # Yellow  
                    2) character_colors+=("\033[1;35m") ;;  # Magenta
                    3) character_colors+=("\033[1;32m") ;;  # Green
                    4) character_colors+=("\033[1;36m") ;;  # Cyan
                    5) character_colors+=("\033[1;31m") ;;  # Red
                    6) character_colors+=("\033[1;91m") ;;  # Light Red
                    7) character_colors+=("\033[1;95m") ;;  # Light Magenta
                esac
            done
        fi
    fi
    
    # Fallback to hardcoded Jimmy Neutron characters if personalities.carl fails
    if [ ${#characters[@]} -eq 0 ]; then
        case "$category" in
            "start"|"session")
                characters=("Jimmy" "Carl" "Sheen" "Sam")
                character_colors=("\033[1;34m" "\033[1;33m" "\033[1;35m" "\033[1;92m")
                ;;
            "work"|"progress")
                characters=("Jimmy" "Carl" "Cindy" "Libby")
                character_colors=("\033[1;34m" "\033[1;33m" "\033[1;32m" "\033[1;36m")
                ;;
            "success"|"celebration")
                characters=("Carl" "Sheen" "Jimmy" "Hugh")
                character_colors=("\033[1;33m" "\033[1;35m" "\033[1;34m" "\033[1;31m")
                ;;
            "error"|"problem")
                characters=("Jimmy" "Cindy" "Carl")
                character_colors=("\033[1;34m" "\033[1;32m" "\033[1;33m")
                ;;
            *)
                characters=("Jimmy" "Carl" "Sheen" "Cindy")
                character_colors=("\033[1;34m" "\033[1;33m" "\033[1;35m" "\033[1;32m")
                ;;
        esac
    fi
    
    # Select random character and corresponding color
    local index=$((RANDOM % ${#characters[@]}))
    local character="${characters[$index]}"
    local color="${character_colors[$index]}"
    
    echo "$character|$color"
}

# Main audio playback function with Jimmy Neutron cast
carl_play_audio() {
    local category="$1"
    local message="$2"
    local carl_root="$(carl_audio_get_root)"
    
    # Source helper functions for settings
    source "$carl_root/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
    
    # Check if audio is enabled
    local audio_enabled=$(carl_get_setting 'audio_enabled' 2>/dev/null || echo "true")
    local quiet_mode=$(carl_get_setting 'quiet_mode' 2>/dev/null || echo "false")
    
    # Select character for this message
    local char_info=$(carl_select_character "$category")
    local character=$(echo "$char_info" | cut -d'|' -f1)
    local color=$(echo "$char_info" | cut -d'|' -f2)
    local reset_color="\033[0m"
    
    # Personalize message for Clayton and add character personality
    local personalized_message=$(echo "$message" | sed 's/\buser\b/Clayton/gi' | sed 's/\bdeveloper\b/Clayton/gi')
    personalized_message=$(add_character_personality "$character" "$personalized_message")
    
    if [ "$audio_enabled" = "false" ] || [ "$quiet_mode" = "true" ]; then
        # Always show text feedback even in quiet mode with character format
        echo -e "🎵 ${color}${character}:${reset_color} $personalized_message"
        return 0
    fi
    
    # Check for quiet hours
    if carl_is_quiet_hours; then
        echo -e "🔇 ${color}${character} (quiet hours):${reset_color} $personalized_message"
        return 0
    fi
    
    # Try to play audio file first, fall back to TTS
    local audio_played=false
    
    # Attempt to play pre-recorded audio files
    if carl_play_audio_file "$category" "$character"; then
        audio_played=true
    fi
    
    # Fall back to text-to-speech if no audio file played
    if [ "$audio_played" = "false" ]; then
        carl_speak_message "$personalized_message" "$character"
    fi
    
    # Always provide text fallback with character format
    echo -e "🎵 ${color}${character}:${reset_color} $personalized_message"
}

# Play pre-recorded audio files
carl_play_audio_file() {
    local category="$1"
    local character="$2"
    local carl_root="$(carl_audio_get_root)"
    
    # Try character-specific audio first, then fall back to general category
    local audio_dirs=(
        "$carl_root/.carl/audio/$category/$character"
        "$carl_root/.carl/audio/$category/general"
        "$carl_root/.carl/audio/$category"
    )
    
    local audio_file=""
    for audio_dir in "${audio_dirs[@]}"; do
        if [ -d "$audio_dir" ] && [ -n "$(ls "$audio_dir"/*.{wav,mp3,ogg} 2>/dev/null)" ]; then
            audio_file=$(ls "$audio_dir"/*.{wav,mp3,ogg} 2>/dev/null | shuf -n 1)
            if [ -f "$audio_file" ]; then
                echo "🎵 Playing character-specific audio: $(basename "$audio_file")" >&2
                break
            fi
        fi
    done
    
    # If no audio file found, return failure
    if [ ! -f "$audio_file" ]; then
        return 1
    fi
    
    # Play audio based on operating system
    case "$(uname -s)" in
        Darwin*)
            # macOS
            if command -v afplay >/dev/null 2>&1; then
                afplay "$audio_file" 2>/dev/null &
                return 0
            fi
            ;;
        Linux*)
            # Linux - try multiple audio systems
            if command -v paplay >/dev/null 2>&1; then
                paplay "$audio_file" 2>/dev/null &
                return 0
            elif command -v aplay >/dev/null 2>&1; then
                aplay "$audio_file" 2>/dev/null &
                return 0
            elif command -v mpg123 >/dev/null 2>&1; then
                mpg123 -q "$audio_file" 2>/dev/null &
                return 0
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            # Windows
            if command -v powershell >/dev/null 2>&1; then
                powershell -c "(New-Object Media.SoundPlayer '$audio_file').PlaySync();" 2>/dev/null &
                return 0
            fi
            ;;
    esac
    
    return 1
}

# Get voice settings for character from personalities.carl
get_character_voice_settings() {
    local character="$1"
    local platform="$2"  # "macos", "linux_espeak", "windows"
    local carl_root="$(carl_audio_get_root)"
    local personalities_file="$carl_root/.carl/personalities.carl"
    
    if [ ! -f "$personalities_file" ]; then
        return 1
    fi
    
    local char_lower=$(echo "$character" | tr '[:upper:]' '[:lower:]')
    local in_character=false
    local in_platform_voices=false
    local in_platform=false
    
    while IFS= read -r line; do
        # Check if we're in the right character section
        if [[ "$line" =~ ^[[:space:]]*${char_lower}:[[:space:]]*$ ]]; then
            in_character=true
            continue
        elif [[ "$line" =~ ^[[:space:]]*[a-zA-Z_]+:[[:space:]]*$ ]] && [ "$in_character" = true ]; then
            in_character=false
            in_platform_voices=false
            in_platform=false
            continue
        fi
        
        # Check if we're in platform_voices section
        if [ "$in_character" = true ] && [[ "$line" =~ ^[[:space:]]*platform_voices:[[:space:]]*$ ]]; then
            in_platform_voices=true
            continue
        fi
        
        # Check if we're in the specific platform section
        if [ "$in_platform_voices" = true ] && [[ "$line" =~ ^[[:space:]]*${platform}:[[:space:]]*$ ]]; then
            in_platform=true
            continue
        elif [ "$in_platform_voices" = true ] && [[ "$line" =~ ^[[:space:]]*[a-zA-Z_]+:[[:space:]]*$ ]]; then
            in_platform=false
        fi
        
        # Extract platform-specific settings
        if [ "$in_platform" = true ]; then
            if [[ "$line" =~ voice:[[:space:]]*\"?([^\"]+)\"? ]] || [[ "$line" =~ voice:[[:space:]]*([^[:space:]]+) ]]; then
                echo "voice=${BASH_REMATCH[1]}"
            elif [[ "$line" =~ variant:[[:space:]]*\"?([^\"]+)\"? ]] || [[ "$line" =~ variant:[[:space:]]*([^[:space:]]+) ]]; then
                echo "variant=${BASH_REMATCH[1]}"
            elif [[ "$line" =~ rate:[[:space:]]*([0-9-]+) ]]; then
                echo "rate=${BASH_REMATCH[1]}"
            elif [[ "$line" =~ speed:[[:space:]]*([0-9]+) ]]; then
                echo "speed=${BASH_REMATCH[1]}"
            elif [[ "$line" =~ pitch:[[:space:]]*([0-9]+) ]]; then
                echo "pitch=${BASH_REMATCH[1]}"
            fi
        fi
    done < "$personalities_file"
}

# Text-to-speech with personalities.carl voice settings
carl_speak_message() {
    local message="$1"
    local character="${2:-carl}"  # Default to carl if no character specified
    
    # Clean message for TTS (remove emojis and special characters)
    local clean_message=$(echo "$message" | sed 's/[^a-zA-Z0-9 .,!?-]//g')
    
    case "$(uname -s)" in
        Darwin*)
            # macOS - use built-in say command with character-appropriate voice
            if command -v say >/dev/null 2>&1; then
                local voice="Alex"  # default
                local rate=200      # default
                
                # Try to get voice settings from personalities.carl
                if load_personalities; then
                    local voice_settings=$(get_character_voice_settings "$character" "macos")
                    if [ -n "$voice_settings" ]; then
                        eval "$voice_settings"  # Sets voice= and rate= variables
                    fi
                else
                    # Fallback to hardcoded voice settings
                    case "$character" in
                        "Jimmy"|"jimmy")
                            voice="Alex"
                            rate=210
                            ;;
                        "Carl"|"carl")
                            voice="Bubbles"
                            rate=190
                            ;;
                        "Sheen"|"sheen")
                            voice="Boing"
                            rate=250
                            ;;
                        *)
                            voice="Bubbles"
                            rate=200
                            ;;
                    esac
                fi
                
                say -v "$voice" -r "$rate" "$clean_message" 2>/dev/null &
            fi
            ;;
        Linux*)
            # Check if running in WSL
            if grep -qi microsoft /proc/version 2>/dev/null; then
                # WSL - use Windows TTS via PowerShell with character-specific settings
                if command -v powershell.exe >/dev/null 2>&1; then
                    local voice_name
                    local rate
                    case "$character" in
                        "Jimmy")
                            voice_name="Microsoft David Desktop"
                            rate=1
                            ;;
                        "Carl")
                            voice_name="Microsoft Zira Desktop"
                            rate=0
                            ;;
                        "Sheen")
                            voice_name="Microsoft David Desktop"
                            rate=3
                            ;;
                        "Cindy"|"Libby")
                            voice_name="Microsoft Zira Desktop"
                            rate=1
                            ;;
                        "Hugh")
                            voice_name="Microsoft David Desktop"
                            rate=-1
                            ;;
                        "Judy")
                            voice_name="Microsoft Zira Desktop"
                            rate=0
                            ;;
                        "Ms. Fowl")
                            voice_name="Microsoft Zira Desktop"
                            rate=-2
                            ;;
                        "Sam")
                            voice_name="Microsoft David Desktop"
                            rate=0
                            ;;
                        "Principal Willoughby")
                            voice_name="Microsoft David Desktop"
                            rate=-1
                            ;;
                        *)
                            voice_name="Microsoft Zira Desktop"
                            rate=0
                            ;;
                    esac
                    powershell.exe -c "Add-Type -AssemblyName System.Speech; \$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { \$speak.SelectVoice('$voice_name') } catch { }; \$speak.Rate = $rate; \$speak.Volume = 100; \$speak.Speak('$clean_message')" 2>/dev/null &
                fi
            else
                # Native Linux - use espeak or festival with character-specific settings
                if command -v espeak >/dev/null 2>&1; then
                    local variant
                    local speed
                    local pitch
                    case "$character" in
                        "Jimmy")
                            variant="en+m3"
                            speed=200
                            pitch=50
                            ;;
                        "Carl")
                            variant="en+f3"
                            speed=180
                            pitch=60
                            ;;
                        "Sheen")
                            variant="en+m2"
                            speed=220
                            pitch=70
                            ;;
                        "Cindy")
                            variant="en+f2"
                            speed=190
                            pitch=55
                            ;;
                        "Libby")
                            variant="en+f1"
                            speed=180
                            pitch=45
                            ;;
                        "Hugh")
                            variant="en+m7"
                            speed=160
                            pitch=40
                            ;;
                        "Judy")
                            variant="en+f4"
                            speed=175
                            pitch=50
                            ;;
                        "Ms. Fowl")
                            variant="en+f5"
                            speed=150
                            pitch=75
                            ;;
                        "Sam")
                            variant="en+m4"
                            speed=170
                            pitch=45
                            ;;
                        "Principal Willoughby")
                            variant="en+m5"
                            speed=165
                            pitch=35
                            ;;
                        *)
                            variant="en+f3"
                            speed=180
                            pitch=60
                            ;;
                    esac
                    espeak -v "$variant" -s "$speed" -p "$pitch" "$clean_message" 2>/dev/null &
                elif command -v festival >/dev/null 2>&1; then
                    echo "$clean_message" | festival --tts 2>/dev/null &
                elif command -v spd-say >/dev/null 2>&1; then
                    # Use character-specific settings for spd-say
                    local rate
                    local pitch
                    case "$character" in
                        "Jimmy") rate=10; pitch=50 ;;
                        "Carl") rate=0; pitch=80 ;;
                        "Sheen") rate=30; pitch=90 ;;
                        "Cindy") rate=10; pitch=60 ;;
                        "Libby") rate=0; pitch=40 ;;
                        "Hugh") rate=-10; pitch=30 ;;
                        "Judy") rate=5; pitch=55 ;;
                        "Ms. Fowl") rate=-5; pitch=85 ;;
                        "Sam") rate=0; pitch=45 ;;
                        "Principal Willoughby") rate=-10; pitch=25 ;;
                        *) rate=20; pitch=80 ;;
                    esac
                    spd-say -r "$rate" -p "$pitch" "$clean_message" 2>/dev/null &
                fi
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            # Windows - use SAPI TTS with character-specific settings
            if command -v powershell >/dev/null 2>&1; then
                local voice_name
                local rate
                case "$character" in
                    "Jimmy")
                        voice_name="Microsoft David Desktop"
                        rate=1
                        ;;
                    "Carl")
                        voice_name="Microsoft Zira Desktop"
                        rate=0
                        ;;
                    "Sheen")
                        voice_name="Microsoft David Desktop"
                        rate=3
                        ;;
                    "Cindy"|"Libby")
                        voice_name="Microsoft Zira Desktop"
                        rate=1
                        ;;
                    "Hugh")
                        voice_name="Microsoft David Desktop"
                        rate=-1
                        ;;
                    "Judy")
                        voice_name="Microsoft Zira Desktop"
                        rate=0
                        ;;
                    "Ms. Fowl")
                        voice_name="Microsoft Zira Desktop"
                        rate=-2
                        ;;
                    "Sam")
                        voice_name="Microsoft David Desktop"
                        rate=0
                        ;;
                    "Principal Willoughby")
                        voice_name="Microsoft David Desktop"
                        rate=-1
                        ;;
                    *)
                        voice_name="Microsoft Zira Desktop"
                        rate=0
                        ;;
                esac
                powershell -c "Add-Type -AssemblyName System.Speech; \$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { \$speak.SelectVoice('$voice_name') } catch { }; \$speak.Rate = $rate; \$speak.Volume = 100; \$speak.Speak('$clean_message')" 2>/dev/null &
            fi
            ;;
    esac
}

# Check if current time is within quiet hours
carl_is_quiet_hours() {
    local carl_root="$(carl_audio_get_root)"
    
    # Source helper functions for settings
    source "$carl_root/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
    
    # Check if quiet hours are enabled
    local quiet_hours_enabled=$(carl_get_setting 'quiet_hours_enabled' 2>/dev/null || echo "false")
    
    if [ "$quiet_hours_enabled" = "false" ]; then
        return 1
    fi
    
    # Get quiet hours settings
    local start_time=$(carl_get_setting 'quiet_hours_start' 2>/dev/null || echo "22:00")
    local end_time=$(carl_get_setting 'quiet_hours_end' 2>/dev/null || echo "08:00")
    
    # Get current time in 24-hour format
    local current_time=$(date +%H:%M)
    local current_hour=$(date +%H)
    local current_minute=$(date +%M)
    local current_total=$(( current_hour * 60 + current_minute ))
    
    # Parse start and end times
    local start_hour=$(echo "$start_time" | cut -d':' -f1)
    local start_minute=$(echo "$start_time" | cut -d':' -f2)
    local start_total=$(( start_hour * 60 + start_minute ))
    
    local end_hour=$(echo "$end_time" | cut -d':' -f1)
    local end_minute=$(echo "$end_time" | cut -d':' -f2)
    local end_total=$(( end_hour * 60 + end_minute ))
    
    # Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if [ "$start_total" -gt "$end_total" ]; then
        # Quiet hours span midnight
        if [ "$current_total" -ge "$start_total" ] || [ "$current_total" -le "$end_total" ]; then
            return 0  # In quiet hours
        fi
    else
        # Quiet hours within same day
        if [ "$current_total" -ge "$start_total" ] && [ "$current_total" -le "$end_total" ]; then
            return 0  # In quiet hours
        fi
    fi
    
    return 1  # Not in quiet hours
}

# Test audio system functionality
carl_test_audio() {
    local carl_root="$(carl_audio_get_root)"
    
    echo "🔊 Testing CARL Audio System..."
    echo "=================================="
    
    # Test system capabilities
    echo "🖥️  Operating System: $(uname -s)"
    
    # Test audio commands availability
    echo ""
    echo "🎵 Available Audio Commands:"
    case "$(uname -s)" in
        Darwin*)
            if command -v afplay >/dev/null 2>&1; then
                echo "   ✅ afplay (macOS audio player)"
            fi
            if command -v say >/dev/null 2>&1; then
                echo "   ✅ say (macOS text-to-speech)"
            fi
            ;;
        Linux*)
            if command -v paplay >/dev/null 2>&1; then
                echo "   ✅ paplay (PulseAudio)"
            fi
            if command -v aplay >/dev/null 2>&1; then
                echo "   ✅ aplay (ALSA)"
            fi
            if command -v espeak >/dev/null 2>&1; then
                echo "   ✅ espeak (text-to-speech)"
            fi
            if command -v festival >/dev/null 2>&1; then
                echo "   ✅ festival (text-to-speech)"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            if command -v powershell >/dev/null 2>&1; then
                echo "   ✅ PowerShell (Windows audio/TTS)"
            fi
            ;;
    esac
    
    # Test audio directories
    echo ""
    echo "🎼 Audio File Status:"
    for category in start work progress success end; do
        local audio_dir="$carl_root/.carl/audio/$category"
        if [ -d "$audio_dir" ]; then
            local file_count=$(ls "$audio_dir" 2>/dev/null | wc -l)
            if [ "$file_count" -gt 0 ]; then
                echo "   ✅ $category: $file_count audio files"
            else
                echo "   📁 $category: directory exists but no audio files"
            fi
        else
            echo "   ❌ $category: directory not found"
        fi
    done
    
    # Test current settings
    echo ""
    echo "⚙️  Current Settings:"
    source "$carl_root/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
    echo "   Audio Enabled: $(carl_get_setting 'audio_enabled' 2>/dev/null || echo 'true')"
    echo "   Quiet Mode: $(carl_get_setting 'quiet_mode' 2>/dev/null || echo 'false')"
    echo "   Quiet Hours: $(carl_get_setting 'quiet_hours_enabled' 2>/dev/null || echo 'false')"
    
    # Test audio playback
    echo ""
    echo "🎤 Testing Audio Playback..."
    echo "   Playing test audio (TTS fallback)..."
    
    carl_play_audio "start" "This is a test of the CARL audio system! If you can hear this, everything is working perfectly!"
    
    sleep 2
    
    echo ""
    echo "✅ Audio test complete!"
    echo "   If you heard audio, the system is working correctly."
    echo "   If not, check your system audio settings and available commands above."
}

# Install sample TTS phrases for different categories
carl_install_sample_audio() {
    local carl_root="$(carl_audio_get_root)"
    
    echo "🎵 Installing sample audio phrases for CARL..."
    
    # Create sample phrase files that could be used with TTS or replaced with actual audio
    cat > "$carl_root/.carl/audio/sample-phrases.txt" << 'EOF'
# CARL Audio Phrases - Replace these with actual Carl Wheezer audio files
# Or use these as TTS input for consistent messaging

START_PHRASES:
- "Hey there! CARL's ready to help with your coding!"
- "Llamas! I mean... hello! Let's get coding!"
- "Croissant! Wait, no... let's build something awesome!"
- "Hi! CARL is loaded and ready for development!"

WORK_PHRASES:
- "Time to get coding! This is gonna be sweet!"
- "Let's build something amazing together!"
- "Coding time! I love the smell of fresh code!"
- "Here we go! Ready to make some magic happen!"

PROGRESS_PHRASES:
- "Nice work! CARL's updating all the records!"
- "Great progress! You're doing fantastic!"
- "Awesome! The code is looking really good!"
- "Sweet! That's some quality development right there!"

SUCCESS_PHRASES:
- "Tests are passing! Great job, my friend!"
- "Build successful! You're on fire today!"
- "Excellent work! That's what I call coding!"
- "Outstanding! Everything looks perfect!"

END_PHRASES:
- "Good work today! CARL's got everything saved!"
- "Awesome session! See you next time, buddy!"
- "Great coding! CARL has all your progress tracked!"
- "Fantastic work! Until next time, keep coding!"
EOF

    echo "✅ Sample phrases installed at .carl/audio/sample-phrases.txt"
    echo ""
    echo "🎬 To add Carl Wheezer audio files:"
    echo "   1. Find or generate Carl Wheezer voice clips"
    echo "   2. Save them as .wav or .mp3 files in:"
    echo "      - .carl/audio/start/ (session start sounds)" 
    echo "      - .carl/audio/work/ (work beginning sounds)"
    echo "      - .carl/audio/progress/ (progress update sounds)"
    echo "      - .carl/audio/success/ (success celebration sounds)"
    echo "      - .carl/audio/end/ (session end sounds)"
    echo "   3. CARL will randomly select from available files"
    echo ""
    echo "📢 Current fallback: TTS with character-like voice settings"
}

# Set audio volume (if supported by system)
carl_set_volume() {
    local volume="$1"  # 0-100
    
    if [ -z "$volume" ] || [ "$volume" -lt 0 ] || [ "$volume" -gt 100 ]; then
        echo "❌ Invalid volume. Please specify 0-100."
        return 1
    fi
    
    case "$(uname -s)" in
        Darwin*)
            # macOS
            osascript -e "set volume output volume $volume" 2>/dev/null
            echo "🔊 Volume set to $volume% (macOS)"
            ;;
        Linux*)
            # Linux with PulseAudio
            if command -v pactl >/dev/null 2>&1; then
                pactl set-sink-volume @DEFAULT_SINK@ "${volume}%" 2>/dev/null
                echo "🔊 Volume set to $volume% (PulseAudio)"
            elif command -v amixer >/dev/null 2>&1; then
                amixer set Master "${volume}%" 2>/dev/null
                echo "🔊 Volume set to $volume% (ALSA)"
            else
                echo "⚠️  Volume control not available on this Linux system"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            # Windows
            echo "⚠️  Volume control not implemented for Windows (use system settings)"
            ;;
    esac
}

# Quick audio test with specific category
carl_test_category() {
    local category="$1"
    
    if [ -z "$category" ]; then
        echo "Usage: carl_test_category <start|work|progress|success|end>"
        return 1
    fi
    
    case "$category" in
        "start")
            carl_play_audio "start" "Testing startup audio! CARL is ready to help!"
            ;;
        "work")
            carl_play_audio "work" "Testing work audio! Time to get coding!"
            ;;
        "progress")
            carl_play_audio "progress" "Testing progress audio! Great work so far!"
            ;;
        "success")
            carl_play_audio "success" "Testing success audio! Excellent job!"
            ;;
        "end")
            carl_play_audio "end" "Testing end audio! Great session today!"
            ;;
        *)
            echo "❌ Unknown category: $category"
            echo "Available categories: start, work, progress, success, end"
            return 1
            ;;
    esac
}

# Refresh CARL audio system (for updates)
carl_refresh_audio() {
    local carl_root="$(carl_audio_get_root)"
    
    echo "🔄 Refreshing CARL Audio System..."
    
    # Re-source this script to get latest personality changes
    source "$carl_root/.carl/scripts/carl-audio.sh"
    
    # Update directory structure for any new characters
    local categories=("start" "work" "progress" "success" "end")
    local characters=("Jimmy" "Carl" "Sheen" "Cindy" "Libby" "Hugh" "Judy" "Ms. Fowl" "Sam" "Principal Willoughby")
    
    for category in "${categories[@]}"; do
        # Create general category directory if missing
        mkdir -p "$carl_root/.carl/audio/$category/general"
        
        # Create character-specific directories if missing
        for character in "${characters[@]}"; do
            mkdir -p "$carl_root/.carl/audio/$category/$character"
        done
    done
    
    echo "✅ CARL Audio System refreshed with latest personality updates!"
    echo "🎭 All Jimmy Neutron character personalities are now active"
    
    # Test the system
    echo ""
    echo "🧪 Testing personality system..."
    carl_play_audio "start" "CARL personality system has been updated!"
}

# Initialize audio system on first run
carl_init_audio() {
    local carl_root="$(carl_audio_get_root)"
    
    echo "🎵 Initializing CARL Audio System..."
    
    # Create audio directories for each category and character
    local categories=("start" "work" "progress" "success" "end")
    local characters=("Jimmy" "Carl" "Sheen" "Cindy" "Libby" "Hugh" "Judy" "Ms. Fowl" "Sam" "Principal Willoughby")
    
    for category in "${categories[@]}"; do
        # Create general category directory
        mkdir -p "$carl_root/.carl/audio/$category/general"
        
        # Create character-specific directories
        for character in "${characters[@]}"; do
            mkdir -p "$carl_root/.carl/audio/$category/$character"
        done
    done
    
    # Install sample phrases
    carl_install_sample_audio
    
    # Test system
    carl_test_audio
    
    echo ""
    echo "✅ CARL Audio System initialized!"
    echo "🎤 Use 'carl_test_category <category>' to test specific audio types"
    echo "⚙️  Use '/settings --audio-test' from Claude Code to run full audio test"
}