# CARL - Context-Aware Requirements Language

**AI-Optimized Planning System for Claude Code**

CARL bridges the gap between human cognitive simplicity and AI context precision through structured planning, execution, and tracking capabilities designed specifically for AI-assisted development.

![CARL Workflow](https://img.shields.io/badge/Workflow-AI%20Optimized-blue) ![Status](https://img.shields.io/badge/Status-Production%20Ready-green) ![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-purple)

## Quick Start

### 1. Installation

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

### 2. Initialize Your Project

```bash
# Let CARL analyze and set up your project
/carl:analyze
```

### 3. Start Planning

Create your first work item:
```bash
/carl:plan "Add user authentication system"
```

### 4. Execute Work

Start implementing:
```bash
/carl:task user-authentication.feature.carl
```

### 5. Monitor Progress

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

## Support

- **Documentation**: [CARL.md](CARL.md) and [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/carl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/carl/discussions)

---

**Ready to transform your development workflow?** Start with `/carl:analyze` and let CARL handle the complexity while you focus on building great software.