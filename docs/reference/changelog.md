# Changelog

## 2025-08-01 - Architecture Updates

1. **Removed `/carl:settings` command** - Simplified to four core commands for clarity
2. **Consolidated to Single-File System** - Combined all work item information into single scope-specific files:
   - `[name].intent.carl` + `[name].state.carl` + `[name].context.carl` → `[name].epic.carl`, `[name].feature.carl`, `[name].story.carl`, `[name].tech.carl`
   - Each file contains: requirements, progress, and relationship context
   - Benefits: Atomic operations, simplest mental model (1 work item = 1 file), single read for complete picture, easier maintenance
3. **Updated naming conventions** - Scope-specific extensions provide instant recognition and maintain template connections
4. **Updated file path rules** - Reflects new single-file structure while maintaining directory organization
5. **Eliminated context file complexity** - No separate context files to maintain or keep synchronized
6. **Enhanced Session Management** - Daily session files per developer with automatic cleanup:
   - Format: `session-YYYY-MM-DD-{git-user}.carl` - prevents file explosion
   - Git user identification for multi-developer teams
   - Configurable retention periods (30 days, 90 days, 1 year)
   - Built-in review capabilities (daily standups, quarterly reviews, yearly retrospectives)
   - Individual cleanup responsibility - each developer manages their own sessions
7. **Refined `/carl:analyze` Purpose** - Focused on strategic foundation rather than feature discovery:
   - Primary role: Technology stack analysis, architecture pattern recognition, strategic artifact generation
   - Interactive validation with developer for assumptions and refinements
   - Specialized agent creation based on detected technology stack (e.g., C# API → project-csharp, project-api)
   - No longer responsible for feature/story/epic discovery (that belongs in `/carl:plan`)
   - Sync mode detects changes affecting strategic artifacts or agent requirements
8. **Dynamic Agent Creation in `/carl:plan`** - Intelligent, on-demand specialist creation:
   - Agent gap detection automatically identifies missing domain expertise during planning
   - Immediate agent creation and usage (no Claude Code restart required)
   - Contextual agent lifecycle management based on planning outcomes
   - Permanent agents for core application technologies, temporary agents for research/evaluation
   - Auto-discovery mechanism allows new agents to immediately access project context through strategic artifacts
9. **Enhanced Workflow Integration**: `/carl:task` auto-invokes `/carl:plan` for breakdown, parallel execution of independent stories
10. **Intelligent Execution Management**: Smart scope handling, dependency analysis, mixed-mode epic/feature orchestration
11. **Project Agent Naming Convention** - Established `project-` prefix for generated agents:
   - Core CARL agents: `carl-agent-builder`, `carl-requirements-analyst`, `carl-session-analyst`
   - Project agents: `project-[technology]`, `project-[domain]`, `project-[custom]`
   - Clear separation between system agents and project-specific agents