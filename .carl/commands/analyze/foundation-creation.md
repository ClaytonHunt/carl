# Analyze Command - Foundation Creation Mode

Creates strategic CARL foundation artifacts using specialized project agents.

## Prerequisites Check

- [ ] Foundation files missing (vision.carl, process.carl, roadmap.carl)
- [ ] All required project agents exist and are loaded
- [ ] Technology stack is fully analyzed

## Foundation Creation Process Checklist

### Agent Availability Verification
- [ ] Confirm all required project agents are accessible
- [ ] Test agent functionality with sample technology queries
- [ ] Verify agents cover complete technology stack
- [ ] Load agent capabilities and specializations

### Comprehensive Project Analysis
- [ ] Use Task tool with project-specific agents for deep analysis:
  - [ ] **Architecture Analysis**: Component structure, service boundaries
  - [ ] **Development Workflow**: Build processes, dependency management
  - [ ] **Testing Strategy**: Test frameworks, coverage requirements
  - [ ] **Quality Standards**: Linting, formatting, code quality tools
  - [ ] **Deployment Pipeline**: Container setup, CI/CD patterns

### Technology-Specific Deep Dive
- [ ] **Frontend Projects**: Component patterns, state management, routing
- [ ] **Backend Projects**: API design, database integration, authentication
- [ ] **Full-Stack Projects**: Communication patterns, shared types
- [ ] **Microservices**: Service boundaries, communication protocols
- [ ] **Monorepo Projects**: Workspace organization, shared libraries

### Strategic Artifact Generation

#### 1. CARL Settings Configuration
- [ ] Generate `.carl/carl-settings.json` from schema defaults
- [ ] Customize settings based on detected technology stack
- [ ] Configure agent preferences and tool selections
- [ ] Set project-specific quality gates and preferences

#### 2. Project Vision Document
- [ ] Create `.carl/project/vision.carl` with:
  - [ ] **Vision Statement**: Clear project purpose and goals
  - [ ] **Strategic Goals**: Measurable business/technical objectives  
  - [ ] **Success Metrics**: KPIs and definition of done
  - [ ] **Target Audience**: User personas or API consumers
  - [ ] **Core Values**: Technical principles and constraints

#### 3. Development Process Configuration
- [ ] Create `.carl/project/process.carl` with:
  - [ ] **TDD Settings**: Enable/disable, test-first requirements
  - [ ] **Test Commands**: Framework-specific test execution
  - [ ] **Quality Gates**: Coverage thresholds, linting rules
  - [ ] **Build Process**: Compilation, bundling, optimization
  - [ ] **Deployment Config**: Environment setup, release process

#### 4. Project Roadmap Planning
- [ ] Create `.carl/project/roadmap.carl` with:
  - [ ] **Development Phases**: MVP, enhancement, scaling phases
  - [ ] **Epic-Level Planning**: Major feature groupings
  - [ ] **Milestone Targets**: Time-based delivery goals
  - [ ] **Dependency Mapping**: External integrations and blockers
  - [ ] **Resource Allocation**: Team size and skill requirements

### Foundation Validation
- [ ] Validate all created files against CARL schemas:
  - [ ] `vision.carl` → `.carl/schemas/vision.schema.yaml`
  - [ ] `process.carl` → `.carl/schemas/process.schema.yaml`
  - [ ] `roadmap.carl` → `.carl/schemas/roadmap.schema.yaml`
- [ ] Test foundation supports planning workflows
- [ ] Verify schema compliance with automatic validation
- [ ] Confirm all required fields are populated

### Integration Testing
- [ ] Test foundation with `/carl:plan` command simulation
- [ ] Verify agent coordination works correctly
- [ ] Confirm session tracking integration
- [ ] Validate hook system compatibility

## Success Criteria

✅ **Complete Foundation**: All strategic documents created  
✅ **Schema Compliance**: All files validate successfully  
✅ **Agent Integration**: Project agents properly utilized  
✅ **Workflow Ready**: Foundation supports full CARL workflow

## Output Format

```
🔍 Foundation analysis with specialized agents...

📋 Deep Analysis Phase:
✅ project-react agent: Component architecture patterns identified
✅ project-typescript agent: Type system and build configuration analyzed  
✅ project-express agent: API design patterns and middleware structure reviewed
✅ project-postgresql agent: Database schema and migration strategy planned

📄 Generating strategic foundation:
✅ carl-settings.json → Project-specific agent and tool preferences
✅ vision.carl → Project goals and success metrics defined
✅ process.carl → TDD enabled, npm test configured, 85% coverage target
✅ roadmap.carl → 3 development phases with 8 epic-level features identified

🔍 Validation Results:
✅ All files schema-compliant
✅ Foundation workflow integration tested
✅ Agent coordination verified

🚀 CARL foundation complete! Ready for /carl:plan to start work planning.

💡 Recommended next steps:
   • Review generated foundation files for accuracy
   • Run /carl:plan [feature-description] to create first work items
   • Use /carl:status for project health monitoring
```

## Agent Utilization Patterns

### Frontend-Focused Projects
```yaml
agent_usage:
  primary: project-react, project-typescript
  secondary: project-jest, project-webpack
  focus_areas: [component_patterns, state_management, build_optimization]
```

### Backend-Focused Projects  
```yaml
agent_usage:
  primary: project-express, project-postgresql
  secondary: project-jest, project-docker
  focus_areas: [api_design, database_schema, deployment_strategy]
```

### Full-Stack Projects
```yaml
agent_usage:
  primary: [project-react, project-express, project-typescript]
  secondary: [project-postgresql, project-docker]
  focus_areas: [type_sharing, api_contracts, end_to_end_workflows]
```

## Quality Assurance Checklist

### Content Quality
- [ ] Vision statement is clear and actionable
- [ ] Process configuration matches detected technology stack
- [ ] Roadmap phases are realistic and well-scoped
- [ ] Success metrics are measurable and relevant

### Technical Accuracy
- [ ] Test commands work with detected frameworks
- [ ] Build processes align with project structure
- [ ] Deployment configuration matches infrastructure
- [ ] Quality gates are appropriate for technology stack

### Schema Compliance
- [ ] All YAML files have valid syntax
- [ ] Required fields are populated with appropriate values
- [ ] Field types match schema specifications
- [ ] Nested structures follow schema patterns

## Error Handling

### Agent Unavailability
- [ ] If required agents missing → Fall back to Agent Creation Mode
- [ ] If agents fail to respond → Use generic analysis with warnings
- [ ] If agent responses are poor → Supplement with file-based analysis

### Foundation Generation Failures
- [ ] If file creation fails → Report specific errors and retry
- [ ] If schema validation fails → Fix violations and re-validate
- [ ] If integration tests fail → Provide manual configuration guidance

### Recovery Strategies
- [ ] Partial foundation creation (create what's possible)
- [ ] Manual foundation file templates with guidance
- [ ] Fallback to interactive mode for missing information
- [ ] Progressive enhancement (start minimal, expand later)