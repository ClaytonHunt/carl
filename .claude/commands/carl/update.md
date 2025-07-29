---
allowed-tools: Bash, Read, Write, Glob, Grep
description: Update CARL installation to latest version with backup management
argument-hint: [path] [--check|--force|--dry-run|--no-backup|--list-backups|--restore|--restore-from backup|--set-retention N]
---

# Update CARL Installation

You are tasked with updating an existing CARL installation to the latest version. This command provides intelligent update management with automatic backup creation, FIFO backup rotation, and data preservation.

## Your Task

Update the CARL installation in the specified directory (or current directory if none provided) following these requirements:

1. **Target Resolution**: Resolve the target directory path and validate CARL installation exists
2. **Version Check**: Compare current version with latest GitHub release
3. **Backup Management**: Create backup with FIFO rotation (default: keep 2 backups)
4. **Intelligent Update**: Download and run the latest update script from GitHub
5. **Data Preservation**: Maintain user configurations and customizations

## Command Arguments

Handle these argument patterns:
- No args: Update current directory
- Path only: Update specified directory
- `--check [path]`: Check for available updates without updating
- `--force [path]`: Force update even if versions match
- `--dry-run [path]`: Show what would be updated without making changes
- `--no-backup [path]`: Skip backup creation (show warning)
- `--list-backups [path]`: List available backups for directory
- `--restore [path]`: Interactive restore from backup
- `--restore-from backup [path]`: Restore from specific backup
- `--set-retention N [path]`: Set backup retention count

## Implementation Steps

### 1. Parse Arguments
Parse command arguments to determine:
- Target directory path (default: current directory)
- Operation mode (update, check, restore, etc.)
- Additional options (force, dry-run, no-backup, etc.)

### 2. Resolve Target Directory
- Convert relative paths to absolute paths
- Handle `~` expansion for home directory
- Validate directory exists
- Detect CARL installation by checking for:
  - `.carl/config/carl-settings.json` (primary)
  - `.carl/index.carl` (secondary)
  - `.claude/settings.json` with CARL hooks (tertiary)

### 3. Version Management
For update operations:
- Extract current version from `carl-settings.json`
- Fetch latest version from GitHub API: `https://api.github.com/repos/ClaytonHunt/carl/releases/latest`
- Compare versions to determine if update is needed
- Respect `--force` flag to override version check

### 4. Backup Operations
For update operations (unless `--no-backup` specified):
- Implement FIFO backup rotation with configurable retention (default: 2)
- Create timestamped backup directory: `.carl-backup-YYYYMMDD-HHMMSS`
- Copy `.carl/` and `.claude/` directories to backup
- Generate backup metadata in `backup-info.json`
- Clean up old backups based on retention policy

### 5. Update Execution
For actual updates:
- Download latest update script from GitHub: `https://github.com/ClaytonHunt/carl/releases/latest/download/update-carl.sh`
- Download install script: `https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh`
- Execute update script with target directory
- Preserve user configurations and customizations
- Verify update success

### 6. Backup Management Operations
For backup-related commands:
- `--list-backups`: List all available backups with metadata
- `--restore`: Provide interactive backup selection menu
- `--restore-from`: Restore from specified backup directory
- `--set-retention`: Update backup retention settings

## Error Handling

Provide clear error messages for common scenarios:
- Directory doesn't exist
- No CARL installation found
- Network connectivity issues
- Update script download failures
- Insufficient permissions
- Backup/restore operation failures

## Output Format

Use consistent status indicators:
- 🔍 for detection/checking operations
- ✅ for successful operations  
- ❌ for errors
- 🔄 for update operations
- 📦 for backup operations
- 🗑️ for cleanup operations
- 💡 for helpful suggestions

## Implementation Notes

- Use bash for cross-platform compatibility
- Handle both curl and wget for downloads
- Support relative and absolute path resolution
- Validate all user inputs
- Provide meaningful progress feedback
- Ensure atomic operations where possible

