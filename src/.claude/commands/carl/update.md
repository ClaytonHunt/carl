---
allowed-tools: Bash(curl:*), Bash(wget:*), Bash(ls:*), Bash(cd:*), Bash(cp:*), Bash(rm:*), Bash(mkdir:*), Bash(date:*), Bash(du:*), Bash(grep:*), Read, Write
description: Update CARL installation with backup management and version control
argument-hint: [directory] | --check | --force | --dry-run | --restore | --list-backups
---

# CARL Update Instructions

Update CARL installation safely with backup management by:

## 1. Resolve Target Directory
Determine update target from `$ARGUMENTS`:
- **No arguments**: Update current directory
- **Directory path**: Update specific project (absolute, relative, or ~ paths)
- **--check**: Check for available updates without updating
- **--restore**: Interactive restore from backup
- **--list-backups**: Show available backup versions

## 2. Validate CARL Installation
Verify target directory contains CARL:
- Check for `.carl/config/carl-settings.json` (primary indicator)
- Check for `.carl/index.carl` (secondary indicator)
- Check for `.claude/settings.json` with CARL hooks (tertiary)
- Resolve absolute path from relative/~ paths
- Return error if directory doesn't exist or lacks CARL installation

## 3. Check Version Status  
Compare current and latest versions:
- Read current version from `.carl/config/carl-settings.json`
- Query GitHub API for latest release version from `https://github.com/claytonhunt/carl`
- Compare versions to determine if update is needed
- For `--check` option, display version information and exit
- Handle network failures gracefully with fallback behavior

## 4. Create Backup (if not --no-backup)
Manage FIFO backup system:
- Check existing backups and apply retention policy (default: keep 2)
- Remove oldest backups if at retention limit
- Create new timestamped backup directory
- Copy `.carl/` and `.claude/` directories to backup
- Generate backup metadata with version and restore instructions
- Display backup creation confirmation with size

## 5. Download and Apply Update
Execute the update process:
- Download latest `update-carl.sh` script from `https://github.com/claytonhunt/carl` using curl/wget
- Download latest `install.sh` script (dependency for updater)
- Make scripts executable and run update process
- Preserve user data during update (session files, custom configs)
- Handle download failures with appropriate error messages
- Validate update success and display confirmation

## 6. Handle Backup Operations
For backup-related arguments:

**--list-backups**: List available backups with metadata
- Show backup directories sorted by date
- Display version, size, and creation date for each backup
- Format output for easy selection and identification

**--restore**: Interactive restore process
- List available backups for user selection
- Create backup of current state before restoring
- Copy selected backup contents back to active directories
- Display restore confirmation with version information

## Example Usage
- `/carl:update` → Update CARL in current directory
- `/carl:update /path/to/project` → Update specific project
- `/carl:update --check` → Check for available updates
- `/carl:update --restore` → Interactive restore from backup
- `/carl:update --list-backups` → Show available backups

Update CARL installation safely with automatic backup management, version checking, and restore capabilities while preserving user data and configurations.

