---
allowed-tools: Read, Write, Edit, Glob
description: Manage character personality themes for development feedback and audio
argument-hint: --enable [theme] | --disable | --create | --style [single/multi/auto]
---

# CARL Personality Management Instructions

Manage character personality themes for development feedback by:

## 1. Determine Personality Action
Based on `$ARGUMENTS`:
- **No arguments**: Show current personality theme and configuration
- **--enable [theme]**: Activate specific personality theme
- **--disable**: Turn off personality system completely
- **--create**: Create new custom personality theme
- **--style [mode]**: Configure response style (single/multi/auto)

## 2. Load Personality Configuration
Read current personality system state:
- Read `personalities.config.carl` for active theme
- Read `.carl/config/carl-settings.json` for personality settings
- Check available theme files (`[theme].personalities.config.carl`)
- Load personality template from `.carl/templates/personalities.template.carl`

## 3. Process Personality Request
**For Theme Activation (--enable):**
- Validate requested theme exists or use default
- Update `personalities.config.carl` with theme configuration
- Update audio settings in `.carl/config/carl-settings.json`
- Confirm theme activation and character roster

**For Theme Creation (--create):**
- Backup current `personalities.config.carl` to `[theme].personalities.config.carl`
- Use `.carl/templates/personalities.template.carl` to generate new theme
- Prompt for character selection and personality traits
- Generate character response patterns and audio configurations

**For Style Configuration (--style):**
- Update response style in personality configuration
- Set single/multi/auto character response mode
- Configure contextual character selection rules
- Update TTS and audio interaction preferences

**For Status Display (no arguments):**
- Show current active theme and character roster
- Display response style configuration
- List available alternative themes
- Show character interaction examples for current theme

## 4. Update Configuration Files
Apply personality changes:
- Update `personalities.config.carl` with theme configuration
- Modify `.carl/config/carl-settings.json` audio settings
- Create backup files for theme switching
- Validate configuration syntax and character definitions

## 5. Confirm Personality Changes
Provide feedback on personality system state:
- Confirm active theme and character roster
- Show character response style examples
- Display audio system integration status
- List available themes and switching options

## Example Usage
- `/carl:personalities` → Show current personality theme
- `/carl:personalities --enable tmnt` → Activate TMNT theme
- `/carl:personalities --style multi` → Enable multi-character conversations
- `/carl:personalities --create` → Create custom personality theme

Manage character personality themes that provide contextual development feedback through both text responses and audio system integration.