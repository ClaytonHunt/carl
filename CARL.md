# CARL System Architecture & Principles

**CARL (Context-Aware Requirements Language)** - AI-Optimized Planning System for Claude Code

## Overview

CARL is a comprehensive development workflow system designed to bridge the gap between human cognitive simplicity and AI context precision. It provides structured planning, execution, and tracking capabilities through a dual-layer architecture that keeps developers productive while giving AI assistants rich context.

## Getting Started

1. **`/carl:analyze`** - Understand your project and set up strategic artifacts
2. **`/carl:plan`** - Create your first work items with proper scope  
3. **`/carl:task`** - Execute work with automatic dependency handling
4. **`/carl:task --yolo`** - Rapid prototyping without breakdown requirements
5. **`/carl:status`** - Monitor progress and get actionable insights

## Core Commands

CARL operates through core commands:

1. **`/carl:analyze`** - Establish project foundation with automatic state detection and interactive planning
2. **`/carl:plan`** - Create work items with intelligent scope detection
3. **`/carl:task`** - Execute work with full context and dependency analysis
4. **`/carl:task --yolo`** - Rapid prototyping mode for exploration and MVPs
5. **`/carl:status`** - Monitor progress and project health

## Key Features

- **Single-File System**: Each work item has one comprehensive file containing requirements, progress, and relationships
- **Hierarchical Organization**: Epics (3-6mo) → Features (2-4wk) → Stories (2-5d) → Technical (varies)
- **Session Continuity**: Daily developer tracking with progressive compaction for historical analysis
- **Dynamic Agent Creation**: Automatically generates specialist agents when domain gaps detected
- **Dependency Management**: Intelligent parallel execution with topological sorting
- **Multi-Developer Support**: Branch-based isolation with git-aware session tracking
- **Schema Validation**: Automatic validation ensures CARL file consistency
- **Hook Integration**: Minimal bash scripts for context injection and automation
- **Yolo Mode**: Rapid prototyping with intelligent gap-filling and technical debt tracking

## How CARL Works

CARL operates through a **dual-layer architecture** that keeps developers focused while providing AI assistants with rich context:

### Human Layer (Simple)
- **Four Commands**: `/carl:analyze`, `/carl:plan`, `/carl:task`, `/carl:status`
- **No Complex Decisions**: Commands automatically determine what action is needed
- **Zero Maintenance**: Hooks handle schema validation and progress tracking automatically

### AI Layer (Rich Context)
- **CARL Files**: Single file per work item with comprehensive requirements and progress
- **Session Tracking**: Daily activity logs for trend analysis and health monitoring  
- **Specialized Agents**: Domain-specific assistants created automatically as needed
- **Schema Validation**: Automatic data integrity with self-healing capabilities

### Workflow Integration
CARL integrates seamlessly with existing development workflows:
- **Git Integration**: Branch-aware session tracking and multi-developer coordination
- **Claude Code Hooks**: Automatic progress tracking and completion handling
- **Schema Compliance**: All files validated against defined schemas with auto-fixing
- **Quality Gates**: TDD enforcement and testing integration when configured

## Yolo Mode - Rapid Prototyping

CARL's yolo mode enables rapid prototyping and exploration by allowing direct execution of epics and features without requiring complete breakdown.

### How Yolo Works

```bash
# Full yolo - implement entire epic without breakdown
/carl:task user-auth.epic.carl --yolo

# Hybrid yolo - execute existing stories, yolo missing parts
/carl:task payment.feature.carl --yolo
```

### Smart Gap Analysis

Yolo mode intelligently analyzes existing breakdown and fills gaps:

- **Existing Features/Stories**: Execute normally with full quality gates
- **Missing Breakdown**: Implement directly with relaxed standards
- **Coverage Reporting**: Clear percentage of structured vs yolo execution
- **User Confirmation**: Explicit approval required before proceeding

### Technical Debt Management

Yolo automatically creates technical debt items for later cleanup:

```yaml
# Auto-created: payment-yolo-debt.tech.carl
title: "Formalize Payment Feature Breakdown"
description: "Payment feature was implemented via yolo mode. Needs proper story breakdown."
yolo_metadata:
  parent_item: "payment.feature.carl"
  yolo_date: "2024-01-15T10:00:00Z"
  execution_mode: "yolo"
  gap_type: "missing-breakdown"
```

### When to Use Yolo

**✅ Good for:**
- Rapid prototyping and exploration
- Solo development and hackathons
- Time-boxed proof of concepts
- Learning unfamiliar problem spaces

**❌ Avoid for:**
- Team development (needs coordination)
- Production systems (needs structure)
- Complex integrations (high risk)
- Security-critical features

### Session Tracking

Yolo executions are fully tracked in session files:

```yaml
commands:
  - command: "task"
    arguments: "user-auth.epic.carl --yolo"
    execution_details:
      mode: "hybrid-yolo"
      coverage:
        structured: "33%"
        yolo: "67%"
      debt_created: ["registration-yolo-debt.tech.carl"]
```

## Detailed Documentation

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

---

## Next Steps

Ready to start using CARL? Begin with `/carl:analyze` to establish your project foundation, then use `/carl:plan` to create your first work items. The system handles complexity automatically while keeping your workflow simple and focused.