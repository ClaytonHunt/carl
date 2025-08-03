#!/bin/bash
# carl-platform.sh - Cross-platform utilities for CARL hooks
# Dependencies: None (pure bash)

# Detect current platform
detect_platform() {
    # Check for WSL first (Linux kernel but Windows environment)
    if grep -qEi "(microsoft|wsl)" /proc/version 2>/dev/null; then
        echo "wsl"
    else
        case "$(uname -s)" in
            Darwin*)    echo "macos" ;;
            Linux*)     echo "linux" ;;
            MINGW*|CYGWIN*|MSYS*) echo "windows" ;;
            *)          echo "unknown" ;;
        esac
    fi
}

# Cross-platform text-to-speech with CARL settings integration
speak_message() {
    local message="$1"
    local notification_type="$2"
    
    # Source settings if available
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "$script_dir/carl-settings.sh" ]]; then
        source "$script_dir/carl-settings.sh"
        
        # Check if audio is enabled for this notification type
        if [[ -n "$notification_type" ]] && ! is_notification_enabled "$notification_type"; then
            return 0
        elif [[ -z "$notification_type" ]] && ! is_audio_enabled; then
            return 0
        fi
    fi
    
    local platform=$(detect_platform)
    
    # Source settings for voice configuration
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "$script_dir/carl-settings.sh" ]]; then
        source "$script_dir/carl-settings.sh"
        
        # Check for ElevenLabs integration first
        local elevenlabs_enabled=$(get_carl_setting "audio.voice.elevenlabs.enabled" "false")
        if [[ "$elevenlabs_enabled" == "true" ]]; then
            speak_with_elevenlabs "$message"
            return $?
        fi
    fi
    
    case "$platform" in
        "macos")
            if command -v say >/dev/null 2>&1; then
                local voice=$(get_carl_setting "audio.voice.macos.voice" "default")
                local rate=$(get_carl_setting "audio.voice.macos.rate" "200")
                local volume=$(get_carl_setting "audio.voice.macos.volume" "0.5")
                
                local say_args=""
                [[ "$voice" != "default" ]] && say_args="$say_args -v $voice"
                [[ "$rate" != "200" ]] && say_args="$say_args -r $rate"
                
                say $say_args "$message"
            fi
            ;;
        "linux")
            if command -v spd-say >/dev/null 2>&1; then
                local rate=$(get_carl_setting "audio.voice.linux.rate" "normal")
                local volume=$(get_carl_setting "audio.voice.linux.volume" "normal")
                
                local spd_args=""
                [[ "$rate" != "normal" ]] && spd_args="$spd_args -r $rate"
                [[ "$volume" != "normal" ]] && spd_args="$spd_args -i $volume"
                
                spd-say $spd_args "$message"
            elif command -v espeak >/dev/null 2>&1; then
                espeak "$message"
            fi
            ;;
        "wsl"|"windows")
            if command -v powershell.exe >/dev/null 2>&1; then
                local rate=$(get_carl_setting "audio.voice.${platform}.rate" "0")
                local volume=$(get_carl_setting "audio.voice.${platform}.volume" "100")
                
                powershell.exe -Command "
                Add-Type -AssemblyName System.Speech; 
                \$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
                \$synth.Rate = $rate;
                \$synth.Volume = $volume;
                \$synth.Speak('$message')"
            fi
            ;;
    esac
}

# ElevenLabs TTS integration (future enhancement)
speak_with_elevenlabs() {
    local message="$1"
    
    # Source settings
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "$script_dir/carl-settings.sh" ]]; then
        source "$script_dir/carl-settings.sh"
        
        local api_key_env=$(get_carl_setting "audio.voice.elevenlabs.api_key_env" "ELEVENLABS_API_KEY")
        local voice_id=$(get_carl_setting "audio.voice.elevenlabs.voice_id" "21m00Tcm4TlvDq8ikWAM")
        local model=$(get_carl_setting "audio.voice.elevenlabs.model" "eleven_monolingual_v1")
        local output_format=$(get_carl_setting "audio.voice.elevenlabs.output_format" "mp3_44100_128")
        local cache_audio=$(get_carl_setting "audio.voice.elevenlabs.cache_audio" "true")
        
        # Check for API key
        local api_key="${!api_key_env}"
        if [[ -z "$api_key" ]]; then
            echo "ElevenLabs API key not found in environment variable: $api_key_env" >&2
            return 1
        fi
        
        # TODO: Implement ElevenLabs API call
        # This would require curl and audio playback utilities
        # For now, fallback to platform TTS
        echo "ElevenLabs integration not yet implemented, falling back to platform TTS" >&2
        return 1
    fi
    
    return 1
}

# CARL-aware notification function
send_carl_notification() {
    local notification_type="$1"
    local custom_message="$2"
    shift 2
    local variables=("$@")
    
    # Source settings
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "$script_dir/carl-settings.sh" ]]; then
        source "$script_dir/carl-settings.sh"
        
        # Get the message template
        local message=$(get_notification_message "$notification_type" "$custom_message")
        if [[ $? -ne 0 ]]; then
            # Notification disabled
            return 0
        fi
        
        # Replace variables in message
        message=$(replace_message_variables "$message" "${variables[@]}")
        
        # Speak the message
        speak_message "$message" "$notification_type"
        
        # Also return the message for text display
        echo "$message"
    else
        # Fallback when no settings available
        if [[ -n "$custom_message" ]]; then
            speak_message "$custom_message"
            echo "$custom_message"
        fi
    fi
}

# Get project name from directory
get_project_name() {
    basename "$(pwd)"
}

# Check if TTS is available on this platform
tts_available() {
    local platform=$(detect_platform)
    
    case "$platform" in
        "macos")
            command -v say >/dev/null 2>&1
            ;;
        "linux")
            command -v spd-say >/dev/null 2>&1 || command -v espeak >/dev/null 2>&1
            ;;
        "wsl"|"windows")
            command -v powershell.exe >/dev/null 2>&1
            ;;
        *)
            false
            ;;
    esac
}