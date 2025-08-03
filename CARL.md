# CARL System Architecture & Principles

**CARL (Context-Aware Requirements Language)** - AI-Optimized Planning System for Claude Code

## Overview

CARL is a comprehensive development workflow system designed to bridge the gap between human cognitive simplicity and AI context precision. It provides structured planning, execution, and tracking capabilities through a dual-layer architecture that keeps developers productive while giving AI assistants rich context.

## Quick Links

### Core Documentation
- [Core Philosophy](docs/core/philosophy.md) - Fundamental principles and design philosophy
- [File Structure](docs/architecture/file-structure.md) - Directory organization and naming conventions
- [Schema Definitions](docs/architecture/schemas.md) - CARL file schemas and validation rules

### Workflows & Commands
- [/carl:analyze](docs/workflows/analyze.md) - Project understanding & foundation setup
- [/carl:plan](docs/workflows/plan.md) - Intelligent planning and scope detection
- [/carl:task](docs/workflows/task.md) - Context-aware execution with dependency management
- [/carl:status](docs/workflows/status.md) - Project health dashboard and reporting
- [Dependency Analysis](docs/workflows/dependency-analysis.md) - Algorithms for parallel execution

### Architecture
- [Session Management](docs/architecture/session-management.md) - Daily developer tracking and compaction
- [Agent Architecture](docs/architecture/agents.md) - Core agents and interaction patterns
- [Multi-Developer Coordination](docs/architecture/multi-developer.md) - Branch-based development model

### Integration & Implementation
- [Claude Code Hooks](docs/integration/hooks.md) - Hook system architecture and principles
- [Hook Implementations](docs/integration/hook-implementations.md) - Detailed hook code examples
- [Context Injection](docs/integration/context-injection.md) - Token budget and loading strategies
- [Error Handling](docs/integration/error-handling.md) - Validation, recovery, and monitoring
- [Quality Standards](docs/integration/quality-standards.md) - Completion criteria and gates
- [MCP Integration](docs/integration/mcp.md) - Model Context Protocol enhancements

### Guides & Reference
- [Audio System (Future)](docs/guides/audio-system.md) - Planned character-based audio features
- [Changelog](docs/reference/changelog.md) - Architecture updates and version history

## Core Commands

CARL operates through four primary commands:

1. **`/carl:analyze`** - Establish project foundation and strategic context
2. **`/carl:plan`** - Create work items with intelligent scope detection
3. **`/carl:task`** - Execute work with full context and dependency analysis
4. **`/carl:status`** - Monitor progress and project health

## Key Features

- **Single-File System**: Each work item has one comprehensive file containing requirements, progress, and relationships
- **Hierarchical Organization**: Epics (3-6mo) → Features (2-4wk) → Stories (2-5d) → Technical (varies)
- **Session Continuity**: Daily developer tracking with progressive compaction for historical analysis
- **Dynamic Agent Creation**: Automatically generates specialist agents when domain gaps detected
- **Dependency Management**: Intelligent parallel execution with topological sorting
- **Multi-Developer Support**: Branch-based isolation with git-aware session tracking
- **Schema Validation**: Automatic validation ensures CARL file consistency
- **Hook Integration**: Minimal bash scripts for context injection and automation

## Getting Started

1. Run `/carl:analyze` to understand your project and set up strategic artifacts
2. Use `/carl:plan` to create your first work items with proper scope
3. Execute work with `/carl:task`, which handles dependencies automatically
4. Monitor progress with `/carl:status` for insights and metrics

## Implementation Status

- ✅ **Core Architecture**: Complete documentation and design
- ✅ **Agent System**: `carl-agent-builder` and `carl-requirements-analyst` implemented and production-ready
- ✅ **Hook System**: Fully operational with schema validation, completion handling, and progress tracking
- ✅ **Session Management**: Active daily session tracking with progressive compaction
- ✅ **CARL Planning**: `/carl:plan` command implemented with single-turn agent integration
- 🔌 **MCP Integration**: Framework established for external tool integration

### Production Components
- ✅ **`/carl:plan` Command**: Interactive requirements gathering with intelligent scope detection
- ✅ **`/carl:task` Command**: Intelligent work execution with dependency analysis and parallel processing
- ✅ **`/carl:status` Command**: AI-powered project health dashboard with session analysis
- ✅ **carl-requirements-analyst Agent**: Single-turn analysis generating schema-compliant CARL files
- ✅ **carl-session-analyst Agent**: Session data analysis specialist for progress monitoring
- ✅ **Schema Validation Hook**: Auto-fixing validation with proper CLAUDE_PROJECT_DIR usage
- ✅ **Complete Hook Suite**: SessionStart, Stop, PostToolUse array, and Notification hooks operational

### Ready for Development
- 📋 **`/carl:analyze` Command**: Project analysis and setup (requires additional agents)

---

**Current Status**: CARL Core System is **production-ready** with complete planning, execution, and monitoring capabilities. Users can plan with `/carl:plan [requirement]`, execute with `/carl:task [work-item]`, and monitor progress with `/carl:status` - all with full schema compliance and intelligent automation.