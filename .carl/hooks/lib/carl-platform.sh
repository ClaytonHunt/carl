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

# Cross-platform text-to-speech
speak_message() {
    local message="$1"
    local platform=$(detect_platform)
    
    case "$platform" in
        "macos")
            if command -v say >/dev/null 2>&1; then
                say "$message"
            fi
            ;;
        "linux")
            if command -v spd-say >/dev/null 2>&1; then
                spd-say "$message"
            elif command -v espeak >/dev/null 2>&1; then
                espeak "$message"
            fi
            ;;
        "wsl"|"windows")
            if command -v powershell.exe >/dev/null 2>&1; then
                powershell.exe -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('$message')"
            fi
            ;;
    esac
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