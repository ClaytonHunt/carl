---
description: Intelligent project foundation analysis with auto-state detection
argument-hint: [auto-detects analysis phase needed - may require restart after agent creation]
allowed-tools: Task, Read, Write, Glob, Grep, LS
---

# CARL Analyze Command

You are implementing intelligent project foundation analysis with automatic state detection and checklist-driven execution.

## Execution Checklist

- [ ] **Load Shared Validation Framework**
  - [ ] Source foundation validation: `source .carl/commands/lib/foundation-validation.sh`
  - [ ] Source error handling: `source .carl/commands/lib/error-handling.sh`
  - [ ] Source progress tracking: `source .carl/commands/lib/progress-tracking.sh`

- [ ] **Validate Prerequisites**
  - [ ] Validate CARL foundation structure exists
  - [ ] Validate git repository state
  - [ ] Handle validation failures with standardized error messages

- [ ] **Execute Smart State Detection**
  - [ ] Perform foundation state check (always first)
  - [ ] Route to appropriate execution mode based on state
  - [ ] Use commandlib references for mode-specific processing

- [ ] **Process Selected Mode**
  - [ ] Sync Mode: `.carl/commands/analyze/sync.md`
  - [ ] Agent Creation Mode: `.carl/commands/analyze/agent-creation.md`
  - [ ] Foundation Creation Mode: `.carl/commands/analyze/foundation-creation.md`
  - [ ] Interactive Planning Mode: `.carl/commands/analyze/interactive.md`

- [ ] **Complete Analysis**
  - [ ] Update session tracking with analysis results
  - [ ] Provide clear next step guidance
  - [ ] Report execution time and performance metrics

## State Detection Process

### Foundation State Check (Always First)
- [ ] Check for foundation files in priority order:
  - [ ] Read `.carl/project/vision.carl` → exists? ✅/❌
  - [ ] Read `.carl/project/process.carl` → exists? ✅/❌
  - [ ] Read `.carl/project/roadmap.carl` → exists? ✅/❌
- [ ] **Decision**: If ALL exist → Route to **Sync Mode**
- [ ] **Decision**: If ANY missing → Continue to Agent Check

### Agent Availability Check (Only if Foundation Missing)
- [ ] Perform technology stack detection:
  - [ ] Use Glob to detect technology indicators
  - [ ] Scan for framework and library usage patterns
- [ ] **Decision Path A**: No technology detected
  - [ ] Read existing documentation (CLAUDE.md, README.md)
  - [ ] Route to **Interactive Planning Mode**
- [ ] **Decision Path B**: Technology detected
  - [ ] Map detected technologies to required project agents
  - [ ] Check if agents exist in `.claude/agents/project-*.md`
  - [ ] **Decision**: All agents exist → Route to **Foundation Creation Mode**
  - [ ] **Decision**: Missing agents → Route to **Agent Creation Mode**

## Execution Mode References

### Mode-Specific Processing
Each execution mode follows detailed checklists in commandlib:

#### Sync Mode (Foundation Exists)
**Reference**: `.carl/commands/analyze/sync.md`
- Quick update check for established projects
- Target: <2 seconds execution time
- Minimal changes, maximum efficiency
- Reports specific changes made

#### Agent Creation Mode (Missing Project Agents)  
**Reference**: `.carl/commands/analyze/agent-creation.md`
- Technology stack detection and analysis
- Batch creation of missing project agents
- Restart requirement after agent creation
- No foundation creation in this mode

#### Foundation Creation Mode (Agents Available)
**Reference**: `.carl/commands/analyze/foundation-creation.md`
- Comprehensive analysis using specialized agents
- Strategic CARL artifact generation
- Schema-compliant foundation files
- Full workflow integration testing

#### Interactive Planning Mode (No Technology Stack)
**Reference**: `.carl/commands/analyze/interactive.md`
- Guided requirements gathering interview
- Technology stack decision support
- Foundation generation from user input
- Agent creation based on choices

## Technology Stack Detection

Technology detection is handled by mode-specific commandlib files:
- **Agent Creation Mode**: Comprehensive stack detection and agent mapping
- **Foundation Creation Mode**: Validation of existing agent coverage
- **Sync Mode**: Change detection and new technology identification

See individual mode references for detailed detection patterns and processes.

## Error Handling

Error handling uses the shared validation framework:
- **Foundation Validation**: `.carl/commands/shared/foundation-validation.md`
- **Standardized Errors**: `.carl/commands/shared/error-handling.md`
- **Recovery Operations**: `.carl/commands/shared/rollback-operations.md`

### Common Error Scenarios
- **Missing Foundation**: Auto-detect and route to appropriate creation mode
- **Agent Failures**: Graceful degradation with fallback options
- **Technology Detection**: Manual override and interactive fallback
- **Schema Violations**: Automatic validation and correction guidance

All errors use standardized formats and provide actionable recovery steps.

## Integration Points

### Framework Integration
- **Progress Tracking**: Session-based execution monitoring
- **Validation Hooks**: Automatic schema compliance checking
- **Agent Coordination**: carl-agent-builder for missing project agents
- **Error Handling**: Standardized error reporting and recovery

### Command Workflow
- **Foundation Ready** → `/carl:plan [requirement]`
- **Agents Created** → Restart required: `claude --resume`
- **Sync Complete** → Ready for planning or task execution

## Quality Standards

All quality standards are enforced through checklist validation:
- ✅ **Performance Targets**: Sync <2s, Agent Creation <60s, Foundation <5min
- ✅ **Accuracy Requirements**: Schema compliance, technology detection
- ✅ **User Experience**: Clear feedback, actionable next steps
- ✅ **Error Prevention**: Validation gates, standardized recovery

## Usage Examples

```bash
# Auto-detects what's needed - smart execution
/carl:analyze

# Mode is automatically selected based on project state:
# • Sync Mode: Quick update check for established projects
# • Agent Creation: Creates missing agents, requires restart
# • Foundation Creation: Full foundation setup with agents
# • Interactive Planning: Guided setup for new projects
```

## Execution Standards

### Validation Requirements
- [ ] **MANDATORY**: Use shared validation framework for all prerequisite checks
- [ ] **MANDATORY**: Route to appropriate mode based on checklist detection
- [ ] **MANDATORY**: Use commandlib references for mode-specific processing
- [ ] **MANDATORY**: Provide standardized error messages and recovery guidance
- [ ] **MANDATORY**: Update session tracking with execution results

### Success Criteria
- ✅ Smart routing eliminates user decision-making
- ✅ Checklist execution ensures consistency
- ✅ Standardized validation prevents common failures
- ✅ Clear next steps guide workflow progression

Remember: The analyze command should automatically do the right thing based on project state. Users never need to choose execution modes - the checklist-driven detection handles routing intelligently.