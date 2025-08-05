---
description: Intelligent project foundation analysis with auto-state detection
argument-hint: [auto-detects analysis phase needed - may require restart after agent creation]
allowed-tools: Task, Read, Write, Glob, Grep, LS
---

# CARL Analyze Command

You are implementing intelligent project foundation analysis with automatic state detection and phased execution.

## Current Context
- **Project Structure**: `.carl/project/` directory structure
- **Agent Directory**: `.claude/agents/` for project-specific agents
- **Arguments**: $ARGUMENTS

## Smart State Detection

### Primary Decision Tree
Execute checks in this exact order for optimal performance:

1. **Foundation State Check (Always First - <100ms)**:
   - Read `.carl/project/vision.carl` (exists?)
   - Read `.carl/project/process.carl` (exists?)  
   - Read `.carl/project/roadmap.carl` (exists?)
   - If **all exist** → Execute **Sync Mode** (skip all other checks)
   - If **any missing** → Continue to Agent Check

2. **Agent Availability Check (Only if foundation missing)**:
   - Use Glob to detect technology stack (package.json, requirements.txt, etc.)
   - If **no technology detected**:
     - Read existing files (CLAUDE.md, README.md, docs) for project hints
     - Execute **Interactive Planning Mode** to gather requirements
   - If **technology detected**:
     - Map detected technologies to required project agents
     - Check if required agents exist in `.claude/agents/project-*.md`
     - If **all agents exist** → Execute **Foundation Creation Phase**
     - If **missing agents** → Execute **Agent Creation Phase**

## Execution Modes

### Sync Mode (Foundation Exists)
**Triggers**: All foundation files present
**Duration**: < 2 seconds
**Purpose**: Quick update check for established projects

**Process**:
1. **Change Detection**: Compare file timestamps (package.json vs process.carl)
2. **Dependency Check**: Scan for new technologies or removed dependencies
3. **Agent Inventory**: Verify project agents still match current stack
4. **Minimal Updates**: Only update what changed
5. **Fast Feedback**: Report status and any updates made

**Output Example**:
```
⚡ Foundation exists - running sync check...
✅ No changes detected (0.8s)
💡 Ready for planning with /carl:plan
```

### Agent Creation Phase (Missing Project Agents)
**Triggers**: Foundation missing AND required agents missing
**Duration**: 30-60 seconds
**Purpose**: Create project-specific agents, then prompt restart

**Process**:
1. **Technology Stack Detection**:
   - Use Glob to find: `**/{package.json,requirements.txt,Cargo.toml,pom.xml,*.csproj}`
   - Use Grep to identify frameworks and libraries
   - Build comprehensive technology profile

2. **Agent Gap Analysis**:
   - Map detected technologies to required agent types
   - Check existing agents: `ls .claude/agents/project-*.md`
   - Identify missing agents needed for comprehensive analysis

3. **Batch Agent Creation**:
   - For each missing agent, use Task tool with carl-agent-builder
   - Create agents for: languages, frameworks, databases, deployment tools
   - Validate agent creation success

4. **Restart Prompt**:
   - Provide clear instructions for `claude --resume`
   - Explain that new agents need to be loaded
   - **Stop execution** - don't proceed to foundation analysis

**Output Example**:
```
🔍 No foundation detected - analyzing technology stack...
📊 Detected: Node.js + React + TypeScript + Docker + PostgreSQL

🤖 Creating missing project agents:
✅ project-react.md (React patterns and best practices)
✅ project-typescript.md (TypeScript utilities and patterns)
✅ project-docker.md (Container and deployment patterns)
✅ project-postgresql.md (Database schema and query patterns)

🔄 **Next Step**: Restart Claude Code with --resume and run /carl:analyze again
   This allows the new agents to be loaded for comprehensive project analysis.
```

### Foundation Creation Phase (Agents Available)
**Triggers**: Foundation missing AND all required agents exist
**Duration**: 2-5 minutes
**Purpose**: Create strategic CARL artifacts using specialized agents

**Process**:
1. **Agent Availability Verification**:
   - Confirm all required project agents are loaded and accessible
   - Test agent functionality with sample queries

2. **Comprehensive Project Analysis**:
   - Use Task tool with project-specific agents for deep analysis
   - Analyze architecture patterns, development workflows, testing strategies
   - Identify monorepo structure and multi-app configurations

3. **Strategic Artifact Generation**:
   - **carl-settings.json**: User-specific CARL configuration (generated from schema defaults)
   - **.carl/project/vision.carl**: Project purpose, goals, success criteria
   - **.carl/project/process.carl**: TDD settings, test commands, quality gates
   - **.carl/project/roadmap.carl**: High-level development phases and milestones
   - Create files using Write tool with proper CARL schema compliance

4. **Foundation Validation**:
   - Verify all created files are schema-compliant
   - Test that foundation supports planning and execution workflows

**Output Example**:
```
🔍 Foundation analysis with specialized agents...
📋 Using project-react agent for component architecture analysis
📋 Using project-typescript agent for type system review  
📋 Using project-docker agent for deployment configuration

📄 Generated strategic foundation:
✅ vision.carl - Project goals and success metrics defined
✅ process.carl - TDD enabled, npm test configured
✅ roadmap.carl - 3 development phases identified

🚀 CARL foundation complete! Ready for /carl:plan to start work planning.
```

### Interactive Planning Mode (No Technology Stack)
**Triggers**: Foundation missing AND no technology stack detected
**Duration**: 3-5 minutes
**Purpose**: Gather project requirements through user interview

**Process**:
1. **Existing File Analysis**:
   - Read CLAUDE.md for project description and goals
   - Read README.md for additional context
   - Scan any docs/ directory for specifications
   - Extract hints about intended technology, features, and scope

2. **Interactive Requirements Gathering**:
   ```
   🔍 No technology stack detected. Let's plan your project foundation.
   
   📄 From CLAUDE.md, I understand this is: [extracted summary]
   
   Let me ask a few questions to create your project foundation:
   ```
   
   **Essential Questions**:
   - "What technology stack are you planning to use? (e.g., Node.js/Express, Python/Django, etc.)"
   - "What type of application is this? (API, web app, CLI tool, library, etc.)"
   - "Who are the primary users or consumers of this application?"
   - "What are the main features or capabilities you want to build?"
   - "Do you have any specific timeline or milestone goals?"
   - "Are there any technical constraints or requirements? (database, deployment, etc.)"

3. **Foundation Generation Strategy**:
   - Based on answers, determine which project agents need creation
   - Generate foundation files using Write tool with strict schema compliance:
     * **vision.carl**: Must validate against `.carl/schemas/vision.schema.yaml`
     * **roadmap.carl**: Must validate against `.carl/schemas/roadmap.schema.yaml`
     * **process.carl**: Must validate against `.carl/schemas/process.schema.yaml`
   - All files must be valid YAML following their respective schemas
   - Schema validation will run automatically via hooks
   - Provide guidance on next steps

4. **Graceful Fallback**:
   - If user is unsure about technology, suggest common stacks
   - Create generic foundation that can be refined later
   - Emphasize that everything can be updated as project evolves

**Output Example**:
```
🔍 No technology stack detected. Let's plan your project foundation.

📄 From CLAUDE.md, I understand this is: A task management API with user auth, 
   categorization, and search capabilities.

Let me ask a few questions to create your project foundation:

Q: What technology stack are you planning to use?
A: Node.js with TypeScript and Express

Q: What type of application is this?
A: RESTful API with PostgreSQL database

[... additional Q&A ...]

📊 Based on your requirements, I'll create:
- Vision: API-first task management platform
- Roadmap: 3 phases - MVP, User Features, Advanced Features  
- Process: TDD with Jest, 85% coverage target

📄 Generating schema-compliant CARL foundation files:
✅ .carl/project/vision.carl (YAML format with vision_statement, strategic_goals, success_metrics)
✅ .carl/project/roadmap.carl (YAML format with milestones, epics, timeline)
✅ .carl/project/process.carl (YAML format with methodology, test commands, quality requirements)

🤖 Creating required project agents:
✅ project-nodejs.md
✅ project-typescript.md  
✅ project-express.md
✅ project-postgresql.md

🔄 Please restart with --resume to load new agents and complete foundation setup.
```

## Technology Stack Detection

### File Pattern Recognition
Use Glob tool to identify technology indicators:
```
**/{package.json,yarn.lock,pnpm-lock.yaml}     # Node.js ecosystem
**/{requirements.txt,setup.py,pyproject.toml}   # Python ecosystem  
**/{Cargo.toml,Cargo.lock}                      # Rust ecosystem
**/{pom.xml,build.gradle,*.csproj}              # JVM/.NET ecosystems
**/{Dockerfile,docker-compose.yml}              # Container deployment
**/{*.tf,*.tfvars}                              # Infrastructure as code
```

### Framework Detection
Use Grep tool to identify specific frameworks:
```
# JavaScript/TypeScript frameworks
"react": React applications
"vue": Vue.js applications  
"@angular/core": Angular applications
"next": Next.js applications
"express": Express.js backends

# Python frameworks
"django": Django applications
"flask": Flask applications
"fastapi": FastAPI applications

# Database indicators  
"prisma": Prisma ORM
"typeorm": TypeORM
"mongoose": MongoDB
"pg": PostgreSQL
```

### Agent Type Mapping
Map detected technologies to required project agents:
- **Languages**: project-typescript, project-python, project-rust
- **Frontend**: project-react, project-vue, project-angular
- **Backend**: project-express, project-django, project-fastapi
- **Database**: project-postgresql, project-mongodb, project-redis
- **Deployment**: project-docker, project-kubernetes, project-aws
- **Testing**: project-jest, project-pytest, project-playwright

## Error Handling

### Missing Foundation Files
- Gracefully handle partial foundation (some files exist, others missing)
- Regenerate missing files without overwriting existing ones
- Validate existing files are schema-compliant

### Agent Creation Failures
- Report specific agent creation failures with actionable error messages
- Continue with available agents if some creation fails
- Provide fallback analysis using core CARL agents

### Technology Detection Issues
- Handle edge cases like monorepos with multiple technology stacks
- Provide manual override capabilities for misdetected technologies
- Fall back to Interactive Planning Mode for empty projects
- Use existing documentation files to infer project intent

### Interactive Mode Considerations
- Keep questions concise and focused on essential information
- Provide sensible defaults and examples for each question
- Allow users to skip questions with reasonable fallbacks
- Save all gathered information for future reference

## Integration Points

### Hook System Integration
- Leverage existing schema validation hooks
- Use progress tracking for long-running analysis
- Integrate with session management for analysis history

### Agent Coordination
- **carl-agent-builder**: Create missing project-specific agents
- **Project agents**: Use for specialized analysis once available
- **carl-requirements-analyst**: Coordinate with for subsequent planning

### Command Integration
Provide actionable next steps:
- **Ready for Planning**: `/carl:plan [requirement]` when foundation complete
- **Missing Agents**: Restart instructions when agents created
- **Updates Available**: Specific recommendations for detected changes

## Quality Standards

### Analysis Accuracy
- ✅ Comprehensive technology stack detection
- ✅ Accurate agent requirement mapping
- ✅ Schema-compliant artifact generation
- ✅ Cross-validation of detected patterns

### Performance Requirements
- ✅ Sync mode completes within 2 seconds
- ✅ Agent creation completes within 60 seconds
- ✅ Foundation creation completes within 5 minutes
- ✅ Efficient file system scanning with appropriate tool usage

### User Experience
- ✅ Clear mode indication and progress feedback
- ✅ Actionable next steps for each execution phase
- ✅ Graceful error handling with recovery guidance
- ✅ Consistent output formatting across all modes

## Usage Examples

```bash
# Auto-detects what's needed - no decisions required
/carl:analyze

# Possible outcomes:
# 1. Sync Mode: "✅ No changes detected (0.8s)"
# 2. Agent Creation: "🔄 Restart required after agent creation"  
# 3. Foundation Creation: "🚀 Foundation complete!"
```

## Error Prevention

- ❌ Never proceed to foundation creation without required agents
- ❌ Never overwrite existing foundation files without validation
- ❌ Never create agents that already exist
- ❌ Never skip technology stack detection
- ✅ Always check foundation state first
- ✅ Always validate agent availability before deep analysis
- ✅ Always provide clear restart instructions when needed
- ✅ Always optimize for the common case (established projects)

Remember: Smart state detection eliminates cognitive load. The command should always do the right thing automatically, with users never having to decide which type of analysis to run.