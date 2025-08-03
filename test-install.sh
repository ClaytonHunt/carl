#!/bin/bash
# CARL Installation Test Harness
# Tests various installation scenarios

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test directory setup
TEST_BASE_DIR="test-install-scenarios"
INSTALL_SCRIPT="../../install.sh"

# Logging functions
log() {
    echo -e "${BLUE}$1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Create test directory structure
setup_test_env() {
    rm -rf "$TEST_BASE_DIR"
    mkdir -p "$TEST_BASE_DIR"
    cd "$TEST_BASE_DIR"
}

# Scenario 1: Fresh installation (no existing files)
test_fresh_install() {
    log "=== Testing Scenario 1: Fresh Installation ==="
    
    mkdir -p fresh-install
    cd fresh-install
    
    log "Running installation..."
    if CARL_VERSION=carl-system-v2 bash "$INSTALL_SCRIPT"; then
        success "Installation completed"
        
        # Verify files exist
        if [ -f ".carl/schemas/carl-settings.schema.yaml" ]; then
            success ".carl directory installed"
        else
            error ".carl directory missing"
        fi
        
        if [ -f ".claude/settings.json" ]; then
            success "Claude settings created"
            # Check if hooks are present
            if grep -q "carl/hooks" .claude/settings.json; then
                success "CARL hooks present in settings"
            else
                error "CARL hooks missing from settings"
            fi
        else
            error "Claude settings missing"
        fi
        
        if [ -f "CLAUDE.md" ]; then
            success "CLAUDE.md installed"
        else
            error "CLAUDE.md missing"
        fi
    else
        error "Installation failed"
    fi
    
    cd ..
    echo ""
}

# Scenario 2: Existing Claude settings (merge test)
test_existing_settings() {
    log "=== Testing Scenario 2: Existing Claude Settings ==="
    
    mkdir -p existing-settings
    cd existing-settings
    
    # Create existing Claude settings with custom content
    mkdir -p .claude
    cat > .claude/settings.json << 'EOF'
{
  "customSetting": "user-value",
  "hooks": {
    "CustomHook": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "echo 'custom hook'"
      }]
    }]
  }
}
EOF
    
    log "Created existing settings with custom content"
    
    log "Running installation..."
    if CARL_VERSION=carl-system-v2 bash "$INSTALL_SCRIPT" 2>&1 | tee install.log; then
        success "Installation completed"
        
        # Check if custom settings preserved
        if grep -q "customSetting" .claude/settings.json; then
            success "Custom settings preserved"
        else
            error "Custom settings lost"
        fi
        
        # Check if CARL hooks added
        if grep -q "carl/hooks" .claude/settings.json; then
            success "CARL hooks added"
        else
            error "CARL hooks missing"
        fi
        
        # Check if custom hooks preserved
        if grep -q "CustomHook" .claude/settings.json; then
            success "Custom hooks preserved"
        else
            error "Custom hooks lost"
        fi
        
        # Show final settings
        log "Final settings structure:"
        jq '.' .claude/settings.json || cat .claude/settings.json
    else
        error "Installation failed"
        cat install.log
    fi
    
    cd ..
    echo ""
}

# Scenario 3: Upgrade existing CARL installation
test_upgrade() {
    log "=== Testing Scenario 3: Upgrade Existing CARL ==="
    
    mkdir -p upgrade-test
    cd upgrade-test
    
    # Simulate existing CARL v2.0.0 installation
    mkdir -p .carl/schemas
    cat > .carl/schemas/carl-settings.schema.yaml << 'EOF'
properties:
  system:
    properties:
      version:
        default: "2.0.0"
EOF
    
    log "Created simulated v2.0.0 installation"
    
    log "Running upgrade..."
    if CARL_VERSION=carl-system-v2 bash "$INSTALL_SCRIPT"; then
        success "Upgrade completed"
        
        # Verify upgrade happened
        if [ -f ".carl/schemas/carl-settings.schema.yaml" ]; then
            success "Schemas updated"
        fi
    else
        error "Upgrade failed"
    fi
    
    cd ..
    echo ""
}

# Scenario 4: Complex Claude settings with arrays
test_complex_settings() {
    log "=== Testing Scenario 4: Complex Claude Settings ==="
    
    mkdir -p complex-settings
    cd complex-settings
    
    # Create complex existing settings
    mkdir -p .claude
    cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Read",
      "hooks": [{
        "type": "command",
        "command": "echo 'read hook'"
      }]
    }],
    "SessionStart": [{
      "matcher": "project1",
      "hooks": [{
        "type": "command",
        "command": "echo 'project1 start'"
      }]
    }]
  }
}
EOF
    
    log "Created complex settings with existing hooks"
    
    log "Running installation..."
    if CARL_VERSION=carl-system-v2 bash "$INSTALL_SCRIPT" 2>&1 | tee install.log; then
        success "Installation completed"
        
        # Validate JSON
        if jq empty .claude/settings.json 2>/dev/null; then
            success "Settings JSON is valid"
            
            # Show merged result
            log "Merged settings:"
            jq '.' .claude/settings.json
        else
            error "Invalid JSON after merge"
            cat .claude/settings.json
        fi
    else
        error "Installation failed"
        cat install.log
    fi
    
    cd ..
    echo ""
}

# Scenario 5: Dry run test
test_dry_run() {
    log "=== Testing Scenario 5: Dry Run ==="
    
    mkdir -p dry-run-test
    cd dry-run-test
    
    log "Running dry run..."
    if CARL_DRY_RUN=1 CARL_VERSION=carl-system-v2 bash "$INSTALL_SCRIPT"; then
        success "Dry run completed"
        
        # Verify no files created
        if [ ! -f ".carl/schemas/carl-settings.schema.yaml" ]; then
            success "No files created (as expected)"
        else
            error "Files created during dry run!"
        fi
    else
        error "Dry run failed"
    fi
    
    cd ..
    echo ""
}

# Run all tests
main() {
    log "🧪 CARL Installation Test Suite"
    log "================================="
    echo ""
    
    setup_test_env
    
    test_fresh_install
    test_existing_settings
    test_upgrade
    test_complex_settings
    test_dry_run
    
    log "Test suite completed!"
    cd ..
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi