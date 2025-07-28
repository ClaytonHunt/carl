#!/bin/bash

# CARL Audio System - Carl Wheezer Voice Feedback
# Cross-platform audio system for development feedback and encouragement

# Get CARL root directory
carl_audio_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Jimmy Neutron character selection and color coding
carl_select_character() {
    local category="$1"
    local characters
    local character_colors
    
    # Define character pool based on context category
    case "$category" in
        "start"|"session")
            characters=("Jimmy" "Carl" "Sheen" "Ms. Fowl" "Sam")
            character_colors=("\033[1;34m" "\033[1;33m" "\033[1;35m" "\033[1;95m" "\033[1;92m")  # Blue, Yellow, Magenta, Light Magenta, Light Green
            ;;
        "work"|"progress")
            characters=("Jimmy" "Carl" "Cindy" "Libby" "Ms. Fowl" "Principal Willoughby")
            character_colors=("\033[1;34m" "\033[1;33m" "\033[1;32m" "\033[1;36m" "\033[1;95m" "\033[1;90m")  # Blue, Yellow, Green, Cyan, Light Magenta, Bright Black
            ;;
        "success"|"celebration")
            characters=("Carl" "Sheen" "Jimmy" "Hugh" "Judy" "Sam")
            character_colors=("\033[1;33m" "\033[1;35m" "\033[1;34m" "\033[1;31m" "\033[1;91m" "\033[1;92m")  # Yellow, Magenta, Blue, Red, Light Red, Light Green
            ;;
        "error"|"problem")
            characters=("Jimmy" "Cindy" "Carl" "Ms. Fowl" "Principal Willoughby")
            character_colors=("\033[1;34m" "\033[1;32m" "\033[1;33m" "\033[1;95m" "\033[1;90m")  # Blue, Green, Yellow, Light Magenta, Bright Black
            ;;
        *)
            characters=("Jimmy" "Carl" "Sheen" "Cindy" "Libby" "Hugh" "Judy" "Ms. Fowl" "Sam" "Principal Willoughby")
            character_colors=("\033[1;34m" "\033[1;33m" "\033[1;35m" "\033[1;32m" "\033[1;36m" "\033[1;31m" "\033[1;91m" "\033[1;95m" "\033[1;92m" "\033[1;90m")
            ;;
    esac
    
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
    
    # Personalize message for Clayton
    local personalized_message=$(echo "$message" | sed 's/\buser\b/Clayton/gi' | sed 's/\bdeveloper\b/Clayton/gi')
    
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
    if carl_play_audio_file "$category"; then
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
    local carl_root="$(carl_audio_get_root)"
    local audio_dir="$carl_root/.carl/audio/$category"
    
    # Check if audio directory exists and has files
    if [ ! -d "$audio_dir" ] || [ -z "$(ls "$audio_dir" 2>/dev/null)" ]; then
        return 1
    fi
    
    # Select random audio file from category
    local audio_file=$(ls "$audio_dir"/* 2>/dev/null | shuf -n 1)
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

# Text-to-speech fallback with Carl-like voice
carl_speak_message() {
    local message="$1"
    local character="${2:-Carl}"  # Default to Carl if no character specified
    
    # Clean message for TTS (remove emojis and special characters)
    local clean_message=$(echo "$message" | sed 's/[^a-zA-Z0-9 .,!?-]//g')
    
    case "$(uname -s)" in
        Darwin*)
            # macOS - use built-in say command with character-appropriate voice
            if command -v say >/dev/null 2>&1; then
                local voice
                local rate
                case "$character" in
                    "Jimmy")
                        # Jimmy: confident, smart
                        voice="Alex"
                        rate=210
                        ;;
                    "Carl")
                        # Carl: wheezy, enthusiastic  
                        voice="Bubbles"
                        rate=190
                        ;;
                    "Sheen")
                        # Sheen: hyper, excitable
                        voice="Boing"
                        rate=250
                        ;;
                    "Cindy")
                        # Cindy: confident, smart female
                        voice="Samantha"
                        rate=200
                        ;;
                    "Libby")
                        # Libby: cool, supportive female
                        voice="Karen"
                        rate=180
                        ;;
                    "Hugh")
                        # Hugh: quirky dad
                        voice="Bruce"
                        rate=170
                        ;;
                    "Judy")
                        # Judy: caring mom
                        voice="Allison"
                        rate=185
                        ;;
                    "Ms. Fowl")
                        # Ms. Fowl: bird-like teacher
                        voice="Zarvox"
                        rate=160
                        ;;
                    "Sam")
                        # Sam: candy shop owner
                        voice="Fred"
                        rate=175
                        ;;
                    "Principal Willoughby")
                        # Principal Willoughby: authority figure
                        voice="Ralph"
                        rate=165
                        ;;
                    *)
                        voice="Bubbles"
                        rate=200
                        ;;
                esac
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

# Initialize audio system on first run
carl_init_audio() {
    local carl_root="$(carl_audio_get_root)"
    
    echo "🎵 Initializing CARL Audio System..."
    
    # Create audio directories
    mkdir -p "$carl_root/.carl/audio"/{start,work,progress,success,end}
    
    # Install sample phrases
    carl_install_sample_audio
    
    # Test system
    carl_test_audio
    
    echo ""
    echo "✅ CARL Audio System initialized!"
    echo "🎤 Use 'carl_test_category <category>' to test specific audio types"
    echo "⚙️  Use '/settings --audio-test' from Claude Code to run full audio test"
}