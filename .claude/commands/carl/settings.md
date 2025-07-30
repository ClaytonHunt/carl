---
allowed-tools: Read, Write, Edit
description: Configure CARL system behavior, audio preferences, and analysis settings
argument-hint: --audio [on/off] | --depth [minimal/balanced/comprehensive] | --team-size [number]
---

# CARL Settings Configuration Instructions

Configure CARL (Context-Aware Requirements Language) system behavior by:

## 1. Load Current Configuration
Read existing CARL configuration files, following master process definition:
- Read `.carl/system/master.process.carl` for authoritative settings workflow reference
- Read `.carl/config/carl-settings.json` for current settings
- Read `.carl/config/user.conf` for user preferences
- Read `.carl/config/team.conf` for team-specific configuration
- Display current configuration based on `$ARGUMENTS` scope
- Follow `carl_settings` workflow sequence from master process definition

## 2. Process Settings Arguments
Based on `$ARGUMENTS`, modify settings:

**Audio Configuration:**
- `--audio on/off`: Enable/disable Carl Wheezer personality audio
- `--audio-volume [0-100]`: Set audio volume level
- `--audio-test`: Test audio system with sample phrases
- `--quiet-hours [time-range]`: Set automatic quiet mode

**Analysis Depth Settings:**
- `--depth minimal`: Fast, lightweight analysis (2-3 specialists)
- `--depth balanced`: Standard analysis (4-6 specialists)
- `--depth comprehensive`: Deep analysis (6-8 specialists)

**Team and Project Settings:**
- `--team-size [number]`: Configure team size for context adaptation
- `--methodology [agile/scrum/kanban]`: Set development methodology
- `--planning-style [agile/waterfall]`: Configure planning template style
- `--experience-level [junior/mixed/senior]`: Set team experience level

**Performance Optimization:**
- `--parallel-analysis [on/off]`: Enable parallel specialist execution
- `--caching [on/off]`: Enable analysis result caching
- `--max-context [number]`: Set maximum context files to load

## 3. Update Configuration Files
Modify appropriate configuration files:
- **Audio Settings**: Update `.carl/config/user.conf` with audio preferences
- **Analysis Settings**: Update `.carl/config/carl-settings.json` with analysis depth
- **Team Settings**: Update `.carl/config/team.conf` with team-specific configuration
- **Planning Settings**: Update template preferences and methodology settings

## 4. Validate Settings Changes
Ensure configuration integrity:
- **Syntax Validation**: Ensure all configuration files have valid JSON/YAML syntax
- **Compatibility Check**: Verify settings work with current CARL version
- **Audio Test**: If audio settings changed, test audio system functionality
- **Performance Impact**: Warn about settings that may impact analysis performance

## 5. Display Updated Configuration
Show confirmation of changes made:
- **Settings Summary**: Display updated settings with before/after comparison where applicable
- **Effective Settings**: Show complete effective configuration after changes
- **Restart Requirements**: Indicate if any settings require CARL system restart
- **Next Steps**: Suggest related commands or actions based on settings changes

## Example Usage
- `/carl:settings` → Show current CARL configuration
- `/carl:settings --audio off` → Disable personality audio system
- `/carl:settings --depth comprehensive` → Set maximum analysis depth
- `/carl:settings --team-size 8` → Configure for larger team context
- `/carl:settings --audio-test` → Test audio system functionality

Configure CARL system behavior to match your team preferences, project requirements, and workflow needs while maintaining optimal AI assistance performance.