# Analyze Project for CARL

Analyze existing codebases and generate CARL (Context-Aware Requirements Language) files. This command can be used for initial CARL adoption or to update CARL files after team members make changes without using CARL.

## Usage Scenarios

### 1. Initial CARL Adoption
For projects that want to start using CARL:
```bash
/analyze
/analyze --comprehensive    # Deep analysis with full feature mapping
```

### 2. Post-Git Pull Updates  
When team members commit changes without using CARL:
```bash
/analyze --sync            # Update existing CARL files
/analyze --changes-only    # Analyze only recent changes
```

### 3. Specific Directory Analysis
```bash
/analyze src/features      # Analyze specific directory
/analyze --path api/       # Analyze API-related code
```

## Process

### 1. Codebase Discovery
Launch async CARL-optimized specialist subagents for comprehensive analysis:

```
Task: Architecture specialist (carl-architecture-analyst) - analyze system structure and generate .context.carl files mapping component relationships, identify major architectural patterns for system.context.carl
Task: Backend specialist (carl-backend-analyst) - catalog API endpoints and data models for backend.context.carl, extract service dependencies and generate api.state.carl tracking
Task: Frontend specialist (carl-frontend-analyst) - identify UI components and user workflows for frontend.context.carl, extract user journeys for ui.state.carl tracking  
Task: Requirements specialist (carl-requirements-analyst) - extract implicit requirements from code patterns, generate feature.intent.carl files for discovered capabilities
Task: QA specialist (carl-quality-analyst) - assess existing test coverage and generate testing.state.carl, identify quality metrics for quality.context.carl
Task: Security specialist (carl-security-analyst) - evaluate security patterns and generate security.context.carl, identify compliance requirements for security.state.carl
Task: Technical debt analyst (carl-debt-analyst) - identify technical debt items and generate debt.state.carl tracking, assess refactoring opportunities for maintenance.context.carl
```

### 2. Feature Extraction
**Automatic Feature Detection:**
- Scan directory structure for feature modules
- Identify user-facing capabilities from routes/controllers
- Map database entities to business features
- Extract user workflows from frontend components
- Detect integration points and external dependencies

### 3. Implementation State Assessment
**Current State Analysis:**
- Code completion status by feature
- Test coverage analysis
- Documentation completeness
- Technical debt assessment
- Performance bottlenecks identification

### 4. CARL File Generation

#### Generate Intent Files (.intent)
```yaml
# Example: user-auth.intent
id: feature_user_auth
status: implemented
complexity: medium

intent:
  what: "Users can securely authenticate and manage sessions"
  why: "Access protected resources and maintain user state"
  who: ["end_users", "admin_users"]

constraints:
  must_have: ["password_auth", "session_mgmt", "logout"]
  should_have: ["remember_me", "password_reset"]
  must_not: ["plaintext_passwords", "session_fixation"]

current_implementation:
  files: ["src/auth/AuthController.js", "src/models/User.js"]
  endpoints: ["/login", "/logout", "/verify"]
  tests: ["auth.test.js", "session.test.js"]
  coverage: 85%
```

#### Generate State Files (.state)
```yaml
# Example: user-auth.state  
spec_id: feature_user_auth
last_updated: "2024-01-15T10:30:00Z"
phase: production

implementation:
  completed:
    - component: "AuthController"
      file: "src/auth/AuthController.js"
      tests: "unit,integration"
      coverage: 90%
    - component: "UserModel"
      file: "src/models/User.js"
      tests: "unit"
      coverage: 95%

  technical_debt:
    - issue: "Password reset flow incomplete"
      severity: "medium"
      effort: "1d"
    - issue: "Missing rate limiting"
      severity: "high"
      effort: "4h"

validation:
  tests_passing: true
  security_scan: "passed"
  performance_check: "passed"
```

#### Generate Context Files (.context)
```yaml
# Example: user-auth.context
spec_id: feature_user_auth
codebase_links:
  controllers: ["src/auth/AuthController.js"]
  models: ["src/models/User.js", "src/models/Session.js"]
  views: ["src/components/LoginForm.jsx"]
  tests: ["tests/auth.test.js"]
  
dependencies:
  internal: ["src/utils/crypto.js", "src/middleware/auth.js"]
  external: ["bcrypt", "jsonwebtoken", "express-session"]
  
integration_points:
  database: ["users table", "sessions table"]
  apis: ["/api/auth/*"]
  middleware: ["authentication", "authorization"]
```

### 5. Dependency Resolution
**Smart Dependency Detection:**
- Import/require statement analysis
- Database relationship mapping  
- API endpoint dependencies
- Component hierarchy analysis
- Cross-feature interactions

### 6. Gap Analysis
**Identify Missing Elements:**
- Features with incomplete implementations
- Missing test coverage areas
- Undocumented business logic
- Security vulnerabilities
- Performance optimization opportunities

## Integration with CARL System

### 1. Update Index File
```yaml
# .carl/index.carl - Master AI reference
last_analysis: "2024-01-15T10:30:00Z"
project_type: "web_application"
tech_stack: ["Node.js", "React", "PostgreSQL"]

active_features:
  - id: user_auth
    status: production
    intent_file: intents/user-auth.intent
    next_action: optimize_performance
    
  - id: user_profile
    status: development  
    intent_file: intents/user-profile.intent
    next_action: complete_edit_form

discovered_patterns:
  architecture: "MVC with React frontend"
  testing: "Jest with 80% coverage target"
  deployment: "Docker with CI/CD"
```

### 2. Create Session Context
```yaml
# .carl/sessions/analysis-session.session
session_type: analysis
timestamp: "2024-01-15T10:30:00Z"
scope: full_project

discoveries:
  new_features: 3
  updated_features: 7
  technical_debt_items: 12
  test_gaps: 5

recommendations:
  priority_fixes: ["implement_rate_limiting", "complete_password_reset"]
  optimization_opportunities: ["cache_user_sessions", "optimize_db_queries"]
  next_development: ["user_profile_enhancement", "admin_dashboard"]
```

## Analysis Modes

### Comprehensive Mode (--comprehensive)
- Full codebase scan
- Complete feature mapping
- Detailed dependency analysis
- Performance assessment
- Security audit

### Sync Mode (--sync)  
- Update existing CARL files only
- Focus on changed files since last analysis
- Maintain existing structure
- Fast execution for daily updates

### Changes Only (--changes-only)
- Analyze only git diff since last commit
- Update relevant CARL files
- Minimal processing for quick updates
- Perfect for post-pull synchronization

## Command Variations

### Basic Analysis
```bash
/analyze                    # Full project analysis
/analyze --quiet           # Suppress Carl audio during analysis
```

### Targeted Analysis
```bash
/analyze src/features      # Specific directory
/analyze --filter "auth"   # Features matching pattern
/analyze --new-only        # Only new/untracked features
```

### Team Sync Analysis
```bash
/analyze --sync            # Update after team changes
/analyze --git-diff        # Analyze changes since last commit
/analyze --branch-compare  # Compare with main branch
```

## Output Generation

### Analysis Report
```markdown
# CARL Analysis Report - [Timestamp]

## Project Overview
- **Type**: [Detected project type]
- **Scale**: [Small/Medium/Large based on codebase size]
- **Tech Stack**: [Detected technologies]
- **CARL Coverage**: [Percentage of codebase with CARL files]

## Discovered Features
### Production Features (3)
- ✅ User Authentication - Complete with tests
- ✅ User Profile - Basic implementation
- ✅ Data Dashboard - Core functionality

### Development Features (2)  
- 🔄 Admin Panel - 60% complete
- 🔄 Reporting System - Early development

### Planned Features (4)
- 📋 Feature requests identified from TODO comments
- 📋 API endpoints with no implementation
- 📋 UI mockups without backend

## Recommendations
### Immediate Actions
1. Complete admin panel implementation
2. Add rate limiting to authentication
3. Implement comprehensive error handling

### Technical Debt
- Password reset flow (1 day effort)
- Missing input validation (4 hours)
- Outdated dependencies (2 hours)

### Next Development Priorities
1. Mobile responsive design
2. Advanced user permissions
3. Real-time data updates
```

### 7. Strategic Context Generation

#### Generate Mission File (mission.carl)
Use the `mission.template` to create comprehensive product context:

```yaml
# Example: mission.carl
project_id: "user_management_system"
created_date: "2024-01-15"
last_updated: "2024-01-15"

mission:
  what: "Streamline user onboarding and account management for SaaS applications"
  why: "Reduce support tickets and improve user retention through self-service capabilities"
  for_whom: ["saas_administrators", "end_users", "support_teams"]

positioning:
  elevator_pitch: "Self-service user management platform that reduces admin overhead by 70%"
  key_differentiators:
    - "Zero-configuration SSO integration"
    - "Advanced role-based permissions"
    - "Automated user lifecycle management"

users:
  primary:
    - type: "saas_admin"
      pain_points: ["manual_user_setup", "permission_management", "audit_compliance"]
      success_criteria: ["reduced_setup_time", "automated_workflows"]

goals:
  business_objectives:
    - objective: "Reduce user setup time by 70%"
      metric: "average_onboarding_minutes"
      priority: "high"
```

**Mission Generation Process:**
1. **Extract Product Vision**: Analyze README files, documentation, and marketing content
2. **Identify User Types**: Parse user roles from authentication systems and UI components
3. **Map Business Goals**: Infer objectives from feature implementations and metrics tracking
4. **Document Value Proposition**: Synthesize unique differentiators from competitive analysis

#### Generate Roadmap File (roadmap.carl)
Create strategic development phases based on current implementation state:

```yaml
# Example: roadmap.carl
project_id: "user_management_system"
created_date: "2024-01-15"

strategy:
  vision: "Complete user lifecycle management platform"
  timeline: "18 months to full feature parity"
  methodology: "Agile with bi-weekly releases"

phases:
  phase_0:
    name: "Foundation Complete"
    status: "completed"
    completion_percentage: 100
    deliverables:
      - name: "User Authentication"
        status: "completed"
        business_value: "Secure access control established"
      - name: "Basic Profile Management"
        status: "completed"
        business_value: "Self-service user updates"

  phase_1:
    name: "Advanced Features"
    status: "in_progress"
    completion_percentage: 60
    deliverables:
      - name: "Role-Based Permissions"
        status: "in_progress"
        priority: "critical"
        business_value: "Granular access control"

current_focus:
  active_phase: "phase_1"
  current_priorities:
    - priority: "Complete permission system"
      rationale: "Blocking enterprise customer requirements"
      success_measure: "All user roles properly enforced"
    - priority: "Mobile-responsive interface"
      rationale: "60% of users access from mobile devices"
```

**Roadmap Generation Process:**
1. **Phase Detection**: Analyze git history and completed features to identify natural development phases
2. **Current State Mapping**: Assess in-progress work and recent commit patterns
3. **Priority Inference**: Extract next priorities from TODO comments, issue trackers, and incomplete features
4. **Business Value Assessment**: Connect technical features to user value based on usage patterns

#### Generate Decisions File (decisions.carl)
Document architectural and strategic decisions discovered in the codebase:

```yaml
# Example: decisions.carl
project_id: "user_management_system"
created_date: "2024-01-15"

decisions:
  dec_001:
    id: "DEC-001"
    date: "2024-01-10"
    status: "accepted"
    category: "technical"
    title: "Chose JWT for session management"
    
    context:
      situation: "Need secure, scalable authentication for API-first architecture"
      constraints: ["stateless_requirement", "mobile_compatibility", "microservices_ready"]
      
    decision:
      chosen_option: "JWT with refresh token rotation"
      rationale: "Balances security with performance for distributed system"
      
    consequences:
      positive_impacts:
        - "Stateless authentication enables horizontal scaling"
        - "Mobile apps can cache tokens for offline capability"
        - "Microservices can validate tokens independently"
      negative_impacts:
        - "Token revocation requires additional complexity"
        - "Larger payload size compared to session IDs"

  dec_002:
    id: "DEC-002"
    date: "2024-01-12"
    status: "accepted"
    category: "technical"
    title: "Selected PostgreSQL over NoSQL for user data"
    
    context:
      situation: "User data requires ACID compliance and complex relationships"
      constraints: ["data_consistency", "reporting_requirements", "team_expertise"]
      
    decision:
      chosen_option: "PostgreSQL with JSON columns for flexible attributes"
      rationale: "Strong consistency with flexibility for evolving user schemas"
```

**Decisions Generation Process:**
1. **Technology Analysis**: Extract technology choices from package.json, dependencies, and configuration files
2. **Architecture Pattern Detection**: Identify design patterns from code structure and organization
3. **Historical Context**: Use git history to understand when major technical decisions were made
4. **Trade-off Documentation**: Infer decision rationale from code comments and commit messages

## Success Criteria

- [ ] Complete codebase feature inventory generated
- [ ] All major components mapped to CARL files
- [ ] Dependencies accurately identified and documented
- [ ] Current implementation state captured
- [ ] Technical debt and gaps identified
- [ ] Next development priorities recommended
- [ ] **Strategic context files generated (mission.carl, roadmap.carl, decisions.carl)**
- [ ] **Product vision and business goals documented**
- [ ] **Development phases and priorities mapped**
- [ ] **Architectural decisions captured and rationalized**
- [ ] CARL index updated with strategic file references
- [ ] Team synchronization gaps resolved

## Integration Points

- **Input**: Existing codebase, git history, optional scope parameters
- **Output**: Complete CARL file structure, analysis report, recommendations
- **Next Commands**:
  - `/plan [discovered-feature]` to enhance incomplete features
  - `/task [technical-debt-item]` to address identified issues
  - `/status` to monitor progress on analyzed features

This command makes CARL adoption seamless for existing projects and ensures the system stays synchronized with team development patterns.