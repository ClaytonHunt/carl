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
Task: Architecture specialist (carl-architecture-analyst) - analyze system structure for CARL intent mapping, identify major components and their relationships, assess system boundaries for feature extraction
Task: Backend specialist (carl-backend-analyst) - catalog API endpoints for CARL context files, extract data models and business logic patterns, identify service dependencies
Task: Frontend specialist (carl-frontend-analyst) - identify UI components and user workflows for CARL intent files, extract user journeys and interaction patterns
Task: Database specialist (carl-database-analyst) - map database schema to CARL context relationships, identify data flow patterns for dependency analysis
Task: QA specialist (carl-quality-analyst) - assess existing test coverage for CARL state files, identify testing gaps and quality metrics
Task: Security specialist (carl-security-analyst) - evaluate security patterns for CARL compliance tracking, identify security constraints and requirements
Task: Requirements specialist (carl-requirements-analyst) - extract implicit requirements from code patterns, identify missing business rules and constraints
Task: Technical debt analyst (carl-debt-analyst) - identify technical debt items for CARL state tracking, assess refactoring opportunities and maintenance needs
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

## Success Criteria

- [ ] Complete codebase feature inventory generated
- [ ] All major components mapped to CARL files
- [ ] Dependencies accurately identified and documented
- [ ] Current implementation state captured
- [ ] Technical debt and gaps identified
- [ ] Next development priorities recommended
- [ ] CARL index updated for AI consumption
- [ ] Team synchronization gaps resolved

## Integration Points

- **Input**: Existing codebase, git history, optional scope parameters
- **Output**: Complete CARL file structure, analysis report, recommendations
- **Next Commands**:
  - `/plan [discovered-feature]` to enhance incomplete features
  - `/task [technical-debt-item]` to address identified issues
  - `/status` to monitor progress on analyzed features

This command makes CARL adoption seamless for existing projects and ensures the system stays synchronized with team development patterns.