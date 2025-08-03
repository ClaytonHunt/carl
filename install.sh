#!/bin/bash
# CARL Installation Script
# Installs CARL (Context-Aware Requirements Language) system
#
# Usage:
#   curl -fsSL https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh | bash
#
# Environment Variables:
#   CARL_VERSION - Specific version to install (default: latest)
#   CARL_VERBOSE - Enable verbose output (1/0)
#   CARL_DRY_RUN - Show what would be done without installing (1/0)

set -euo pipefail

# Configuration
REPO_OWNER="ClaytonHunt"
REPO_NAME="carl"
CARL_VERSION="${CARL_VERSION:-latest}"
VERBOSE="${CARL_VERBOSE:-0}"
DRY_RUN="${CARL_DRY_RUN:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}$1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

verbose() {
    if [ "$VERBOSE" = "1" ]; then
        echo -e "${BLUE}🔍 $1${NC}"
    fi
}

# Check dependencies
check_dependencies() {
    verbose "Checking system dependencies..."
    
    local missing_deps=()
    
    command -v curl >/dev/null || missing_deps+=("curl")
    command -v tar >/dev/null || missing_deps+=("tar")
    command -v grep >/dev/null || missing_deps+=("grep")
    command -v sed >/dev/null || missing_deps+=("sed")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check for jq (optional but recommended)
    if command -v jq >/dev/null; then
        USE_JQ=1
        verbose "jq found - will use for JSON processing"
    else
        USE_JQ=0
        warn "jq not found - using basic JSON parsing (consider installing jq for better reliability)"
    fi
    
    verbose "All dependencies satisfied"
}

# Check write permissions
check_permissions() {
    verbose "Checking write permissions..."
    
    if [ ! -w . ]; then
        error "No write permission in current directory: $(pwd)"
        echo "Please run this script from a directory you can write to."
        exit 1
    fi
    
    verbose "Write permissions OK"
}

# Determine version to install
resolve_version() {
    if [ "$CARL_VERSION" = "latest" ]; then
        log "🔍 Fetching latest CARL release..."
        
        local api_url="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"
        local release_info
        
        if ! release_info=$(curl -s "$api_url"); then
            error "Failed to fetch release information from GitHub"
            exit 1
        fi
        
        if [ "$USE_JQ" = "1" ]; then
            CARL_VERSION=$(echo "$release_info" | jq -r '.tag_name')
        else
            CARL_VERSION=$(echo "$release_info" | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
        fi
        
        if [ -z "$CARL_VERSION" ] || [ "$CARL_VERSION" = "null" ]; then
            error "Could not determine latest version"
            exit 1
        fi
        
        success "Latest version: $CARL_VERSION"
    else
        log "📌 Installing specific version: $CARL_VERSION"
    fi
    
    # Set download URL
    if [ "$CARL_VERSION" = "main" ] || [ "$CARL_VERSION" = "master" ]; then
        TARBALL_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${CARL_VERSION}.tar.gz"
    else
        TARBALL_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${CARL_VERSION}.tar.gz"
    fi
    verbose "Download URL: $TARBALL_URL"
}

# Check existing installation and compatibility
check_existing_installation() {
    if [ -f ".carl/schemas/carl-settings.schema.yaml" ]; then
        local current_version
        current_version=$(grep 'default: "' .carl/schemas/carl-settings.schema.yaml | sed 's/.*default: "\([^"]*\)".*/\1/' 2>/dev/null || echo "unknown")
        
        log "📦 Found existing CARL installation: v$current_version"
        
        # Check v1.x -> v2.x compatibility
        if [[ "$current_version" =~ ^1\. ]] && [[ "$CARL_VERSION" =~ ^v?2\. ]]; then
            error "CARL v1.x is incompatible with v2.x"
            echo ""
            echo "Please remove the existing installation first:"
            echo "  rm -rf .carl .claude/agents/carl* .claude/commands/carl CLAUDE.md"
            echo ""
            echo "Then run the installer again."
            exit 1
        fi
        
        log "🔄 Upgrading CARL to $CARL_VERSION"
        return 0
    else
        log "🆕 Fresh CARL installation: $CARL_VERSION"
        return 1
    fi
}

# Download and extract CARL
download_carl() {
    log "📥 Downloading CARL $CARL_VERSION..."
    
    TEMP_DIR=$(mktemp -d)
    verbose "Using temporary directory: $TEMP_DIR"
    
    # Ensure cleanup on exit
    trap "rm -rf $TEMP_DIR" EXIT
    
    if ! curl -fsSL "$TARBALL_URL" | tar -xz -C "$TEMP_DIR" --strip-components=1; then
        error "Failed to download or extract CARL archive"
        echo "URL: $TARBALL_URL"
        exit 1
    fi
    
    # Verify download integrity
    if [ ! -f "$TEMP_DIR/.carl/schemas/carl-settings.schema.yaml" ]; then
        error "Downloaded archive is missing core CARL files"
        echo "This may indicate a corrupted download or invalid version."
        exit 1
    fi
    
    verbose "Download and extraction completed successfully"
}

# Install CARL system files
install_system_files() {
    if [ "$DRY_RUN" = "1" ]; then
        log "🔍 DRY RUN - would install the following:"
        echo "  📁 .carl/ directory (schemas, hooks, project structure)"
        echo "  🤖 .claude/agents/carl-*.md files"
        echo "  📋 .claude/commands/carl/ directory"
        echo "  📄 CLAUDE.md file"
        echo "  🔧 Merge hooks into .claude/settings.json"
        return 0
    fi
    
    log "📁 Installing CARL system files..."
    
    # Install .carl directory
    verbose "Installing .carl directory..."
    cp -r "$TEMP_DIR/.carl" .
    
    # Install Claude Code integration files
    verbose "Installing Claude Code integration..."
    mkdir -p .claude/{agents,commands}
    
    # Copy CARL agents (only carl-* files)
    if [ -d "$TEMP_DIR/.claude/agents" ]; then
        cp "$TEMP_DIR/.claude/agents/"carl-*.md .claude/agents/ 2>/dev/null || true
    fi
    
    # Copy CARL commands
    if [ -d "$TEMP_DIR/.claude/commands/carl" ]; then
        cp -r "$TEMP_DIR/.claude/commands/carl" .claude/commands/
    fi
    
    # Copy project instructions
    if [ -f "$TEMP_DIR/CLAUDE.md" ]; then
        cp "$TEMP_DIR/CLAUDE.md" .
    fi
    
    # Set executable permissions on hook scripts
    verbose "Setting executable permissions on hooks..."
    find .carl/hooks -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    
    success "CARL system files installed"
}

# Merge CARL hooks into Claude settings
merge_claude_settings() {
    if [ "$DRY_RUN" = "1" ]; then
        return 0
    fi
    
    local settings_file=".claude/settings.json"
    local temp_settings="$TEMP_DIR/.claude/settings.json"
    
    if [ -f "$settings_file" ]; then
        log "🔧 Merging CARL hooks into existing Claude settings..."
        
        # Create backup
        cp "$settings_file" "${settings_file}.backup"
        verbose "Created backup: ${settings_file}.backup"
        
        if [ "$USE_JQ" = "1" ] && [ -f "$temp_settings" ]; then
            # Use jq for proper JSON merging
            verbose "Using jq for JSON merging..."
            
            if jq -s '.[0] * {"hooks": (.[0].hooks // {} | . * .[1].hooks)}' \
                "$settings_file" "$temp_settings" > "${settings_file}.tmp"; then
                mv "${settings_file}.tmp" "$settings_file"
                success "Settings merged successfully"
            else
                warn "jq merge failed - restoring backup"
                mv "${settings_file}.backup" "$settings_file"
            fi
        else
            warn "Cannot merge settings automatically - manual merge required"
            echo "Your original settings are backed up to ${settings_file}.backup"
            echo "CARL settings are in $temp_settings"
        fi
        
        # Validate final JSON
        if [ "$USE_JQ" = "1" ]; then
            if ! jq empty "$settings_file" 2>/dev/null; then
                warn "Invalid JSON detected - restoring backup"
                mv "${settings_file}.backup" "$settings_file"
            fi
        fi
        
    else
        log "📄 Creating new Claude settings with CARL hooks..."
        mkdir -p .claude
        if [ -f "$temp_settings" ]; then
            cp "$temp_settings" "$settings_file"
            success "Claude settings created"
        else
            warn "No CARL settings template found in download"
        fi
    fi
}

# Generate CARL settings file
generate_carl_settings() {
    if [ "$DRY_RUN" = "1" ]; then
        return 0
    fi
    
    local settings_file=".carl/carl-settings.json"
    
    # Don't overwrite existing personal settings
    if [ -f "$settings_file" ]; then
        verbose "Personal CARL settings exist - not overwriting"
        return 0
    fi
    
    log "⚙️  Generating CARL configuration..."
    
    # Generate from schema defaults (simplified version)
    # In a real implementation, this would parse the schema and generate defaults
    cat > "$settings_file" << 'EOF'
{
  "system": {
    "version": "2.0.0",
    "project_root": "",
    "installation_path": "",
    "created_at": ""
  },
  "audio": {
    "enabled": true,
    "notifications": {
      "session_start": {
        "enabled": true,
        "message_template": "Good {time_of_day}, CARL session started",
        "fallback_message": "Good {time_of_day}, CARL session started"
      },
      "stop": {
        "enabled": true,
        "message_template": "{project} operation completed",
        "fallback_message": "{project} operation completed"
      },
      "attention": {
        "enabled": true,
        "message_template": "{project} needs your attention",
        "fallback_message": "Claude Code needs your attention"
      },
      "progress_milestone": {
        "enabled": false,
        "message_template": "Progress milestone reached",
        "fallback_message": "Progress milestone reached"
      },
      "schema_validation_error": {
        "enabled": false,
        "message_template": "Schema validation error detected",
        "fallback_message": "Schema validation error detected"
      },
      "tech_debt_detected": {
        "enabled": false,
        "message_template": "Technical debt detected",
        "fallback_message": "Technical debt detected"
      }
    },
    "voice": {
      "macos": {
        "voice": "default",
        "rate": 200,
        "volume": 0.5
      },
      "linux": {
        "voice": "default",
        "rate": "normal",
        "volume": "normal"
      },
      "wsl": {
        "voice": "default",
        "rate": 0,
        "volume": 100
      },
      "windows": {
        "voice": "default",
        "rate": 0,
        "volume": 100
      },
      "elevenlabs": {
        "integration_level": "disabled",
        "mcp_enabled": false,
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "model": "eleven_monolingual_v1",
        "output_format": "mp3_44100_128",
        "cache_audio": true,
        "cache_duration_hours": 24,
        "generic_messages_only": true
      }
    }
  },
  "session": {
    "auto_compaction": true,
    "compaction_strategy": "calendar_based",
    "retention_periods": {
      "daily_sessions_days": 7
    },
    "track_agent_performance": true,
    "track_command_metrics": true
  },
  "hooks": {
    "schema_validation": {
      "strict_mode": true,
      "auto_fix_minor_issues": true
    },
    "progress_tracking": {
      "auto_update_percentages": true,
      "milestone_thresholds": [25, 50, 75, 90, 100]
    },
    "tech_debt_extraction": {
      "keywords": ["TODO", "FIXME", "HACK", "XXX", "NOTE"],
      "auto_prioritize": true
    },
    "completion_handler": {
      "auto_move_completed": true,
      "completion_threshold": 100
    }
  },
  "context_injection": {
    "enabled": true,
    "carl_commands_only": true,
    "include_active_work": true,
    "include_recent_sessions": false,
    "max_context_tokens": 500
  },
  "developer": {
    "preferred_time_format": "12h",
    "timezone": "auto",
    "work_hours": {
      "start": "07:00",
      "end": "18:00"
    }
  }
}
EOF
    
    # Update with actual values
    local project_root=$(pwd)
    local installation_path="$project_root/.carl"
    local created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [ "$USE_JQ" = "1" ]; then
        jq --arg project_root "$project_root" \
           --arg installation_path "$installation_path" \
           --arg created_at "$created_at" \
           --arg version "$CARL_VERSION" \
           '.system.project_root = $project_root | .system.installation_path = $installation_path | .system.created_at = $created_at | .system.version = $version' \
           "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
    fi
    
    success "CARL configuration generated"
}

# Display success message and next steps
show_success() {
    echo ""
    success "CARL $CARL_VERSION installed successfully!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Run: /carl:analyze"
    echo "  2. Start planning: /carl:plan 'Add user authentication'"
    echo "  3. Execute work: /carl:task [work-item.carl]"
    echo "  4. Monitor progress: /carl:status"
    echo ""
    echo "📚 Documentation: https://github.com/${REPO_OWNER}/${REPO_NAME}"
    echo "🆘 Support: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues"
    
    if [ -f ".claude/settings.json.backup" ]; then
        echo "💾 Your original Claude settings backed up to .claude/settings.json.backup"
    fi
}

# Main installation flow
main() {
    echo "🎯 CARL Installation Script"
    echo "=========================================="
    
    check_dependencies
    check_permissions
    resolve_version
    
    local is_upgrade=false
    if check_existing_installation; then
        is_upgrade=true
    fi
    
    download_carl
    install_system_files
    merge_claude_settings
    generate_carl_settings
    
    if [ "$DRY_RUN" = "1" ]; then
        log "🔍 DRY RUN completed - no files were modified"
        exit 0
    fi
    
    show_success
}

# Run main function
main "$@"