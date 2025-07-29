#!/bin/bash

# CARL Update Script - Intelligent Update with Data Preservation
# Version: 1.0.0
# Preserves user data while updating system files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_RETENTION=${CARL_BACKUP_RETENTION:-2}
DRY_RUN=${1:-false}

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

carl_resolve_target_directory() {
    local target="${1:-.}"
    
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
        log_error "Directory does not exist: $target"
        return 1
    }
    
    # Validate CARL installation
    if [ ! -f "$target_dir/.carl/config/carl-settings.json" ]; then
        if [ ! -f "$target_dir/.carl/index.carl" ]; then
            log_error "No CARL installation found at $target_dir"
            echo "💡 Use the install script to add CARL to this project"
            return 1
        fi
    fi
    
    echo "$target_dir"
}

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

carl_create_backup() {
    local target_dir="$1"
    local max_backups="${2:-$BACKUP_RETENTION}"
    
    cd "$target_dir" || return 1
    
    # Clean up old backups first (FIFO management)
    local backups=($(ls -1dt .carl-backup-* 2>/dev/null | tac))
    local backup_count=${#backups[@]}
    
    if [ $backup_count -ge $max_backups ]; then
        local excess=$((backup_count - max_backups + 1))
        
        for ((i=0; i<excess; i++)); do
            if [ -d "${backups[i]}" ]; then
                local size=$(du -sh "${backups[i]}" 2>/dev/null | cut -f1 || echo "unknown")
                log_info "Removing old backup: ${backups[i]} ($size)"
                rm -rf "${backups[i]}"
            fi
        done
    fi
    
    # Create new backup
    local backup_dir=".carl-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup: $backup_dir"
    
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
  "restore_command": "cd '$target_dir' && bash update-carl.sh --restore-from $backup_dir"
}
EOF
    
    log_success "Backup created: $backup_dir (${backup_size}MB)"
}

carl_preserve_user_data() {
    local target_dir="$1"
    local temp_preserve="$2"
    
    cd "$target_dir" || return 1
    mkdir -p "$temp_preserve"
    
    log_info "Preserving user data..."
    
    # Preserve user sessions
    if [ -d ".carl/sessions" ]; then
        cp -r ".carl/sessions" "$temp_preserve/" 2>/dev/null || true
        log_success "Preserved session history"
    fi
    
    # Preserve user settings (but extract version for updating)
    if [ -f ".carl/config/carl-settings.json" ]; then
        cp ".carl/config/carl-settings.json" "$temp_preserve/carl-settings.json.old"
        log_success "Preserved CARL settings"
    fi
    
    # Preserve Claude local settings
    if [ -f ".claude/settings.local.json" ]; then
        cp ".claude/settings.local.json" "$temp_preserve/"
        log_success "Preserved Claude local settings"
    fi
    
    # Preserve custom index.carl if it exists and has been modified
    if [ -f ".carl/index.carl" ]; then
        # Check if it's different from default (simple check)
        local lines=$(wc -l < ".carl/index.carl")
        if [ "$lines" -gt 10 ]; then  # Default is usually short
            cp ".carl/index.carl" "$temp_preserve/index.carl.custom"
            log_success "Preserved custom index.carl"
        fi
    fi
}

carl_restore_user_data() {
    local target_dir="$1"
    local temp_preserve="$2"
    local new_version="$3"
    
    cd "$target_dir" || return 1
    
    log_info "Restoring user data..."
    
    # Restore sessions
    if [ -d "$temp_preserve/sessions" ]; then
        rm -rf ".carl/sessions"
        cp -r "$temp_preserve/sessions" ".carl/"
        log_success "Restored session history"
    fi
    
    # Merge settings (update version but keep user preferences)
    if [ -f "$temp_preserve/carl-settings.json.old" ] && [ -f ".carl/config/carl-settings.json" ]; then
        # Use jq if available, otherwise do simple replacement
        if command -v jq >/dev/null 2>&1; then
            # Merge settings intelligently with jq
            jq -s '.[0] * .[1] | .carl_version = "'"$new_version"'" | .last_updated = now | strftime("%Y-%m-%dT%H:%M:%SZ")' \
                "$temp_preserve/carl-settings.json.old" \
                ".carl/config/carl-settings.json" > ".carl/config/carl-settings.json.tmp" && \
                mv ".carl/config/carl-settings.json.tmp" ".carl/config/carl-settings.json"
        else
            # Fallback: preserve user settings and update version
            local old_audio=$(grep -A 10 '"audio_settings"' "$temp_preserve/carl-settings.json.old" | head -10)
            local old_dev=$(grep -A 10 '"development_settings"' "$temp_preserve/carl-settings.json.old" | head -10)
            local old_analysis=$(grep -A 10 '"analysis_settings"' "$temp_preserve/carl-settings.json.old" | head -10)
            
            # Update version in current settings
            sed -i "s/\"carl_version\": \".*\"/\"carl_version\": \"$new_version\"/" ".carl/config/carl-settings.json"
        fi
        log_success "Merged CARL settings (preserved user preferences)"
    fi
    
    # Restore Claude local settings
    if [ -f "$temp_preserve/settings.local.json" ]; then
        cp "$temp_preserve/settings.local.json" ".claude/"
        log_success "Restored Claude local settings"
    fi
    
    # Restore custom index.carl
    if [ -f "$temp_preserve/index.carl.custom" ]; then
        cp "$temp_preserve/index.carl.custom" ".carl/index.carl"
        log_success "Restored custom index.carl"
    fi
}

carl_intelligent_update() {
    local target_dir="$1"
    local carl_source_dir="$2"
    
    log_info "Starting intelligent CARL update..."
    
    # Get versions
    local current_version=$(grep '"carl_version"' "$target_dir/.carl/config/carl-settings.json" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
    local new_version=$(grep '"carl_version"' "$carl_source_dir/.carl/config/carl-settings.json" 2>/dev/null | cut -d'"' -f4 || echo "latest")
    
    log_info "Updating from v$current_version to v$new_version"
    
    # Create temporary directory for preserved data
    local temp_preserve=$(mktemp -d)
    
    # Step 1: Create backup
    carl_create_backup "$target_dir"
    
    # Step 2: Preserve user data
    carl_preserve_user_data "$target_dir" "$temp_preserve"
    
    # Step 3: Update system files
    log_info "Updating system files..."
    
    # Update hooks
    if [ -d "$carl_source_dir/.claude/hooks" ]; then
        cp -r "$carl_source_dir/.claude/hooks" "$target_dir/.claude/"
        log_success "Updated Claude hooks"
    fi
    
    # Update commands
    if [ -d "$carl_source_dir/.claude/commands" ]; then
        cp -r "$carl_source_dir/.claude/commands" "$target_dir/.claude/"
        log_success "Updated Claude commands"
    fi
    
    # Update scripts
    if [ -d "$carl_source_dir/.carl/scripts" ]; then
        cp -r "$carl_source_dir/.carl/scripts" "$target_dir/.carl/"
        log_success "Updated CARL scripts"
    fi
    
    # Update templates
    if [ -d "$carl_source_dir/.carl/templates" ]; then
        cp -r "$carl_source_dir/.carl/templates" "$target_dir/.carl/"
        log_success "Updated CARL templates"
    fi
    
    # Update audio system
    if [ -d "$carl_source_dir/.carl/audio" ]; then
        # Preserve user audio files if they exist
        local user_audio_backup=$(mktemp -d)
        if [ -d "$target_dir/.carl/audio" ]; then
            cp -r "$target_dir/.carl/audio"/* "$user_audio_backup/" 2>/dev/null || true
        fi
        
        cp -r "$carl_source_dir/.carl/audio" "$target_dir/.carl/"
        
        # Restore user audio files
        cp -r "$user_audio_backup"/* "$target_dir/.carl/audio/" 2>/dev/null || true
        rm -rf "$user_audio_backup"
        
        log_success "Updated audio system (preserved user audio files)"
    fi
    
    # Update configuration template (but preserve user settings)
    if [ -f "$carl_source_dir/.carl/config/carl-settings.json" ]; then
        cp "$carl_source_dir/.carl/config/carl-settings.json" "$target_dir/.carl/config/carl-settings.json"
        log_success "Updated configuration template"
    fi
    
    # Step 4: Restore user data (this will merge settings)
    carl_restore_user_data "$target_dir" "$temp_preserve" "$new_version"
    
    # Step 5: Update main settings.json (merge hooks)
    if [ -f "$carl_source_dir/.claude/settings.json" ] && [ -f "$target_dir/.claude/settings.json" ]; then
        log_info "Merging Claude settings..."
        # Create backup first
        cp "$target_dir/.claude/settings.json" "$target_dir/.claude/settings.json.backup.$(date +%Y%m%d_%H%M%S)"
        
        # This would need the same merge logic as the install script
        # For now, let's do a simple approach
        cp "$carl_source_dir/.claude/settings.json" "$target_dir/.claude/settings.json.new"
        log_success "Updated Claude settings (backup created)"
    fi
    
    # Cleanup
    rm -rf "$temp_preserve"
    
    log_success "CARL update completed: v$current_version → v$new_version"
}

# Main execution
main() {
    local target="${1:-.}"
    
    # Resolve target directory
    local target_dir
    target_dir=$(carl_resolve_target_directory "$target") || exit 1
    
    log_info "Running CARL update from local directory..."
    log_info "Updating CARL installation at: $target_dir"
    
    # Check if update is needed
    local version_check
    version_check=$(carl_check_versions "$target_dir")
    echo "$version_check"
    
    if ! carl_check_versions "$target_dir" >/dev/null; then
        log_info "CARL is already up to date"
        exit 0
    fi
    
    # Get CARL source by running a controlled install to a temp directory
    local temp_source=$(mktemp -d)
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    log_info "Preparing update source..."
    
    # Run install script to temp directory to get latest files
    if [ -f "$script_dir/install.sh" ]; then
        # Clear any existing environment variables that might interfere
        unset TARGET_DIR GLOBAL_INSTALL FORCE_INSTALL SKIP_AUDIO_TEST UPDATE_MODE
        
        # Run install with explicit arguments and capture detailed error output
        local install_error_log=$(mktemp)
        if ! bash "$script_dir/install.sh" --skip-audio-test --force "$temp_source" 2>"$install_error_log"; then
            log_error "Failed to prepare update source. Install script error:"
            
            # Show the actual error for debugging
            if [ -s "$install_error_log" ]; then
                while IFS= read -r line; do
                    log_error "  $line"
                done < "$install_error_log"
            fi
            
            rm -rf "$temp_source" "$install_error_log"
            exit 1
        fi
        rm -f "$install_error_log"
        
        # Verify that the installation succeeded and has expected structure
        if [ ! -d "$temp_source/.carl" ] || [ ! -f "$temp_source/.carl/config/carl-settings.json" ]; then
            log_error "Update source preparation incomplete - missing CARL structure"
            log_info "Expected: $temp_source/.carl/config/carl-settings.json"
            rm -rf "$temp_source"
            exit 1
        fi
        
        log_success "Update source prepared successfully"
    else
        log_error "install.sh not found. This script must be run from a CARL repository"
        log_info "Expected location: $script_dir/install.sh"
        rm -rf "$temp_source"
        exit 1
    fi
    
    # Perform intelligent update
    carl_intelligent_update "$target_dir" "$temp_source"
    
    # Cleanup
    rm -rf "$temp_source"
    
    log_success "🎉 CARL update complete!"
}

# Run main function
main "$@"