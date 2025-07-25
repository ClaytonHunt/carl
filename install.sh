#!/bin/bash

# CARL Installation Script
# Context-Aware Requirements Language - Easy deployment to any project
# 
# Usage:
#   ./install.sh                    # Install CARL in current directory
#   ./install.sh /path/to/project   # Install CARL in specified project
#   ./install.sh --global           # Install CARL globally for user

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# CARL ASCII Art
show_carl_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
   ______          _____  _      
  / ____/   /\    |  __ \| |     
 | |       /  \   | |__) | |     
 | |      / /\ \  |  _  /| |     
 | |____ / ____ \ | | \ \| |____ 
  \_____/_/    \_\|_|  \_\______|
                                 
  Context-Aware Requirements Language
  AI-Optimized Planning for Claude Code
EOF
    echo -e "${NC}"
    echo -e "${PURPLE}🎯 Carl Wheezer is ready to help with your development!${NC}"
    echo ""
}

# Configuration
CARL_REPO_URL="https://github.com/claytonhunt/carl.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLOBAL_INSTALL_DIR="$HOME/.carl-global"

# Parse command line arguments
parse_arguments() {
    TARGET_DIR=""
    GLOBAL_INSTALL=false
    FORCE_INSTALL=false
    SKIP_AUDIO_TEST=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --global)
                GLOBAL_INSTALL=true
                TARGET_DIR="$GLOBAL_INSTALL_DIR"
                shift
                ;;
            --force)
                FORCE_INSTALL=true
                shift
                ;;
            --skip-audio-test)
                SKIP_AUDIO_TEST=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --*)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_help
                exit 1
                ;;
            *)
                if [ -z "$TARGET_DIR" ]; then
                    TARGET_DIR="$1"
                else
                    echo -e "${RED}❌ Multiple target directories specified${NC}"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Default to current directory if no target specified
    if [ -z "$TARGET_DIR" ]; then
        TARGET_DIR="$(pwd)"
    fi
    
    # Resolve absolute path
    TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
}

# Show help information
show_help() {
    echo "CARL Installation Script"
    echo ""
    echo "Usage:"
    echo "  ./install.sh [OPTIONS] [TARGET_DIRECTORY]"
    echo ""
    echo "Options:"
    echo "  --global              Install CARL globally for user (~/.carl-global)"
    echo "  --force               Force installation even if CARL already exists"
    echo "  --skip-audio-test     Skip audio system testing during installation"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./install.sh                    # Install in current directory"
    echo "  ./install.sh /path/to/project   # Install in specific project"
    echo "  ./install.sh --global           # Install globally for user"
    echo "  ./install.sh --force            # Force reinstall"
}

# Check system requirements
check_requirements() {
    echo -e "${BLUE}🔍 Checking system requirements...${NC}"
    
    local missing_requirements=()
    
    # Check for bash (should be available if we're running)
    if ! command -v bash >/dev/null 2>&1; then
        missing_requirements+=("bash")
    fi
    
    # Check for git
    if ! command -v git >/dev/null 2>&1; then
        missing_requirements+=("git")
    fi
    
    # Check for basic utilities
    for cmd in mkdir chmod find grep sed; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_requirements+=("$cmd")
        fi
    done
    
    if [ ${#missing_requirements[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required commands:${NC}"
        printf '   - %s\n' "${missing_requirements[@]}"
        echo ""
        echo "Please install missing requirements and try again."
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements satisfied${NC}"
}

# Check Claude Code availability
check_claude_code() {
    echo -e "${BLUE}🤖 Checking Claude Code availability...${NC}"
    
    if command -v claude >/dev/null 2>&1; then
        local claude_version=$(claude --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Claude Code found: $claude_version${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Claude Code not found in PATH${NC}"
        echo "   CARL will still work, but some features require Claude Code."
        echo "   Install Claude Code from: https://docs.anthropic.com/claude/docs/claude-code"
        return 1
    fi
}

# Detect existing CARL installation
check_existing_installation() {
    local carl_marker="$TARGET_DIR/.carl"
    local claude_marker="$TARGET_DIR/.claude"
    
    if [ -d "$carl_marker" ] || [ -d "$claude_marker" ]; then
        if [ "$FORCE_INSTALL" = false ]; then
            echo -e "${YELLOW}⚠️  CARL installation detected in target directory${NC}"
            echo "   Target: $TARGET_DIR"
            echo ""
            echo "Options:"
            echo "  1. Use --force to reinstall"
            echo "  2. Choose a different directory"
            echo "  3. Remove existing installation manually"
            exit 1
        else
            echo -e "${YELLOW}🔄 Force install requested - removing existing CARL files${NC}"
            rm -rf "$carl_marker" "$claude_marker" 2>/dev/null || true
        fi
    fi
}

# Create CARL directory structure
create_directory_structure() {
    echo -e "${BLUE}📁 Creating CARL directory structure...${NC}"
    
    local directories=(
        ".claude/commands"
        ".claude/hooks"
        ".claude/agents"
        ".carl/audio/start"
        ".carl/audio/work"
        ".carl/audio/progress"
        ".carl/audio/success"
        ".carl/audio/end"
        ".carl/scripts"
        ".carl/config"
        ".carl/templates"
        ".carl/sessions"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$TARGET_DIR/$dir"
        echo "   ✅ Created $dir"
    done
}

# Copy CARL files from source
copy_carl_files() {
    echo -e "${BLUE}📋 Installing CARL system files...${NC}"
    
    # Determine source directory
    local source_dir
    if [ -f "$SCRIPT_DIR/.carl/scripts/carl-helpers.sh" ]; then
        # Running from CARL repository
        source_dir="$SCRIPT_DIR"
    else
        echo -e "${RED}❌ Cannot find CARL source files${NC}"
        echo "   Make sure you're running install.sh from the CARL repository"
        exit 1
    fi
    
    # Copy all CARL files
    echo "   📂 Copying .claude directory..."
    cp -r "$source_dir/.claude/"* "$TARGET_DIR/.claude/" 2>/dev/null || true
    
    echo "   📂 Copying .carl directory..."
    cp -r "$source_dir/.carl/"* "$TARGET_DIR/.carl/" 2>/dev/null || true
    
    # Make scripts executable
    find "$TARGET_DIR/.carl/scripts" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
    find "$TARGET_DIR/.claude/hooks" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
    
    echo -e "${GREEN}✅ CARL files installed successfully${NC}"
}

# Configure Claude Code hooks
configure_claude_hooks() {
    echo -e "${BLUE}🔗 Configuring Claude Code hooks...${NC}"
    
    local settings_file="$TARGET_DIR/.claude/settings.json"
    
    # Create settings.json if it doesn't exist
    if [ ! -f "$settings_file" ]; then
        cat > "$settings_file" << 'EOF'
{
  "hooks": {
    "session-start": {
      "command": ".claude/hooks/session-start.sh",
      "description": "Load CARL context and initialize session tracking"
    },
    "user-prompt-submit": {
      "command": ".claude/hooks/user-prompt-submit.sh",
      "description": "Inject relevant CARL context into AI prompts"
    },
    "tool-call": {
      "command": ".claude/hooks/tool-call.sh",
      "description": "Track progress and update CARL files automatically"
    },
    "session-end": {
      "command": ".claude/hooks/session-end.sh", 
      "description": "Save session state and generate development summaries"
    }
  }
}
EOF
        echo "   ✅ Created Claude Code settings.json"
    else
        echo "   ℹ️  settings.json already exists - manual hook configuration may be needed"
    fi
}

# Initialize CARL configuration
initialize_carl_config() {
    echo -e "${BLUE}⚙️  Initializing CARL configuration...${NC}"
    
    local config_file="$TARGET_DIR/.carl/config/carl-settings.json"
    
    cat > "$config_file" << EOF
{
  "carl_version": "1.0.0",
  "installation_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_path": "$TARGET_DIR",
  "global_install": $GLOBAL_INSTALL,
  "audio_settings": {
    "audio_enabled": true,
    "quiet_mode": false,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00",
    "volume_level": 75
  },
  "development_settings": {
    "auto_context_injection": true,
    "session_tracking": true,
    "progress_monitoring": true,
    "specialist_agents_enabled": true
  },
  "analysis_settings": {
    "parallel_analysis": true,
    "comprehensive_scanning": true,
    "auto_update_on_git_pull": true,
    "include_test_coverage": true
  }
}
EOF
    
    echo "   ✅ CARL configuration initialized"
}

# Test audio system
test_audio_system() {
    if [ "$SKIP_AUDIO_TEST" = true ]; then
        echo -e "${YELLOW}⏭️  Skipping audio system test as requested${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🎵 Testing Carl Wheezer audio system...${NC}"
    
    # Source the audio system
    if [ -f "$TARGET_DIR/.carl/scripts/carl-audio.sh" ]; then
        source "$TARGET_DIR/.carl/scripts/carl-audio.sh"
        
        # Initialize audio directories and samples
        carl_init_audio 2>/dev/null
        
        echo ""
        echo -e "${GREEN}🎤 Audio system test completed${NC}"
        echo "   Use 'source .carl/scripts/carl-audio.sh && carl_test_audio' for detailed testing"
    else
        echo -e "${YELLOW}⚠️  Audio system files not found - skipping test${NC}"
    fi
}

# Create example CARL files
create_example_files() {
    echo -e "${BLUE}📝 Creating example CARL files...${NC}"
    
    # Create example index.carl
    cat > "$TARGET_DIR/.carl/index.carl" << 'EOF'
# CARL Project Index
# This file provides quick AI context about the project structure

project_status: initialized
last_analysis: never
active_features: []
technical_stack: unknown

# Quick context for AI
project_type: unknown
development_phase: planning
team_size: unknown
primary_language: unknown

# Recent activity
recent_sessions: []
active_work: none
next_priorities: []

# Project health
test_coverage: unknown
build_status: unknown
deployment_status: unknown
technical_debt_items: 0
EOF
    
    echo "   ✅ Created example index.carl"
    
    # Create project detection script
    cat > "$TARGET_DIR/.carl/scripts/detect-project.sh" << 'EOF'
#!/bin/bash

# Project Detection Script
# Automatically detects project type and updates CARL configuration

detect_project_type() {
    local project_dir="$1"
    
    # Check for common project files
    if [ -f "$project_dir/package.json" ]; then
        echo "nodejs"
    elif [ -f "$project_dir/requirements.txt" ] || [ -f "$project_dir/setup.py" ]; then
        echo "python"
    elif [ -f "$project_dir/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$project_dir/go.mod" ]; then
        echo "go"
    elif [ -f "$project_dir/pom.xml" ] || [ -f "$project_dir/build.gradle" ]; then
        echo "java"
    elif [ -f "$project_dir/Gemfile" ]; then
        echo "ruby"
    elif [ -f "$project_dir/composer.json" ]; then
        echo "php"
    elif [ -f "$project_dir/*.csproj" ] || [ -f "$project_dir/*.sln" ]; then
        echo "dotnet"
    else
        echo "unknown"
    fi
}

# Update CARL index with detected information
update_carl_index() {
    local project_type="$1"
    local carl_index="$2"
    
    # Update project type in index
    sed -i.bak "s/project_type: unknown/project_type: $project_type/" "$carl_index" 2>/dev/null || true
    sed -i.bak "s/last_analysis: never/last_analysis: $(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$carl_index" 2>/dev/null || true
    
    # Clean up backup file
    rm "$carl_index.bak" 2>/dev/null || true
}

# Main execution
if [ $# -eq 0 ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="$1"
fi

PROJECT_TYPE=$(detect_project_type "$PROJECT_DIR")
CARL_INDEX="$PROJECT_DIR/.carl/index.carl"

if [ -f "$CARL_INDEX" ]; then
    update_carl_index "$PROJECT_TYPE" "$CARL_INDEX"
    echo "Detected project type: $PROJECT_TYPE"
else
    echo "CARL index not found at $CARL_INDEX"
    exit 1
fi
EOF
    
    chmod +x "$TARGET_DIR/.carl/scripts/detect-project.sh"
    echo "   ✅ Created project detection script"
}

# Perform post-installation setup
post_installation_setup() {
    echo -e "${BLUE}🔧 Performing post-installation setup...${NC}"
    
    # Run project detection
    if [ -f "$TARGET_DIR/.carl/scripts/detect-project.sh" ]; then
        "$TARGET_DIR/.carl/scripts/detect-project.sh" "$TARGET_DIR" 2>/dev/null || true
        echo "   ✅ Project detection completed"
    fi
    
    # Create .gitignore entries for CARL (optional)
    local gitignore="$TARGET_DIR/.gitignore"
    if [ -f "$gitignore" ]; then
        if ! grep -q ".carl/sessions" "$gitignore" 2>/dev/null; then
            echo "" >> "$gitignore"
            echo "# CARL session data (optional - these can be committed or ignored)" >> "$gitignore"
            echo ".carl/sessions/*.session" >> "$gitignore"
            echo ".carl/config/user-preferences.json" >> "$gitignore"
            echo "   ✅ Updated .gitignore with CARL entries"
        fi
    fi
}

# Show installation summary
show_installation_summary() {
    echo ""
    echo -e "${GREEN}🎉 CARL Installation Complete!${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "${PURPLE}📍 Installation Location: ${NC}$TARGET_DIR"
    echo -e "${PURPLE}🎯 Project Type: ${NC}$(cat "$TARGET_DIR/.carl/index.carl" 2>/dev/null | grep "project_type:" | cut -d':' -f2 | xargs || echo "unknown")"
    echo -e "${PURPLE}🤖 Claude Code Integration: ${NC}$(command -v claude >/dev/null 2>&1 && echo "✅ Ready" || echo "⚠️  Install Claude Code for full functionality")"
    echo ""
    echo -e "${YELLOW}🚀 Next Steps:${NC}"
    echo "   1. Navigate to your project: cd $TARGET_DIR"
    echo "   2. Start Claude Code: claude"
    echo "   3. Try your first CARL command: /analyze"
    echo ""
    echo -e "${YELLOW}📚 Available Commands:${NC}"
    echo "   /analyze  - Scan codebase and generate CARL files"
    echo "   /plan     - Create intelligent development plans"
    echo "   /status   - Check project progress and health"
    echo "   /task     - Execute context-aware development tasks"
    echo "   /settings - Configure CARL behavior"
    echo ""
    echo -e "${YELLOW}🎵 Audio System:${NC}"
    echo "   Carl Wheezer audio feedback is ready!"
    echo "   Test with: source .carl/scripts/carl-audio.sh && carl_test_audio"
    echo ""
    echo -e "${CYAN}🔧 Configuration Files:${NC}"
    echo "   - .claude/settings.json (Claude Code hooks)"
    echo "   - .carl/config/carl-settings.json (CARL settings)"
    echo "   - .carl/index.carl (Project context for AI)"
    echo ""
    if [ "$GLOBAL_INSTALL" = true ]; then
        echo -e "${BLUE}🌍 Global Installation:${NC}"
        echo "   CARL is installed globally at: $GLOBAL_INSTALL_DIR"
        echo "   Copy .carl and .claude folders to any project to use CARL"
        echo ""
    fi
    echo -e "${GREEN}Happy coding with CARL! 🎯${NC}"
}

# Handle installation errors
handle_error() {
    echo ""
    echo -e "${RED}❌ CARL installation failed!${NC}"
    echo "   Error occurred during: $1"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "   1. Check file permissions in target directory"
    echo "   2. Ensure you have write access to: $TARGET_DIR"
    echo "   3. Try running with --force to overwrite existing files"
    echo "   4. Check system requirements: bash, git, basic utilities"
    echo ""
    echo "📞 Get help:"
    echo "   - GitHub Issues: https://github.com/claytonsuplinski/carl/issues"
    echo "   - Documentation: README.md in CARL repository"
    exit 1
}

# Main installation function
main() {
    # Show banner
    show_carl_banner
    
    # Parse arguments
    parse_arguments "$@"
    
    echo -e "${CYAN}🎯 Installing CARL to: ${NC}$TARGET_DIR"
    echo -e "${CYAN}🌍 Global install: ${NC}$GLOBAL_INSTALL"
    echo ""
    
    # Installation steps with error handling
    check_requirements || handle_error "requirements check"
    check_claude_code || true  # Non-fatal
    check_existing_installation || handle_error "existing installation check"
    create_directory_structure || handle_error "directory creation"
    copy_carl_files || handle_error "file copying"
    configure_claude_hooks || handle_error "Claude Code hook configuration"
    initialize_carl_config || handle_error "CARL configuration"
    create_example_files || handle_error "example file creation"
    test_audio_system || true  # Non-fatal
    post_installation_setup || handle_error "post-installation setup"
    
    # Show success summary
    show_installation_summary
}

# Run main installation
main "$@"