---
allowed-tools: Task(carl-architecture-analyst), Task(carl-requirements-analyst), Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-debt-analyst), Read, Write, Glob, Grep
description: Generate comprehensive CARL planning files using adaptive scope detection
argument-hint: [requirement description] | --epic | --feature | --story | --technical
---

# CARL Planning Instructions

Generate comprehensive CARL (Context-Aware Requirements Language) planning files by:

## 1. Analyze Planning Scope
Detect scope automatically from `$ARGUMENTS`:
- **Epic keywords**: "system", "platform", "complete", "entire" → Epic-scale planning
- **Feature keywords**: "feature", "capability", "functionality" → Feature-scale planning  
- **Story keywords**: "fix", "update", "modify", "add" → Story-scale planning
- **Technical keywords**: "refactor", "improve", "optimize" → Technical initiative planning

## 2. Load CARL Context
Use existing CARL files for context:
- Read `.carl/index.carl` for project overview
- Search for related existing `.intent.carl` files
- Load `.context.carl` files for dependencies
- Check `.state.carl` files for current implementation status

## 3. Launch CARL Specialists
Based on detected scope, launch parallel analysis:

**For Epic-Scale Planning:**
- Task: carl-architecture-analyst → "Analyze system architecture and component relationships for: $ARGUMENTS"
- Task: carl-requirements-analyst → "Extract high-level business requirements and stakeholder needs for: $ARGUMENTS"
- Task: carl-backend-analyst → "Assess backend system requirements and service architecture for: $ARGUMENTS"
- Task: carl-frontend-analyst → "Analyze user experience and interface architecture for: $ARGUMENTS"

**For Feature-Scale Planning:**
- Task: carl-requirements-analyst → "Extract detailed feature requirements and business rules for: $ARGUMENTS"
- Task: carl-backend-analyst → "Analyze API and data requirements for: $ARGUMENTS"
- Task: carl-frontend-analyst → "Map user journeys and interface requirements for: $ARGUMENTS"

**For Story-Scale Planning:**
- Task: carl-requirements-analyst → "Extract specific acceptance criteria and constraints for: $ARGUMENTS"
- Task: carl-debt-analyst → "Assess technical debt impact and improvement opportunities for: $ARGUMENTS"

**For Technical Initiatives:**
- Task: carl-debt-analyst → "Comprehensive technical debt analysis and refactoring strategy for: $ARGUMENTS"
- Task: carl-architecture-analyst → "Analyze architectural improvements and system impact for: $ARGUMENTS"

## 4. Generate CARL Files Using Templates
Use `.carl/templates/intent.template.carl` to create appropriate files:

**For Epic Planning:** Create comprehensive `.intent.carl` file with:
- Epic breakdown with child features
- Architectural requirements and constraints
- Success metrics and business value
- Rollout strategy and phases

**For Feature Planning:** Create detailed `.intent.carl` file with:
- User stories with acceptance criteria
- Technical requirements (APIs, data, security)
- Performance and quality requirements
- Integration points and dependencies

**For Story Planning:** Create focused `.intent.carl` file with:
- Specific acceptance criteria
- Definition of done checklist
- Test scenarios and edge cases
- Technical approach and affected components

**For Technical Initiatives:** Create improvement `.intent.carl` file with:
- Technical debt reduction goals
- Refactoring plan with phases
- Quality improvements and metrics
- Business benefits and success criteria

## 5. Update CARL System
After generating intent files:

1. **Update Index:** Add new planning entries to `.carl/index.carl`
2. **Create State Files:** Generate corresponding `.state.carl` files using `.carl/templates/state.template.carl`
3. **Link Dependencies:** Update existing related CARL files with cross-references
4. **Session Tracking:** Record planning session in `.carl/sessions/` directory

## 6. Validation and Output
Ensure generated files:
- Follow CARL template structure exactly
- Include all required sections for detected scope
- Have valid YAML syntax and proper indentation
- Reference existing project context appropriately
- Include actionable, testable requirements

## Example Usage
- `/carl:plan "user authentication system"` → Auto-detects feature scope
- `/carl:plan --epic "complete mobile redesign"` → Forces epic scope  
- `/carl:plan --technical "refactor API layer"` → Technical initiative

Generate comprehensive, actionable CARL planning files that integrate seamlessly with existing project context while providing AI-optimized structure for implementation guidance.