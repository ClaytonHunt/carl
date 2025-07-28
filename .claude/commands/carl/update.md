# Update CARL Installation

Safely update existing CARL installations to the latest version with automatic migration, FIFO backup management, and support for updating remote projects.

## Usage

### Basic Updates
```bash
/update                           # Update current directory
/update /path/to/project         # Update specific project directory
/update ~/projects/my-app        # Update project by path
```

### Update Options
```bash
/update --check                  # Check for available updates
/update --check /path/to/project # Check specific project version
/update --force                  # Force update even if versions match
/update --dry-run               # Show what would be updated
/update --no-backup             # Skip backup creation (not recommended)
```

### Backup Management
```bash
/update --list-backups           # Show available backups
/update --list-backups /path     # Show backups for specific project
/update --restore               # Interactive restore from backup
/update --restore-from latest   # Restore from latest backup
/update --set-retention 3       # Keep 3 backups instead of default 2
```

## Directory Targeting

### Supported Path Formats
```bash
/update .                        # Current directory (default)
/update /absolute/path/to/project
/update ~/relative/to/home
/update ../sibling/project
/update subproject/               # Relative path
```

### Auto-Detection
```bash
# CARL installation detected by presence of:
# - .carl/config/carl-settings.json (primary indicator)
# - .carl/index.carl (secondary indicator)
# - .claude/settings.json with CARL hooks (tertiary)

$ /update /path/to/maybe-carl-project
🔍 Checking /path/to/maybe-carl-project for CARL installation...
✅ CARL v1.0.1 detected
🔄 Updating to v1.1.0...
```

### Error Handling
```bash
$ /update /path/to/non-carl-project
❌ No CARL installation found at /path/to/non-carl-project
💡 Use 'bash <(curl -s https://raw.githubusercontent.com/ClaytonHunt/carl/main/install.sh) /path/to/non-carl-project' to install CARL

$ /update /nonexistent/path
❌ Directory does not exist: /nonexistent/path
```

## Update Process

### 1. Target Resolution and Validation
```bash
carl_resolve_target_directory() {
    local target="${1:-.}"  # Default to current directory
    
    # Resolve to absolute path
    if [[ "$target" = /* ]]; then
        target_dir="$target"
    elif [[ "$target" =~ ^~/ ]]; then
        target_dir="${HOME}/${target#~/}"
    else
        target_dir="$(pwd)/$target"
    fi
    
    # Normalize path
    target_dir="$(cd "$target_dir" 2>/dev/null && pwd)" || {
        echo "❌ Directory does not exist: $target"
        return 1
    }
    
    # Validate CARL installation
    if [ ! -f "$target_dir/.carl/config/carl-settings.json" ]; then
        if [ ! -f "$target_dir/.carl/index.carl" ]; then
            echo "❌ No CARL installation found at $target_dir"
            echo "💡 Use the install script to add CARL to this project"
            return 1
        fi
    fi
    
    echo "$target_dir"
}
```

### 2. Version Detection with GitHub Check
```bash
carl_check_versions() {
    local target_dir="$1"
    local current_version="unknown"
    
    # Get current version from carl-settings.json
    if [ -f "$target_dir/.carl/config/carl-settings.json" ]; then
        current_version=$(grep '"carl_version"' "$target_dir/.carl/config/carl-settings.json" | cut -d'"' -f4)
    fi
    
    # Get latest version from GitHub
    local latest_version="unknown"
    local latest_info=""
    
    if command -v curl >/dev/null 2>&1; then
        latest_info=$(curl -s --max-time 10 "https://api.github.com/repos/ClaytonHunt/carl/releases/latest" 2>/dev/null)
    elif command -v wget >/dev/null 2>&1; then
        latest_info=$(wget -qO- --timeout=10 "https://api.github.com/repos/ClaytonHunt/carl/releases/latest" 2>/dev/null)
    fi
    
    if [ -n "$latest_info" ]; then
        latest_version=$(echo "$latest_info" | grep '"tag_name"' | cut -d'"' -f4 | sed 's/^v//')
    fi
    
    echo "Current: $current_version"
    echo "Latest: $latest_version"
    
    # Return 0 if update needed, 1 if up to date
    if [ "$current_version" != "$latest_version" ] && [ "$latest_version" != "unknown" ]; then
        return 0  # Update needed
    else
        return 1  # Up to date or can't determine
    fi
}
```

### 3. FIFO Backup Management
```bash
carl_manage_backup_retention() {
    local target_dir="$1"
    local max_backups="${2:-2}"
    
    cd "$target_dir" || return 1
    
    # Get all backup directories sorted by date (oldest first)
    local backups=($(ls -1dt .carl-backup-* 2>/dev/null | tac))
    local backup_count=${#backups[@]}
    
    echo "📊 Found $backup_count existing backups (limit: $max_backups)"
    
    # If we have max or more backups, remove oldest to make room for new one
    if [ $backup_count -ge $max_backups ]; then
        local excess=$((backup_count - max_backups + 1))
        
        for ((i=0; i<excess; i++)); do
            if [ -d "${backups[i]}" ]; then
                local size=$(du -sh "${backups[i]}" 2>/dev/null | cut -f1 || echo "unknown")
                echo "🗑️ Removing old backup: ${backups[i]} ($size)"
                rm -rf "${backups[i]}"
            fi
        done
    fi
}

carl_create_backup() {
    local target_dir="$1"
    local max_backups="${2:-2}"
    
    cd "$target_dir" || return 1
    
    # Clean up old backups first
    carl_manage_backup_retention "$target_dir" "$max_backups"
    
    # Create new backup
    local backup_dir=".carl-backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Creating backup: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # Copy CARL and Claude directories
    if [ -d ".carl" ]; then
        cp -r ".carl" "$backup_dir/"
    fi
    if [ -d ".claude" ]; then
        cp -r ".claude" "$backup_dir/"
    fi
    
    # Save backup metadata
    local current_version=$(grep '"carl_version"' ".carl/config/carl-settings.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
    local backup_size=$(du -sm "$backup_dir" 2>/dev/null | cut -f1 || echo "0")
    
    cat > "$backup_dir/backup-info.json" << EOF
{
  "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "target_directory": "$target_dir",
  "from_version": "$current_version",
  "size_mb": $backup_size,
  "restore_command": "cd '$target_dir' && /update --restore-from $backup_dir"
}
EOF
    
    echo "✅ Backup created: $backup_dir (${backup_size}MB)"
}
```

### 4. Intelligent Update with Data Preservation
```bash
carl_intelligent_update() {
    local target_dir="$1"
    local temp_dir=$(mktemp -d)
    
    echo "🔄 Downloading latest CARL from GitHub..."
    
    # Download latest update script  
    local update_url="https://raw.githubusercontent.com/ClaytonHunt/carl/main/update-carl.sh"
    
    if command -v curl >/dev/null 2>&1; then
        curl -s --max-time 30 "$update_url" > "$temp_dir/update-carl.sh" || {
            echo "❌ Failed to download update script from GitHub"
            rm -rf "$temp_dir"
            return 1
        }
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$temp_dir/update-carl.sh" --timeout=30 "$update_url" || {
            echo "❌ Failed to download update script from GitHub"
            rm -rf "$temp_dir"
            return 1
        }
    else
        echo "❌ No download tool available (curl or wget required)"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Download install script (needed by update script)
    local install_url="https://raw.githubusercontent.com/ClaytonHunt/carl/main/install.sh"
    
    if command -v curl >/dev/null 2>&1; then
        curl -s --max-time 30 "$install_url" > "$temp_dir/install.sh" || {
            echo "❌ Failed to download install script from GitHub"
            rm -rf "$temp_dir"
            return 1
        }
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$temp_dir/install.sh" --timeout=30 "$install_url" || {
            echo "❌ Failed to download install script from GitHub"
            rm -rf "$temp_dir"
            return 1
        }
    fi
    
    # Make scripts executable
    chmod +x "$temp_dir/update-carl.sh"
    chmod +x "$temp_dir/install.sh"
    
    # Run intelligent update
    echo "🔧 Applying intelligent update to $target_dir..."
    cd "$temp_dir" && ./update-carl.sh "$target_dir" || {
        echo "❌ Update failed"
        rm -rf "$temp_dir"
        return 1
    }
    
    rm -rf "$temp_dir"
    echo "✅ Update completed successfully with data preservation"
}
```

### 5. Restore Functionality
```bash
carl_list_backups() {
    local target_dir="${1:-.}"
    
    cd "$target_dir" || return 1
    
    local backups=($(ls -1dt .carl-backup-* 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        echo "No CARL backups found in $target_dir"
        return 1
    fi
    
    echo "Available CARL backups in $target_dir:"
    local i=1
    for backup in "${backups[@]}"; do
        if [ -f "$backup/backup-info.json" ]; then
            local created=$(grep '"created"' "$backup/backup-info.json" | cut -d'"' -f4)
            local from_version=$(grep '"from_version"' "$backup/backup-info.json" | cut -d'"' -f4)
            local size_mb=$(grep '"size_mb"' "$backup/backup-info.json" | cut -d':' -f2 | tr -d ' ,')
            local age=$(date -d "$created" +"%-d %b %Y %H:%M" 2>/dev/null || echo "unknown date")
            
            echo "  [$i] $backup"
            echo "      Version: $from_version | Size: ${size_mb}MB | Created: $age"
        else
            echo "  [$i] $backup (no metadata)"
        fi
        i=$((i+1))
    done
}

carl_restore_from_backup() {
    local target_dir="${1:-.}"
    local backup_choice="${2:-interactive}"
    
    cd "$target_dir" || return 1
    
    local backups=($(ls -1dt .carl-backup-* 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        echo "❌ No backups available for restore"
        return 1
    fi
    
    local selected_backup=""
    
    if [ "$backup_choice" = "interactive" ]; then
        carl_list_backups "$target_dir"
        echo
        read -p "Select backup to restore [1-${#backups[@]}] or 'q' to quit: " choice
        
        if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
            echo "Restore cancelled"
            return 0
        fi
        
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#backups[@]} ]; then
            selected_backup="${backups[$((choice-1))]}"
        else
            echo "❌ Invalid selection"
            return 1
        fi
    elif [ "$backup_choice" = "latest" ]; then
        selected_backup="${backups[0]}"
    else
        # Specific backup directory provided
        if [ -d "$backup_choice" ]; then
            selected_backup="$backup_choice"
        else
            echo "❌ Backup not found: $backup_choice"
            return 1
        fi
    fi
    
    echo "🔄 Restoring from $selected_backup..."
    
    # Create a backup of current state before restore
    local restore_backup=".carl-restore-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$restore_backup"
    [ -d ".carl" ] && cp -r ".carl" "$restore_backup/"
    [ -d ".claude" ] && cp -r ".claude" "$restore_backup/"
    
    # Remove current CARL installation
    rm -rf ".carl" ".claude" 2>/dev/null
    
    # Restore from backup
    if [ -d "$selected_backup/.carl" ]; then
        cp -r "$selected_backup/.carl" "./"
    fi
    if [ -d "$selected_backup/.claude" ]; then
        cp -r "$selected_backup/.claude" "./"
    fi
    
    # Get restored version
    local restored_version=$(grep '"carl_version"' ".carl/config/carl-settings.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
    
    echo "✅ CARL restored to version $restored_version"
    echo "📦 Pre-restore state saved in: $restore_backup"
}
```

## Command Examples

### Multi-Project Updates
```bash
# Update multiple projects
/update ~/projects/app1
/update ~/projects/app2  
/update /var/www/production-app

# Check all project versions
/update --check ~/projects/app1
/update --check ~/projects/app2
/update --check /var/www/production-app
```

### Backup Management Across Projects
```bash
# List backups for specific projects
/update --list-backups ~/projects/app1
/update --list-backups /var/www/production-app

# Restore specific project
cd ~/projects/app1
/update --restore

# Or restore remotely
/update --restore ~/projects/app1
```

### Legacy Project Support
```bash
# For projects that existed before /update command
/update /path/to/old-carl-project

# Works even if the project has very old CARL version
$ /update ~/old-project-with-carl-v1.0.0
✅ CARL v1.0.0 detected in ~/old-project-with-carl-v1.0.0
🔄 Updating to v1.1.0...
📦 Creating backup: .carl-backup-20240125-160000/
✅ Updated successfully
```

## Configuration

### Per-Project Settings
```json
// .carl/config/carl-settings.json
{
  "carl_version": "1.1.0",
  "backup_settings": {
    "max_retained_backups": 2,
    "backup_enabled": true,
    "auto_update_check": false
  }
}
```

### Global Settings
```bash
# Set default retention across all projects
export CARL_DEFAULT_BACKUP_RETENTION=3

# Disable backups globally (not recommended)
export CARL_BACKUP_ENABLED=false
```

## Integration Points

- **Input**: Project directory path (optional, defaults to current)
- **Output**: Updated CARL installation with preserved user data
- **Backup**: FIFO rotation with configurable retention
- **Rollback**: Interactive restore from any backup
- **Validation**: Automatic verification of update success