# Contributing to CARL

Thank you for your interest in contributing to CARL! This guide will help you get started with contributing to the Context-Aware Requirements Language system.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Workflow](#contributing-workflow)
- [Code Standards](#code-standards)
- [Documentation Guidelines](#documentation-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- [Claude Code](https://claude.ai/code) - Anthropic's official CLI
- Git 2.20+ 
- Bash 4.0+ (for hook system)
- **jq** - JSON processor ([install guide](https://jqlang.github.io/jq/download/))
- **yq** - YAML processor ([install guide](https://github.com/mikefarah/yq/releases))
- Basic familiarity with YAML schemas

### First Time Setup

1. **Fork and Clone**
   ```bash
   git fork https://github.com/carlsystem/carl
   git clone https://github.com/yourusername/carl.git
   cd carl
   ```

2. **Install CARL in Development Mode**
   ```bash
   # Copy CARL system to your project (symlink for development)
   ln -s $(pwd)/.carl ~/.carl-dev
   ln -s $(pwd)/.claude ~/.claude-dev
   ```

3. **Verify Installation**
   ```bash
   claude # Start Claude Code
   /carl:status # Should show CARL system active
   ```

## Development Setup

### Understanding the Codebase

CARL has several key areas:

```
.carl/
├── hooks/              # Bash scripts for automation
│   ├── lib/           # Shared hook utilities
│   └── *.sh          # Hook implementations
├── schemas/           # YAML schema definitions
└── sessions/          # Session tracking (generated)

.claude/
├── agents/            # AI agent definitions
├── commands/carl/     # Command implementations
└── settings.json      # Hook configuration

docs/                  # Comprehensive documentation
├── architecture/      # System design
├── integration/       # Implementation guides
└── workflows/         # Command documentation
```

### Development Principles

1. **Use CARL to Build CARL** - All development should use CARL workflow
2. **Schema First** - All data structures must have schemas
3. **Hook Driven** - Automation via lightweight bash hooks
4. **Agent Specialization** - Create focused, single-purpose agents
5. **Documentation Driven** - All features documented before implementation

## Contributing Workflow

### 1. Choose Your Contribution

**Areas for Contribution:**
- 🐛 **Bug Fixes** - Fix issues in existing functionality
- ✨ **Features** - Add new CARL capabilities  
- 📚 **Documentation** - Improve guides and references
- 🧪 **Testing** - Add test coverage and validation
- 🎨 **Agent Development** - Create specialized agents
- 🔧 **Hook Improvements** - Enhance automation scripts

### 2. Plan Your Work

Use CARL's own system to plan your contribution:

```bash
# Plan your contribution using CARL
/carl:plan "Fix schema validation error handling in completion hook"

# This creates a proper CARL file with scope, timeline, and acceptance criteria
```

### 3. Development Process

```bash
# Create feature branch
git checkout -b feature/your-contribution

# Use CARL to execute your planned work
/carl:task your-contribution.story.carl

# CARL will guide you through implementation with:
# - TDD enforcement (if enabled)
# - Progress tracking
# - Quality gates
# - Completion validation
```

### 4. Quality Assurance

Before submitting, ensure:

- [ ] All hook scripts are executable and properly formatted
- [ ] Schema files are valid YAML and complete
- [ ] Documentation is updated for any new features
- [ ] Agent files follow naming conventions and include proper metadata
- [ ] Manual testing completed using CARL commands

## Code Standards

### Bash Scripts (Hooks)

```bash
#!/bin/bash
# script-name.sh - Brief description
# Triggered by: [hook type]
# Dependencies: library-name.sh

# Always check for CLAUDE_PROJECT_DIR
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source required libraries
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session.sh"

# Use proper error handling
set -euo pipefail

# Document functions
# Description of what this function does
function_name() {
    local param1="$1"
    # Implementation
}
```

### YAML Schemas

```yaml
$schema: "http://json-schema.org/draft-07/schema#"
title: "Descriptive Schema Title"
description: "Clear description of what this schema validates"
type: object
additionalProperties: false

required:
  - essential_field
  - another_required_field

properties:
  field_name:
    type: string
    pattern: "^[a-z][a-z0-9_]*[a-z0-9]$"
    description: "Clear description of field purpose and format"
```

### Agent Files

```markdown
---
name: agent-name
description: Clear description of when to use this agent proactively
tools: Minimal, necessary tools only
---

# Purpose
Brief, focused role definition

## Core Responsibilities  
- Specific capability 1
- Specific capability 2

## Operational Guidelines
Detailed step-by-step instructions
```

## Documentation Guidelines

### Writing Style

- **User-focused** - Write for developers using CARL
- **Action-oriented** - Start with verbs, provide clear next steps
- **Example-driven** - Include real command examples and outputs
- **Progressive disclosure** - Start simple, link to detailed docs

### Documentation Structure

```markdown
# Feature/Command Name

Brief description of purpose and value.

## Quick Start

Simple 2-3 step process to get started.

## Detailed Usage

Comprehensive examples and edge cases.

## Integration

How this connects with other CARL components.

## Troubleshooting

Common issues and solutions.
```

## Testing

### Manual Testing Checklist

Before submitting changes:

- [ ] **Hook Testing**: New hooks execute without errors
- [ ] **Schema Validation**: CARL files validate against schemas  
- [ ] **Command Integration**: Commands work with new features
- [ ] **Agent Behavior**: New agents respond appropriately
- [ ] **Cross-platform**: Works on Linux, macOS, WSL

### Testing Commands

```bash
# Test schema validation
bash .carl/hooks/schema-validate.sh

# Test session management
bash .carl/hooks/session-start.sh

# Test completion handling  
bash .carl/hooks/completion-handler.sh

# Validate all schemas
for schema in .carl/schemas/*.yaml; do
    echo "Validating $schema"
    yamllint "$schema"
done
```

## Submitting Changes

### Pull Request Process

1. **Ensure Clean History**
   ```bash
   git rebase -i origin/main # Clean up commits
   git push --force-with-lease origin feature/your-contribution
   ```

2. **PR Title Format**
   ```
   type(scope): brief description
   
   Examples:
   feat(hooks): add progress percentage tracking
   fix(schemas): correct validation pattern for IDs  
   docs(commands): improve /carl:plan examples
   ```

3. **PR Description Template**
   ```markdown
   ## Description
   Brief summary of changes and motivation.

   ## Changes Made
   - [ ] Feature/fix description
   - [ ] Documentation updates
   - [ ] Testing completed

   ## CARL Work Item
   Link to the CARL file used for planning this work.

   ## Testing
   How this was tested and validated.
   ```

### Review Process

1. **Automated Checks** - Schema validation, hook syntax
2. **Maintainer Review** - Code quality, architecture alignment  
3. **Community Feedback** - For significant features
4. **Integration Testing** - Verify with existing CARL functionality

## Community Guidelines

### Code of Conduct

- **Be Respectful** - Treat all contributors with respect
- **Be Constructive** - Provide helpful feedback and suggestions
- **Be Collaborative** - Work together toward shared goals
- **Be Patient** - Allow time for review and discussion

### Communication Channels

- **Issues** - Bug reports and feature requests
- **Discussions** - Questions, ideas, and general discussion
- **Pull Requests** - Code review and implementation discussion

### Getting Help

- **Documentation** - Check [CARL.md](CARL.md) and [docs/](docs/) first
- **Search Issues** - Your question might already be answered
- **Ask in Discussions** - Community can provide guidance
- **Tag Maintainers** - For urgent issues only

## Recognition

Contributors are recognized through:

- **Contributor List** - Added to README.md
- **Release Notes** - Features credited to contributors  
- **Community Highlights** - Significant contributions featured

---

**Ready to contribute?** Start by using CARL to plan your contribution with `/carl:plan "your contribution idea"` and let the system guide your development process!

## Questions?

- 📚 **Documentation**: [CARL.md](CARL.md)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/carlsystem/carl/discussions)  
- 🐛 **Issues**: [GitHub Issues](https://github.com/carlsystem/carl/issues)

Thank you for helping make CARL better! 🚀