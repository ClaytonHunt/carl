# Plan Command - New Item Creation Mode

Creates new CARL work items from user requirements with comprehensive validation.

## Prerequisites Check

- [ ] Foundation exists (vision.carl, process.carl, roadmap.carl)
- [ ] User provided requirement description or context
- [ ] CARL project structure is valid and accessible

## New Item Creation Process Checklist

### Requirements Understanding
- [ ] Parse user input for work item scope indicators
- [ ] Identify key requirement elements:
  - [ ] Business value or user benefit
  - [ ] Technical complexity indicators  
  - [ ] Timeline expectations
  - [ ] Dependencies or constraints
- [ ] Determine preliminary scope classification (epic/feature/story/technical)

### Context Gathering Phase
- [ ] **Business Context**:
  - [ ] What problem does this solve?
  - [ ] Who benefits from this work?
  - [ ] How does success get measured?
  - [ ] What's the business priority/urgency?

- [ ] **Technical Context**:
  - [ ] What technologies or systems are involved?
  - [ ] Are there architectural constraints?
  - [ ] What are the integration requirements?
  - [ ] Are there performance or security considerations?

- [ ] **Timeline Context**:
  - [ ] When is this needed?
  - [ ] Are there milestone dependencies?
  - [ ] What other work might be blocked by this?
  - [ ] Can this be delivered incrementally?

### Scope Classification Validation
- [ ] **Epic Classification** (3-6 months):
  - [ ] Multiple user stories across different features
  - [ ] Strategic business objective
  - [ ] Cross-team or major architectural changes
  - [ ] Significant market or user impact

- [ ] **Feature Classification** (2-4 weeks):
  - [ ] Single major capability or user workflow
  - [ ] Multiple related user stories
  - [ ] Complete user value delivery
  - [ ] Can be developed by single team

- [ ] **Story Classification** (2-5 days):
  - [ ] Single user capability or technical task
  - [ ] Clear acceptance criteria definable
  - [ ] Implementable in short iteration
  - [ ] Testable and demountable independently

- [ ] **Technical Classification** (variable):
  - [ ] Infrastructure, refactoring, or technical debt
  - [ ] Enables future features but no direct user value
  - [ ] Architecture improvements or technology upgrades
  - [ ] Developer experience enhancements

### Requirements Analysis with Agent
- [ ] Prepare complete context for carl-requirements-analyst:
  - [ ] All gathered business context
  - [ ] Technical constraints and considerations
  - [ ] Timeline requirements and dependencies
  - [ ] Success criteria and acceptance tests
  - [ ] Scope classification decision

- [ ] Use Task tool with carl-requirements-analyst subagent
- [ ] Provide comprehensive requirements context
- [ ] Request complete CARL file specification with proper structure

### CARL File Creation
- [ ] **Extract File Specification** from agent response:
  - [ ] Parse file path from agent analysis
  - [ ] Extract complete YAML content specification
  - [ ] Validate specification completeness

- [ ] **Directory Validation**:
  - [ ] Ensure target directory exists for scope type
  - [ ] Create missing directories if needed
  - [ ] Verify write permissions

- [ ] **File Creation**:
  - [ ] Use Write tool to create CARL file with extracted specification
  - [ ] Follow exact file path provided by agent
  - [ ] Include all specified YAML content

- [ ] **Post-Creation Validation**:
  - [ ] Use Read tool to verify file contents match specification
  - [ ] Check file is accessible and readable
  - [ ] Validate schema compliance (hooks will auto-validate)

### Validation and Quality Checks
- [ ] **Schema Compliance**:
  - [ ] All required fields present for scope type
  - [ ] Field values meet type requirements
  - [ ] YAML syntax is valid
  - [ ] Naming conventions followed (kebab-case.scope.carl)

- [ ] **Content Quality**:
  - [ ] Acceptance criteria are measurable and testable
  - [ ] Descriptions provide sufficient implementation context
  - [ ] Estimates are realistic for stated scope
  - [ ] Dependencies are properly identified

- [ ] **Relationship Validation**:
  - [ ] Parent-child relationships are valid if specified
  - [ ] Dependencies exist and are accessible
  - [ ] No circular dependency chains created

### Success Confirmation
- [ ] Confirm work item was created successfully
- [ ] Report file location and key attributes
- [ ] Provide next step guidance based on scope type
- [ ] Update session tracking with planning activity

## Success Criteria

✅ **Complete Understanding**: All essential requirements gathered  
✅ **Proper Scope**: Work item classified appropriately  
✅ **Schema Compliance**: File meets all validation requirements  
✅ **Quality Content**: Actionable acceptance criteria and clear description  
✅ **File Creation**: CARL file created and verified successfully

## Output Format

```
🔍 Analyzing requirement: "User authentication system with OAuth"

📊 Scope Analysis:
   Business Value: Enable secure user access and third-party integrations
   Technical Scope: OAuth 2.0, JWT tokens, user database, API security
   Timeline: 2-4 weeks based on OAuth provider selection
   Classification: FEATURE (multiple related user stories)

📋 Requirements Gathering:
✅ Business context: Support social login and API access for mobile app
✅ Technical context: Node.js/Express backend, PostgreSQL user storage  
✅ Timeline context: Needed before mobile app launch in 6 weeks
✅ Success criteria: Support Google/GitHub OAuth, <500ms login time

📄 Creating user-authentication-system.feature.carl:
✅ File path: .carl/project/features/user-authentication-system.feature.carl
✅ Schema validation: All required fields present
✅ Content quality: 5 user stories identified, measurable acceptance criteria
✅ Dependencies: Database schema setup (technical item required)

🎯 Next Steps:
   • Review generated feature for accuracy and completeness
   • Run /carl:plan --from user-authentication-system.feature.carl to break down into stories
   • Use /carl:task user-authentication-system.feature.carl when ready to implement
```

## Validation Standards

### Requirements Completeness
- [ ] Business value clearly articulated
- [ ] Technical approach identified
- [ ] Success metrics defined
- [ ] Timeline expectations set
- [ ] Dependencies identified

### Content Quality Gates
- [ ] Acceptance criteria are objective and measurable
- [ ] User stories follow "As a... I want... so that..." format where applicable
- [ ] Technical requirements are specific and actionable
- [ ] Estimates align with scope complexity
- [ ] Implementation notes provide useful guidance

### File Quality Standards
- [ ] YAML syntax is perfect (no parsing errors)
- [ ] All required schema fields populated
- [ ] Naming follows kebab-case.scope.carl convention
- [ ] IDs use snake_case format
- [ ] File created in correct directory for scope type

## Error Handling

### Requirements Gathering Failures
- [ ] If user provides insufficient context → Ask targeted clarifying questions
- [ ] If requirements seem unrealistic → Provide scope guidance and alternatives
- [ ] If business value unclear → Help user articulate the "why"
- [ ] If technical approach uncertain → Suggest research spike or prototype story

### Scope Classification Issues
- [ ] If scope seems too large → Suggest breaking into smaller items
- [ ] If scope seems too small → Consider combining with related work
- [ ] If classification unclear → Default to smaller scope with note for refinement
- [ ] If timing unrealistic → Discuss alternatives or phased approach

### File Creation Failures
- [ ] If directory doesn't exist → Create required directory structure
- [ ] If file already exists → Confirm overwrite or suggest alternative naming
- [ ] If schema validation fails → Fix violations and retry creation
- [ ] If agent analysis incomplete → Gather missing information and retry

### Recovery Strategies
- [ ] Partial planning → Create basic work item, note areas needing refinement
- [ ] Template fallback → Use schema-compliant template with guidance for completion
- [ ] Progressive refinement → Start with minimal viable work item, enhance iteratively
- [ ] Expert consultation → Suggest involving domain expert for complex requirements