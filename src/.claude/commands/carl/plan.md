# Create or Update CARL Plans

Intelligent, context-aware planning that adapts to project complexity and generates comprehensive CARL (Context-Aware Requirements Language) files for features, epics, or technical initiatives.

## Adaptive Planning Intelligence

CARL automatically detects the scope and complexity of your request and applies the appropriate planning depth:

- **Epic-scale requests** → Comprehensive epic breakdown with features
- **Feature-scale requests** → Detailed feature planning with user stories  
- **Story-scale requests** → Task breakdown and implementation planning
- **Technical initiatives** → Technical planning with refactoring and improvement focus

## Usage Scenarios

### 1. Intelligent Context Detection
```bash
/carl:plan "user authentication system"        # Auto-detects as feature-scale
/carl:plan "complete mobile app redesign"      # Auto-detects as epic-scale  
/carl:plan "fix login button styling"         # Auto-detects as story-scale
/carl:plan "refactor authentication service"  # Auto-detects as technical initiative
```

### 2. Explicit Scope Control
```bash
/carl:plan --epic "customer analytics platform"
/carl:plan --feature "user profile management" 
/carl:plan --story "add password confirmation field"
/carl:plan --technical "improve database query performance"
```

### 3. Context-Aware Planning
```bash
/carl:plan --from-existing user-auth.intent    # Plan based on existing CARL intent
/carl:plan --extend user-profile               # Extend existing feature planning
/carl:plan --refactor authentication-service   # Technical improvement planning
```

## CARL-Optimized Planning Process

### 1. Context Analysis and Scope Detection
```pseudocode
FUNCTION determine_planning_scope(user_input):
    // Analyze input for scope indicators
    scope_indicators = analyze_scope_keywords(user_input)
    complexity_signals = assess_complexity_indicators(user_input)
    existing_carl_context = check_existing_carl_files(user_input)
    
    IF scope_indicators.contains("system", "platform", "complete", "entire") THEN
        RETURN "epic_scale_planning"
    ELSE IF scope_indicators.contains("feature", "capability", "functionality") THEN
        RETURN "feature_scale_planning"
    ELSE IF scope_indicators.contains("fix", "update", "modify", "add") THEN
        RETURN "story_scale_planning"
    ELSE IF scope_indicators.contains("refactor", "improve", "optimize") THEN
        RETURN "technical_initiative_planning"
    ELSE
        // Use complexity analysis for ambiguous cases
        RETURN determine_scope_by_complexity(complexity_signals)
    END IF
END FUNCTION
```

### 2. CARL-Aware Specialist Selection
Launch appropriate specialists based on detected scope and existing CARL context:

```
# Epic-scale planning specialists
Task: carl-architecture-analyst - Analyze system architecture requirements and component relationships for epic planning
Task: carl-requirements-analyst - Extract high-level business requirements and stakeholder needs for epic scope
Task: carl-backend-analyst - Assess backend system requirements and service architecture for epic implementation
Task: carl-frontend-analyst - Analyze user experience requirements and interface architecture for epic scope

# Feature-scale planning specialists  
Task: carl-requirements-analyst - Extract detailed feature requirements and business rules from feature description
Task: carl-backend-analyst - Analyze API and data requirements for feature implementation
Task: carl-frontend-analyst - Map user journeys and interface requirements for feature
Task: carl-quality-analyst - Define testing strategy and quality requirements for feature

# Story-scale planning specialists
Task: carl-debt-analyst - Assess technical debt impact and improvement opportunities for story implementation
Task: carl-requirements-analyst - Extract specific acceptance criteria and constraints for story
Task: Implementation specialist based on story type (backend, frontend, etc.)

# Technical initiative specialists
Task: carl-debt-analyst - Comprehensive technical debt analysis and refactoring strategy
Task: carl-architecture-analyst - Analyze architectural improvements and system impact
Task: carl-performance-analyst - Assess performance implications and optimization opportunities
```

### 3. Adaptive CARL File Generation

#### Epic-Scale Planning Output
```yaml
# Generated epic intent file
id: customer_analytics_platform
type: epic_initiative
complexity: high
estimated_duration: "3-6_months"

intent:
  what: "Comprehensive customer analytics platform providing actionable business insights"
  why: "Enable data-driven business decisions and improve customer experience through analytics"
  who: ["business_analysts", "sales_teams", "customer_success", "executives"]

epic_breakdown:
  core_features:
    - id: "data_collection_system"
      priority: "P0"
      description: "Collect and aggregate customer interaction data"
      effort_estimate: "4_weeks"
      
    - id: "analytics_dashboard"
      priority: "P0" 
      description: "Interactive dashboard for data visualization and analysis"
      effort_estimate: "6_weeks"
      
    - id: "reporting_engine"
      priority: "P1"
      description: "Automated report generation and distribution"
      effort_estimate: "3_weeks"

architectural_requirements:
  scalability: "handle_1M_customer_records"
  performance: "dashboard_load_under_3_seconds"
  availability: "99.9%_uptime"
  data_retention: "5_years_historical_data"

success_metrics:
  business_value:
    - "increase_customer_retention_by_15%"
    - "reduce_customer_acquisition_cost_by_20%"
    - "improve_sales_conversion_by_25%"
  
  technical_metrics:
    - "process_10k_events_per_second"
    - "generate_reports_under_30_seconds"
    - "maintain_sub_second_query_response"
```

#### Feature-Scale Planning Output
```yaml
# Generated feature intent file
id: user_profile_management
parent: user_management_system
type: feature_development
complexity: medium
estimated_duration: "2-3_weeks"

intent:
  what: "Comprehensive user profile management with editing, preferences, and privacy controls"
  why: "Enable users to maintain accurate personal information and customize their experience"
  who: ["authenticated_users", "system_administrators"]

user_stories:
  core_stories:
    - story: "User can view their complete profile information"
      acceptance_criteria:
        - "Profile displays all user data fields clearly organized"
        - "Profile loads within 2 seconds of navigation"
        - "Profile is responsive across mobile and desktop devices"
      effort_estimate: "2_days"
      
    - story: "User can edit profile information with validation"
      acceptance_criteria:
        - "All fields have appropriate validation with clear error messages"
        - "Changes are saved immediately with success confirmation"
        - "Profile image upload supports common formats under 5MB"
      effort_estimate: "3_days"

technical_requirements:
  api_endpoints:
    - "GET /api/users/profile - Retrieve user profile data"
    - "PUT /api/users/profile - Update user profile information"
    - "POST /api/users/avatar - Upload profile image"
  
  data_validations:
    - "Email format validation with uniqueness check"
    - "Phone number format validation by country"
    - "Profile image file type and size validation"
  
  security_requirements:
    - "Users can only access and modify their own profile"
    - "Profile updates require reauthentication for sensitive fields"
    - "Profile image uploads scanned for malicious content"
```

#### Technical Initiative Planning Output
```yaml
# Generated technical improvement intent
id: authentication_service_refactoring
type: technical_initiative  
priority: high
complexity: medium
estimated_duration: "1-2_weeks"

intent:
  what: "Refactor authentication service to improve maintainability and reduce technical debt"
  why: "Current authentication code is complex and difficult to maintain, slowing feature development"
  who: ["development_team", "qa_engineers", "security_team"]

technical_objectives:
  debt_reduction:
    - "Reduce cyclomatic complexity from 15 to under 8 per method"
    - "Split AuthService class into focused single-responsibility classes"
    - "Increase test coverage from 75% to 90%"
    
  architectural_improvements:
    - "Implement dependency injection for better testability"
    - "Extract common validation logic to reusable utilities"
    - "Standardize error handling patterns across authentication flow"

refactoring_plan:
  phase_1_preparation:
    - "Comprehensive test coverage for existing functionality"
    - "Document current authentication flow and dependencies"
    - "Identify and catalog all authentication entry points"
    
  phase_2_refactoring:
    - "Extract PasswordValidator and EmailValidator classes"
    - "Create separate LoginService and RegistrationService"
    - "Implement AuthenticationResult value object"
    
  phase_3_integration:
    - "Update controllers to use new service classes"
    - "Refactor tests to work with new architecture"
    - "Update documentation and API contracts"

success_criteria:
  quality_improvements:
    - "All methods have cyclomatic complexity under 8"
    - "Test coverage reaches 90% for authentication logic"
    - "Code review time decreases by 30%"
  
  business_benefits:
    - "Feature development velocity increases by 25%"
    - "Authentication bug rate decreases by 40%"
    - "Onboarding time for new developers reduces by 50%"
```

### 4. Context Integration and Dependency Resolution

**Automatic CARL Context Integration:**
- Read existing CARL intent files for related features
- Analyze current implementation state from CARL state files
- Extract dependency relationships from CARL context files
- Update CARL index with new planning relationships

**Smart Dependency Detection:**
```pseudocode
FUNCTION resolve_planning_dependencies(plan_intent):
    dependencies = {}
    
    // Check existing CARL files for related features
    related_intents = find_related_carl_intents(plan_intent)
    FOR EACH intent IN related_intents DO
        dependency = {
            intent_file: intent.file_path,
            relationship: determine_relationship_type(plan_intent, intent),
            impact: assess_dependency_impact(plan_intent, intent)
        }
        dependencies[intent.id] = dependency
    END FOR
    
    // Analyze technical dependencies
    technical_deps = analyze_technical_dependencies(plan_intent)
    dependencies.merge(technical_deps)
    
    // Check for implementation blockers
    blockers = identify_potential_blockers(plan_intent, dependencies)
    dependencies["blockers"] = blockers
    
    RETURN dependencies
END FUNCTION
```

### 5. CARL Index Updates and Session Tracking

**Automatic CARL System Updates:**
- Update `.carl/index.carl` with new planning information
- Create planning session record in `.carl/sessions/`
- Link new CARL files to existing feature hierarchy
- Generate cross-references between related CARL files

## Adaptive Planning Features

### 1. Complexity-Based Template Selection
CARL automatically selects appropriate templates based on detected complexity:

- **Simple plans** → Minimal documentation with focus on implementation
- **Medium plans** → Balanced documentation with user stories and technical requirements
- **Complex plans** → Comprehensive documentation with architectural analysis

### 2. Existing Context Enhancement
When planning extends existing features:
- Load current CARL files for context
- Identify gaps and improvement opportunities  
- Preserve existing architectural decisions
- Maintain consistency with established patterns

### 3. Multi-Stage Planning
For large initiatives, CARL creates staged planning:
- **Phase 1**: MVP and core functionality
- **Phase 2**: Enhanced features and optimizations
- **Phase 3**: Advanced features and integrations

## Command Variations

### Scope-Specific Planning
```bash
/carl:plan --epic "e-commerce platform"           # Epic-scale comprehensive planning
/carl:plan --feature "shopping cart"              # Feature-scale detailed planning  
/carl:plan --story "add quantity selector"        # Story-scale task planning
/carl:plan --technical "optimize database queries" # Technical improvement planning
```

### Context-Aware Planning
```bash
/carl:plan --extend user-auth                     # Extend existing feature
/carl:plan --refactor payment-service             # Technical refactoring plan
/carl:plan --from-gap analysis-report.md          # Plan from gap analysis
```

### Planning Modes
```bash
/carl:plan --comprehensive "mobile app"          # Maximum detail and analysis
/carl:plan --lightweight "button styling fix"    # Minimal overhead planning
/carl:plan --collaborative "team dashboard"      # Multi-stakeholder planning
```

## Success Criteria

- [ ] Appropriate planning scope automatically detected from user input
- [ ] CARL-optimized specialists selected based on planning requirements
- [ ] Comprehensive CARL intent files generated with proper relationships
- [ ] Existing CARL context integrated and dependencies resolved
- [ ] CARL index updated with new planning information
- [ ] Planning session recorded for continuity and handoff
- [ ] Generated plans are actionable and implementation-ready
- [ ] All stakeholder requirements captured and prioritized

## Integration Points

- **Input**: User description, existing CARL context, project history
- **Output**: Complete CARL intent files, context updates, planning session
- **Next Commands**:
  - `/carl:task [plan-item]` to start implementing planned items
  - `/carl:status` to monitor planning and implementation progress
  - `/carl:analyze --sync` to update CARL files after external changes

This adaptive planning system ensures that CARL always generates the right level of detail for any planning request while maintaining perfect integration with existing project context and requirements.