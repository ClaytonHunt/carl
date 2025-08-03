# /carl:analyze - Intelligent Project Foundation

**Purpose**: Automatically establish and maintain CARL strategic foundation with smart state detection

## Smart State Detection

The `/carl:analyze` command intelligently determines what analysis is needed:

1. **Foundation Check**: If strategic files exist (vision.carl, process.carl, roadmap.carl) → **Sync Mode**
2. **Agent Check**: If foundation missing but required agents exist → **Foundation Creation**
3. **Bootstrap**: If foundation and agents missing → **Agent Creation** (restart required)

## Execution Modes

### Sync Mode (< 2 seconds)
**Triggers**: Foundation files exist
- Quick change detection via file timestamps
- Technology stack drift detection
- Minimal updates only
- **Output**: "✅ No changes detected (0.8s)"

### Agent Creation Phase (30-60 seconds)
**Triggers**: Missing foundation AND missing project agents
- Comprehensive technology stack detection
- Batch creation of project-specific agents
- **Restart required**: New agents need to be loaded
- **Output**: "🔄 Restart Claude Code with --resume and run /carl:analyze again"

### Foundation Creation Phase (2-5 minutes)  
**Triggers**: Missing foundation AND required agents available
- Deep project analysis using specialized agents
- Strategic artifact generation: vision.carl, process.carl, roadmap.carl
- Monorepo detection and per-app configuration
- **Output**: "🚀 CARL foundation complete! Ready for /carl:plan"

## Technology Stack Detection

**Automatic identification of**:
- **Languages**: TypeScript, Python, Rust, Java, C#
- **Frameworks**: React, Vue, Angular, Django, Express, FastAPI
- **Databases**: PostgreSQL, MongoDB, Redis
- **Deployment**: Docker, Kubernetes, AWS
- **Testing**: Jest, Pytest, Playwright

## Agent Integration

**Two-Phase Pattern**:
1. **Phase 1**: Create missing project agents (project-react.md, project-typescript.md, etc.)
2. **Phase 2**: Use agents for comprehensive foundation analysis

**Resume Pattern**: When agents are created, user restarts Claude Code to load them for subsequent analysis.

## User Experience

**Zero Cognitive Load**: Single command automatically does the right thing
- Established projects: Fast sync check  
- New projects: Complete bootstrap with clear guidance
- Changed projects: Targeted updates only

**Usage**: Simply run `/carl:analyze` - no flags or decisions needed