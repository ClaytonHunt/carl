---
description: Intelligent CARL work item planning with scope detection
argument-hint: [requirement description] or --from [work-item.carl]
allowed-tools: Task, Read, Write, Glob, Grep, LS, MultiEdit
---

# CARL Planning Command

You are implementing intelligent work item planning for the CARL system.

## Current Context
- **Project Structure**: `.carl/project/` directory structure
- **Existing Work**: @.carl/project/active.work.carl (if exists)
- **Arguments**: $ARGUMENTS

## Command Modes

### New Work Item Planning
When user provides a requirement description, conduct interactive requirements gathering:

1. **Understand the Request**: What does the user want to build/accomplish?
2. **Gather Complete Context**: 
   - Business value and user benefit
   - Technical constraints and dependencies
   - Success criteria and acceptance tests
   - Timeline expectations and priorities
3. **Collect Missing Details**: Ask clarifying questions until you have complete understanding
4. **Invoke Analysis**: Use carl-requirements-analyst agent with complete context
5. **Extract File Specification**: Parse agent's CARL file specification from analysis response
6. **Create CARL Files**: Use Write tool to create files based on agent's specification in proper directories
7. **Validate Creation**: Confirm files were created successfully and are schema-compliant

### Breakdown Mode (`--from` argument)
When breaking down existing work items:
1. **Read Existing File**: Load the specified work item
2. **Analyze Current Scope**: Understand what needs to be broken down  
3. **Gather Breakdown Context**: What specific aspects need decomposition?
4. **Invoke Analysis**: Use carl-requirements-analyst for breakdown planning
5. **Extract File Specifications**: Parse agent's CARL file specifications from analysis response
6. **Create Child Items**: Use Write tool to generate appropriate child work items with proper relationships
7. **Validate Creation**: Confirm all child files were created successfully and are schema-compliant

## Agent Integration

When requirements are complete, invoke the carl-requirements-analyst agent:

```
Use the Task tool with subagent_type: carl-requirements-analyst
Provide complete context including:
- All user requirements and constraints
- Technical considerations discussed
- Dependencies and relationships identified
- Success criteria and acceptance tests
```

## File Creation Implementation

**CRITICAL**: The carl-requirements-analyst agent provides specifications but cannot write files. The /carl:plan command MUST extract the file specification and create the actual files.

### Step-by-Step File Creation Process

1. **Parse Agent Response**: Extract the CARL file specification from agent's response
   - Look for "**File Path:**" and "**File Content:**" sections
   - Extract the complete YAML content between code blocks

2. **Validate Specification**: Ensure the specification is complete
   - Check that all required schema fields are present
   - Verify proper naming conventions (kebab-case files, snake_case IDs)
   - Confirm directory structure matches scope type

3. **Create Directory Structure**: Ensure target directory exists
   ```bash
   # Use LS tool to check if directory exists
   # Create directory if needed using Bash tool
   ```

4. **Write CARL File**: Use Write tool to create the file
   ```yaml
   # Extract exact YAML content from agent specification
   # Write to proper path: .carl/project/[scope]/[name].[scope].carl
   ```

5. **Verify Creation**: Confirm file was created successfully
   - Use Read tool to verify file contents match specification
   - Check that schema validation passes (hooks will validate automatically)

### Example Implementation Pattern

```markdown
After agent analysis:
1. Extract file path: `.carl/project/features/user-auth.feature.carl`
2. Extract YAML content from agent's "File Content:" section
3. Use Write tool: Write(file_path="/path/to/file", content="YAML content")
4. Verify with Read tool to confirm creation
5. Report success: "✅ Created user-auth.feature.carl"
```

## File Organization Standards

Create files in proper CARL directories:
- **Epics** (3-6 months): `.carl/project/epics/[name].epic.carl`
- **Features** (2-4 weeks): `.carl/project/features/[name].feature.carl`  
- **Stories** (2-5 days): `.carl/project/stories/[name].story.carl`
- **Technical** (variable): `.carl/project/technical/[name].tech.carl`

## Quality Gates

Ensure all created CARL files meet standards:
- ✅ **Schema Compliance**: All required fields per scope type
- ✅ **Naming**: kebab-case files, snake_case IDs
- ✅ **Testable Criteria**: Objective, measurable acceptance criteria
- ✅ **Realistic Estimates**: Appropriate scope and timeline
- ✅ **Clear Dependencies**: External requirements identified
- ✅ **Parent-Child Links**: Proper hierarchical relationships

## Requirements Gathering Strategy

### Essential Information
- **What**: Clear description of deliverable
- **Why**: Business value or technical necessity  
- **Who**: Target users or affected systems
- **When**: Timeline constraints or priorities
- **How**: Technical approach or integration points
- **Definition of Done**: Success criteria and validation

### Progressive Questioning
Start broad, then drill down:
1. **Purpose**: "What problem are we solving?"
2. **Users**: "Who will use this and how?"
3. **Constraints**: "What limitations do we need to consider?"
4. **Integration**: "How does this connect to existing systems?"
5. **Success**: "How will we know when this is complete?"

## Next Steps Guidance

Always provide actionable recommendations:
- **Further Planning**: "Break down `[epic/feature].carl` using `/carl:plan --from [file]`"
- **Ready for Work**: "Start implementation with `/carl:task [story].carl`"
- **Dependencies First**: "Complete `[dependency].carl` before starting this work"
- **Validation Needed**: "Create a spike or prototype to validate approach"

## Error Prevention

- ❌ **CRITICAL**: Never claim files are created without actually using Write tool
- ❌ Never rely on carl-requirements-analyst agent to create files (it can't write)
- ❌ Never create CARL files without complete requirements
- ❌ Never guess at scope - ask clarifying questions
- ❌ Never create unrealistic timelines or estimates
- ❌ Never skip dependency analysis
- ✅ **REQUIRED**: Always use Write tool to create files after agent analysis
- ✅ Always validate understanding before proceeding
- ✅ Always use proper naming conventions
- ✅ Always ensure schema compliance
- ✅ Always verify file creation with Read tool
- ✅ Always provide clear next steps

Remember: Quality planning prevents execution problems. Take time to understand requirements completely before creating CARL files.