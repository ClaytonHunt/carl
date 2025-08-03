# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the CARL (Context-Aware Requirements Language) v2 system - an AI-optimized planning and execution framework for Claude Code. For complete documentation, see [CARL.md](CARL.md).

## CARL Commands

### Core Commands (Production Ready)

1. **`/carl:analyze`** - Intelligent project foundation with auto-state detection
2. **`/carl:plan [requirement]`** - Context-aware planning with auto-scope detection
3. **`/carl:task [work-item.carl]`** - Intelligent execution with dependency analysis
4. **`/carl:status`** - Project health dashboard

For detailed command documentation, see:
- [/carl:analyze](docs/workflows/analyze.md)
- [/carl:plan](docs/workflows/plan.md)
- [/carl:task](docs/workflows/task.md)
- [/carl:status](docs/workflows/status.md)

**Note**: Commands are located in `.claude/commands/carl/` to avoid namespace collisions.

### Direct File Access

CARL operates through hook scripts and agent definitions. When debugging or inspecting:

```bash
# View session history (always available)
ls .carl/sessions/

# View CARL files (when project uses CARL)
ls .carl/project/{epics,features,stories,technical}/

# View active work (when initialized)
cat .carl/project/active.work.carl
```

**Note**: This development project intentionally keeps `.carl/project/` clean - user projects will have full structure.

## High-Level Architecture

CARL uses a **dual-layer architecture**:
- **Human Layer**: Simple commands (`/carl:*`)
- **AI Layer**: Rich CARL files with comprehensive context

### Key Components

1. **[CARL Files](docs/architecture/file-structure.md)** - Single file per work item
   - `[name].epic.carl`, `[name].feature.carl`, `[name].story.carl`, `[name].tech.carl`

2. **[Session Management](docs/architecture/session-management.md)** - Daily developer tracking
   - `session-YYYY-MM-DD-{git-user}.carl` with progressive compaction

3. **[Agent System](docs/architecture/agents.md)** - Specialized AI assistants
   - Core: `carl-agent-builder`, `carl-requirements-analyst`, `carl-session-analyst`
   - Project: `project-[technology]`, `project-[framework]`, `project-[domain]`

4. **[Hook Integration](docs/integration/hooks.md)** - Minimal bash automation
   - Context injection, schema validation, progress tracking

### Critical Paths

**File Organization** - NEVER DEVIATE:
- Epics: `.carl/project/epics/[name].epic.carl`
- Features: `.carl/project/features/[name].feature.carl`
- Stories: `.carl/project/stories/[name].story.carl`
- Technical: `.carl/project/technical/[name].tech.carl`
- Completed: Move to `completed/` subdirectory

**Naming Conventions**:
- Files: `kebab-case.scope.carl`
- IDs: `snake_case_id`

## Important Context

- **Schema Validation**: All CARL files validated against `.carl/schemas/`
- **Token Budget**: Hooks inject <100 tokens, commands load targeted context
- **Multi-Developer**: Branch-based with git-aware session isolation
- **Error Handling**: Graceful degradation, schema-guided recovery
- **Quality Gates**: TDD enforcement when enabled in `process.carl`

## Claude Code Principles

- **MANDATORY** Always push back on any request that I have if it is a bad idea, contradicts community best practices, principles or patterns.

For complete documentation, architecture details, and implementation guides, see [CARL.md](CARL.md) and the [docs/](docs/) directory.