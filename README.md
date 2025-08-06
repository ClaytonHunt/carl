# CARL - Context-Aware Requirements Language

**AI-Optimized Planning System for Claude Code**

CARL bridges the gap between human cognitive simplicity and AI context precision through structured planning, execution, and tracking capabilities designed specifically for AI-assisted development.

![CARL Workflow](https://img.shields.io/badge/Workflow-AI%20Optimized-blue) ![Status](https://img.shields.io/badge/Status-Production%20Ready-green) ![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-purple)

## Quick Start

### 1. Prerequisites

CARL requires the following tools:
- **jq** - JSON processor ([install guide](https://jqlang.github.io/jq/download/))
- **yq** - YAML processor ([install guide](https://github.com/mikefarah/yq/releases))

**Quick install:**
```bash
# macOS
brew install jq yq

# Ubuntu/Debian  
sudo apt-get install jq && sudo snap install yq

# Windows
choco install jq yq
```

### 2. Installation

Install CARL with a single command:

```bash
curl -fsSL https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh | bash
```

**Alternative installation options:**
```bash
# Install specific version
curl -fsSL https://github.com/ClaytonHunt/carl/releases/download/v2.0.0/install.sh | bash

# Dry run (see what would be installed)
curl -fsSL https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh | CARL_DRY_RUN=1 bash

# Verbose installation
curl -fsSL https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh | CARL_VERBOSE=1 bash
```

### 3. Initialize Your Project

```bash
# Let CARL analyze and set up your project
/carl:analyze
```

### 4. Start Planning

Create your first work item:
```bash
/carl:plan "Add user authentication system"
```

### 5. Execute Work

Start implementing:
```bash
# Standard execution (with full breakdown)
/carl:task user-authentication.feature.carl

# Rapid prototyping (yolo mode)
/carl:task user-authentication.feature.carl --yolo
```

### 6. Monitor Progress

Check your progress:
```bash
/carl:status
```

## Why CARL?

### For Developers
- **Zero Cognitive Load**: Four simple commands handle all complexity
- **Automatic Dependency Management**: Work executes in the right order  
- **Session Continuity**: Never lose context between coding sessions
- **Quality Gates**: Built-in TDD and testing integration

### For AI Assistants
- **Rich Context**: Every work item has comprehensive requirements and progress
- **Schema Validation**: Automatic data integrity with self-healing
- **Specialized Agents**: Domain-specific assistants created as needed
- **Progress Tracking**: Detailed activity logs for trend analysis

## Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/carl:analyze` | Set up project foundation | `/carl:analyze` |
| `/carl:plan` | Create work items | `/carl:plan "Add user dashboard"` |
| `/carl:task` | Execute work | `/carl:task dashboard.feature.carl` |
| `/carl:task --yolo` | Rapid prototyping | `/carl:task dashboard.feature.carl --yolo` |
| `/carl:status` | Monitor progress | `/carl:status --week` |

## Features

### 🎯 **Intelligent Scope Detection**
CARL automatically classifies work as Epic (3-6mo), Feature (2-4wk), Story (2-5d), or Technical based on complexity and requirements.

### 🔄 **Dependency Management** 
Advanced topological sorting enables parallel execution of independent work while respecting dependencies.

### 📊 **Session Analytics**
Daily session tracking with velocity analysis, health monitoring, and actionable insights.

### 🤖 **Dynamic Agent Creation**
Automatically generates specialist agents for unfamiliar technologies or domains.

### 🛡️ **Schema Validation**
All CARL files validated against schemas with automatic error fixing.

### 👥 **Multi-Developer Support**
Branch-aware session isolation with git integration for team coordination.

### 🚀 **Yolo Mode (Rapid Prototyping)**
Skip breakdown requirements for rapid prototyping and exploration:

```bash
# Full yolo - implement entire epic without breakdown
/carl:task user-auth.epic.carl --yolo

# Hybrid yolo - execute existing stories, yolo missing parts  
/carl:task payment.feature.carl --yolo
```

**Key Features:**
- **Smart Gap Analysis**: Identifies existing vs missing breakdown
- **Hybrid Execution**: Preserves structured work, yolos only gaps
- **Technical Debt Tracking**: Auto-creates cleanup tasks
- **Coverage Reporting**: Shows % structured vs % yolo execution
- **Ephemeral Mode**: No persistence beyond single execution

**When to Use:**
- ✅ Rapid prototyping and exploration
- ✅ Solo development and hackathons  
- ✅ Time-boxed proof of concepts
- ❌ Team development (needs coordination)
- ❌ Production systems (needs structure)

## Architecture

CARL uses a **dual-layer architecture**:

- **Human Layer**: Simple commands (`/carl:analyze`, `/carl:plan`, `/carl:task`, `/carl:status`)  
- **AI Layer**: Rich CARL files with comprehensive context and relationships

```
.carl/
├── project/
│   ├── epics/           # Strategic initiatives (3-6 months)
│   ├── features/        # User capabilities (2-4 weeks)  
│   ├── stories/         # Implementation tasks (2-5 days)
│   └── technical/       # Infrastructure work (varies)
├── sessions/            # Daily developer tracking
└── schemas/             # Validation rules
```

## Requirements

- [Claude Code](https://claude.ai/code) (Claude AI's official CLI)
- Git (for session tracking and multi-developer support)
- Bash (for hook system automation)
- curl (for installation)
- tar (for extracting releases)
- jq (optional, for better JSON processing)

## Documentation

- **[CARL.md](CARL.md)** - Complete system documentation
- **[docs/](docs/)** - Detailed architecture and integration guides
- **[.claude/commands/carl/](/.claude/commands/carl/)** - Command implementations

## Examples

### Planning a Feature
```bash
/carl:plan "Implement user authentication with OAuth integration"
# → Creates user-authentication.feature.carl with proper scope and breakdown
```

### Executing with Dependencies  
```bash  
/carl:task user-authentication.feature.carl
# → Automatically handles child stories in dependency order
# → Runs tests and quality gates
# → Updates progress and session tracking
```

### Project Health Check
```bash
/carl:status
# → Shows velocity, active items, blockers, and recommendations
# → Provides actionable insights for improving productivity
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Use CARL to plan and execute your changes
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Installation Issues

**Prerequisites not found:**
```bash
# macOS
brew install jq yq

# Ubuntu/Debian  
sudo apt-get install jq && sudo snap install yq

# Windows
choco install jq yq
```

**Permission denied during installation:**
```bash
# Run with explicit bash
curl -fsSL https://github.com/ClaytonHunt/carl/releases/latest/download/install.sh | sudo bash
```

**Claude Code not found:**
- Ensure [Claude Code](https://claude.ai/code) is installed and accessible
- Verify you can run `claude` command from terminal

**CARL commands not recognized:**
```bash
# Verify CARL installation
ls -la .carl/ .claude/
# Should show CARL directory structure

# Check Claude Code settings
cat .claude/settings.json
# Should show CARL hooks configuration
```

### Common Usage Issues

**Schema validation errors:**
```bash
# Check file format
cat your-file.carl | yq '.'

# Validate against schema
bash .carl/hooks/schema-validate.sh
```

**Session tracking not working:**
```bash
# Check git configuration
git config --get user.name
git config --get user.email

# Verify session file exists
ls -la .carl/sessions/
```

**Hook errors:**
- Ensure bash scripts are executable: `chmod +x .carl/hooks/*.sh`
- Check CLAUDE_PROJECT_DIR environment variable is set
- Verify all dependencies (jq, yq) are available in PATH

## Support

- **Documentation**: [CARL.md](CARL.md) and [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/ClaytonHunt/carl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ClaytonHunt/carl/discussions)

---

**Ready to transform your development workflow?** Start with `/carl:analyze` and let CARL handle the complexity while you focus on building great software.<!-- TEST CHANGE Tue Aug  5 18:40:18 EDT 2025 -->
