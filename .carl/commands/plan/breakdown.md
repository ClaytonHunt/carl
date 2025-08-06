# Plan Command - Breakdown Mode

Breaks down existing work items into appropriate child items with proper relationships.

## Prerequisites Check

- [ ] Source work item file exists and is valid
- [ ] Source work item is appropriate scope for breakdown
- [ ] Foundation and validation frameworks are available

## Breakdown Process Checklist

### Source Work Item Analysis
- [ ] **Load and Validate Source Item**:
  - [ ] Read source work item file
  - [ ] Validate file syntax and schema compliance
  - [ ] Confirm work item is appropriate for breakdown
  - [ ] Extract current breakdown level (epic→features, feature→stories)

- [ ] **Scope Assessment**:
  - [ ] **Epic Breakdown**: Large strategic initiative → multiple features
  - [ ] **Feature Breakdown**: Major capability → multiple user stories
  - [ ] **Story Assessment**: Determine if story is appropriately sized or needs decomposition
  - [ ] **Technical Assessment**: Complex technical work → implementation phases

### Breakdown Validation
- [ ] **Scope Appropriateness**:
  - [ ] Epics should break down into 3-8 features
  - [ ] Features should break down into 3-12 stories
  - [ ] Stories breaking down indicates they were incorrectly scoped
  - [ ] Technical items may break down into sequential phases

- [ ] **Complexity Assessment**:
  - [ ] Source item has sufficient complexity to warrant breakdown
  - [ ] Resulting child items will have meaningful scope
  - [ ] Each child item delivers independent value
  - [ ] Child items can be developed and tested separately

### Requirements Analysis for Breakdown
- [ ] **Prepare Comprehensive Context**:
  - [ ] Source work item complete content (description, acceptance criteria, etc.)
  - [ ] Parent epic or feature context (business goals, constraints)
  - [ ] Project technical architecture and standards
  - [ ] Timeline expectations and milestone pressures
  - [ ] Team structure and development capacity

- [ ] **Agent Analysis**:
  - [ ] Use Task tool with carl-requirements-analyst subagent
  - [ ] Provide complete breakdown context
  - [ ] Request multiple child work item specifications
  - [ ] Ensure agent understands parent-child relationship requirements

### Child Work Item Creation
- [ ] **Extract Multiple Specifications**:
  - [ ] Parse all child item specifications from agent response
  - [ ] Validate each specification has complete file path and content
  - [ ] Ensure consistent naming and relationship structure
  - [ ] Verify child items cover complete scope of parent

- [ ] **Batch File Creation**:
  - [ ] For each child work item specification:
    - [ ] Ensure target directory exists for child scope type
    - [ ] Use Write tool to create child CARL file
    - [ ] Include proper parent relationship references
    - [ ] Add child item reference to parent's child list

- [ ] **Parent-Child Relationship Validation**:
  - [ ] Each child item references correct parent
  - [ ] Parent item lists all created child items
  - [ ] Relationship hierarchy is logically consistent
  - [ ] Dependencies between child items are properly defined

### Relationship Management
- [ ] **Update Parent Work Item**:
  - [ ] Add child_stories, child_features, or child_epics array
  - [ ] List all created child items by filename
  - [ ] Update parent status to reflect breakdown completion
  - [ ] Add implementation notes about breakdown decision

- [ ] **Cross-Reference Validation**:
  - [ ] Verify child items can find their parent
  - [ ] Check parent can reference all its children
  - [ ] Validate naming consistency across relationships
  - [ ] Ensure no orphaned or duplicate relationships

### Quality Assurance
- [ ] **Coverage Validation**:
  - [ ] Child items completely cover parent scope
  - [ ] No significant gaps in functionality
  - [ ] No substantial overlaps between child items
  - [ ] Child acceptance criteria aggregate to parent acceptance criteria

- [ ] **Individual Quality Check**:
  - [ ] Each child item meets schema requirements
  - [ ] Acceptance criteria are testable and measurable
  - [ ] Descriptions provide sufficient implementation context
  - [ ] Estimates are realistic for child scope
  - [ ] Dependencies properly identified and resolvable

- [ ] **Dependency Analysis**:
  - [ ] Dependencies between child items are logical
  - [ ] No circular dependency chains created
  - [ ] External dependencies properly carried forward
  - [ ] Critical path through child items is reasonable

## Success Criteria

✅ **Complete Breakdown**: Parent scope fully decomposed into child items  
✅ **Proper Relationships**: Parent-child links are bidirectional and valid  
✅ **Quality Child Items**: Each child meets schema and content standards  
✅ **Logical Dependencies**: Dependency chains are acyclic and implementable

## Output Format

```
🔍 Breaking down feature: user-authentication-system.feature.carl

📊 Breakdown Analysis:
   Source Scope: Feature (user authentication with OAuth integration)
   Target Scope: Stories (individual user capabilities)
   Complexity: High (5-8 stories expected)
   Timeline: 2-4 weeks total implementation

📋 Agent Analysis:
✅ Requirements context: OAuth providers, JWT handling, user database
✅ Technical constraints: Node.js/Express, PostgreSQL, mobile app integration
✅ Business priorities: Security, user experience, third-party compatibility

📄 Creating child stories:
✅ oauth-provider-integration.story.carl → Support Google & GitHub OAuth
✅ jwt-token-management.story.carl → Generate and validate JWT tokens
✅ user-profile-storage.story.carl → Store user data from OAuth providers
✅ api-authentication-middleware.story.carl → Protect API endpoints
✅ mobile-app-login-flow.story.carl → Mobile-optimized authentication UX

🔄 Updating parent relationships:
✅ Updated user-authentication-system.feature.carl with child_stories array
✅ All child stories reference parent_feature correctly
✅ Dependencies validated: no circular chains detected

🎯 Next Steps:
   • Review generated stories for completeness and accuracy
   • Use /carl:task [story-name] to implement individual stories
   • Monitor feature progress with /carl:status user-authentication-system.feature
```

## Breakdown Patterns by Scope

### Epic → Features
```yaml
breakdown_approach:
  business_domains: Split by user workflow or business capability
  technical_domains: Separate by system boundaries or service areas
  timeline_phases: Break by development phases or release milestones
  user_personas: Organize by different user types or access levels
```

### Feature → Stories  
```yaml
breakdown_approach:
  user_journeys: Each story represents one user task completion
  technical_layers: Frontend, backend, database, integration layers
  acceptance_criteria: One major acceptance criterion per story
  testable_units: Each story can be independently tested and demoed
```

### Technical Item → Phases
```yaml
breakdown_approach:
  implementation_phases: Setup, core implementation, integration, testing
  risk_mitigation: High-risk elements as separate investigation stories
  dependency_layers: Database, API, UI in dependency order
  rollback_units: Each phase can be independently rolled back
```

## Validation Standards

### Breakdown Completeness
- [ ] Child items cover 100% of parent functionality
- [ ] No important acceptance criteria left unaddressed
- [ ] Business value preserved across all child items
- [ ] Technical requirements distributed appropriately

### Child Item Quality
- [ ] Each child item is independently valuable
- [ ] Stories can be completed in 2-5 days
- [ ] Features can be completed in 2-4 weeks
- [ ] Technical phases have clear completion criteria

### Relationship Integrity
- [ ] Parent knows about all its children
- [ ] Children correctly reference their parent
- [ ] Sibling dependencies are minimal and logical
- [ ] Dependency chains support parallel development

## Error Handling

### Source Work Item Issues
- [ ] If source item too small for breakdown → Suggest combining with related work
- [ ] If source item poorly defined → Recommend refinement before breakdown
- [ ] If source item already broken down → Check if further decomposition needed
- [ ] If source item blocked by dependencies → Address blockers first

### Breakdown Analysis Failures
- [ ] If agent cannot identify clear breakdown → Provide breakdown templates
- [ ] If breakdown seems arbitrary → Re-analyze with different approach
- [ ] If child items too similar → Consolidate or redifferentiate
- [ ] If breakdown too complex → Consider intermediate level (epic→feature→story)

### File Creation Issues
- [ ] If child directories don't exist → Create required directory structure
- [ ] If naming conflicts arise → Generate unique names with parent prefix
- [ ] If parent update fails → Create children but note relationship issue
- [ ] If schema validation fails → Fix violations and retry creation

### Relationship Management Problems
- [ ] If parent-child links break → Rebuild relationships from file analysis
- [ ] If circular dependencies detected → Restructure child items
- [ ] If dependency chains too long → Consider flattening or grouping
- [ ] If cross-references invalid → Validate and repair reference integrity

## Quality Gates

### Pre-Breakdown Validation
- [ ] Source work item is schema-compliant
- [ ] Source scope is appropriate for breakdown
- [ ] Breakdown approach is clearly defined
- [ ] Target child scope is appropriate

### Post-Breakdown Validation
- [ ] All child files created successfully
- [ ] Parent-child relationships are bidirectional
- [ ] No circular dependencies exist
- [ ] Coverage is complete with minimal overlap
- [ ] Each child item meets quality standards independently