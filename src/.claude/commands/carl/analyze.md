---
allowed-tools: Task(carl-architecture-analyst), Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-requirements-analyst), Task(carl-debt-analyst), Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep
description: Analyze codebase and generate comprehensive CARL files
argument-hint: [directory] | --comprehensive | --sync | --changes-only
---

# CARL Codebase Analysis Instructions

Analyze existing codebase and generate complete CARL (Context-Aware Requirements Language) file structure by:

## 1. Determine Analysis Scope
Based on `$ARGUMENTS`:
- **No arguments**: Full project analysis
- **--comprehensive**: Deep analysis with full feature mapping
- **--sync**: Update existing CARL files only
- **--changes-only**: Analyze only recent git changes
- **Directory path**: Analyze specific directory scope

## 2. Comprehensive Analysis First
Deploy core CARL analysts for thorough codebase analysis:

- **Task: carl-architecture-analyst** → "Analyze system architecture, identify patterns, and generate system.context.carl mapping component relationships"
- **Task: carl-backend-analyst** → "Catalog API endpoints, data models, and service dependencies. Generate backend.context.carl and api.state.carl files"  
- **Task: carl-frontend-analyst** → "Identify UI components, user workflows, and journeys. Generate frontend.context.carl and ui.state.carl files"
- **Task: carl-requirements-analyst** → "Extract implicit requirements from code patterns and generate feature.intent.carl files for discovered capabilities"
- **Task: carl-debt-analyst** → "Identify technical debt items, refactoring opportunities, and generate debt.state.carl tracking"

## 3. Post-Analysis Specialist Generation
After core analysis completes and generates rich `*.carl` files:

### Step 3A: Analyze Generated CARL Files
Review the content of created `*.carl` files to identify specialist domains:
- Frontend frameworks (React, Vue, Angular patterns in frontend.context.carl)
- Backend technologies (Django, Spring, Node.js patterns in backend.context.carl)  
- ML/AI components (model architectures, data pipelines in system.context.carl)
- Infrastructure patterns (microservices, containers in architecture files)

### Step 3B: Generate Project-Specific Specialists
Based on findings in `*.carl` files, create targeted specialist agents:
- **React components found** → Generate `carl-react-specialist` 
- **ML models detected** → Generate `carl-ml-analyst`
- **Microservices architecture** → Generate `carl-microservices-analyst` 
- **Security patterns** → Generate `carl-security-specialist`

### Step 3C: Persistent Specialist Team
Generated agents remain in `.claude/agents/` for ongoing project support:
- Future `/carl:plan` commands can leverage specialists
- Specialists develop project-specific expertise over time
- Re-running `/carl:analyze` updates specialists rather than recreating

## 3. Extract Project Intelligence
Automatic discovery of:
- **Features**: Directory structure analysis, route/controller mapping
- **Implementation State**: Code completion status, test coverage, documentation gaps
- **Dependencies**: Internal relationships, external integrations
- **Technical Debt**: Code quality issues, performance bottlenecks
- **Business Logic**: User workflows, business rules from code patterns

## 4. Generate CARL File Structure
Use CARL templates to create comprehensive documentation:

**Intent Files (.intent.carl)**: Use `.carl/templates/intent.template.carl`
- Feature purpose and business value
- Current implementation status
- Constraints and requirements
- Success criteria and acceptance

**State Files (.state.carl)**: Use `.carl/templates/state.template.carl`
- Implementation progress tracking
- Quality metrics and test coverage
- Technical debt identification
- Deployment and validation status

**Context Files (.context.carl)**: Use `.carl/templates/context.template.carl`
- Architectural relationships
- Dependencies and integration points
- Data flow mapping
- Technology decisions and constraints

## 5. Analyze Dependencies and Gaps
**Smart Analysis:**
- Parse import/require statements for internal dependencies
- Map database relationships and data flow
- Identify API endpoint dependencies and integrations
- Detect missing test coverage and documentation gaps
- Flag security vulnerabilities and performance issues

## 6. Update CARL System
After analysis completion:

1. **Update `.carl/index.carl`**: Add discovered features, tech stack, and architectural patterns
2. **Create Session Record**: Generate analysis session in `.carl/sessions/` with discoveries and recommendations
3. **Generate Strategic Files**: Create or update `.carl/mission.carl`, `.carl/roadmap.carl`, and `.carl/decisions.carl` using templates
4. **Link Relationships**: Establish cross-references between related CARL files

## 7. Generate Analysis Report
Provide comprehensive analysis summary:
- **Project Overview**: Type, scale, tech stack, CARL coverage
- **Feature Inventory**: Production, development, and planned features
- **Technical Debt**: Priority issues with effort estimates
- **Quality Metrics**: Test coverage, code quality, performance
- **Recommendations**: Immediate actions and strategic priorities

## Example Usage
- `/carl:analyze` → Full project analysis with all CARL files
- `/carl:analyze --sync` → Update existing CARL files after changes
- `/carl:analyze src/auth` → Analyze specific directory
- `/carl:analyze --comprehensive` → Deep analysis with strategic context

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

Perform comprehensive codebase analysis and generate complete CARL documentation structure optimized for AI-assisted development workflows.