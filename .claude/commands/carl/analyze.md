---
allowed-tools: Task(carl-agent-builder), Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS
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

## 2. Project Discovery and Analysis  
Discover project characteristics and generate appropriate specialists, following master process definition:
- **Load Master Process**: Read `.carl/system/master.process.carl` for authoritative analysis workflow
- **Follow Analysis Workflow**: Execute `carl_analyze` sequence from master process definition

### Step 2A: Initial Project Discovery
Use file system analysis to discover project patterns:
- **Technology Stack**: Identify languages, frameworks, and tools from file extensions and package files
- **Architecture Patterns**: Analyze directory structure for architectural insights
- **Domain Complexity**: Assess project size, scope, and technical complexity
- **Existing Documentation**: Review README, docs, and existing CARL files

### Step 2B: Generate Domain-Specific Specialists
Based on discovered project characteristics, create targeted specialist agents:

**Technology-Based Specialists:**
- **JavaScript/TypeScript projects** → Generate `carl-js-specialist`
- **Python projects** → Generate `carl-python-specialist`
- **Go projects** → Generate `carl-go-specialist`
- **Rust projects** → Generate `carl-rust-specialist`
- **Java projects** → Generate `carl-java-specialist`
- **Bash/Shell projects** → Generate `carl-bash-specialist`

**Framework-Based Specialists:**
- **React/Next.js** → Generate `carl-react-specialist`
- **Vue.js** → Generate `carl-vue-specialist`
- **Django/Flask** → Generate `carl-python-web-specialist`
- **Spring Boot** → Generate `carl-spring-specialist`
- **Docker/Kubernetes** → Generate `carl-containerization-specialist`

**Domain-Based Specialists:**
- **API services** → Generate `carl-api-specialist`
- **Database schemas** → Generate `carl-database-specialist`
- **ML/AI models** → Generate `carl-ml-specialist`
- **Mobile apps** → Generate `carl-mobile-specialist`
- **CLI tools** → Generate `carl-cli-specialist`
- **Audio/Media systems** → Generate `carl-audio-specialist`

### Step 2C: Deploy Generated Specialists
Each generated specialist performs targeted analysis:
- **Architecture Analysis**: Map system components and relationships
- **Feature Discovery**: Identify implemented, partial, and planned capabilities
- **Technical Debt Assessment**: Find improvement opportunities
- **Documentation Generation**: Create appropriate `.intent.carl`, `.state.carl`, and `.context.carl` files

## 3. Specialist-Driven Analysis
Generated specialists perform comprehensive project analysis:

### Intelligence Extraction
Each specialist automatically discovers:
- **Features**: Directory structure analysis, route/controller mapping, component hierarchies
- **Implementation State**: Code completion status, test coverage, documentation gaps
- **Dependencies**: Internal relationships, external integrations, package dependencies
- **Technical Debt**: Code quality issues, performance bottlenecks, outdated patterns
- **Business Logic**: User workflows, business rules from code patterns
- **Architecture Patterns**: Design patterns, architectural decisions, scalability considerations

### Technology-Specific Analysis
Specialists provide domain expertise:
- **Language-specific patterns**: Idioms, best practices, ecosystem conventions
- **Framework insights**: Configuration patterns, lifecycle management, plugin architectures
- **Tooling integration**: Build systems, testing frameworks, deployment pipelines
- **Performance characteristics**: Bottlenecks, optimization opportunities, scaling patterns

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

**Project Process Files (.carl/project/process.carl)**: Analyze project characteristics to create development workflow:
- **Methodology Detection**: Identify if project uses TDD (presence of test files), CI/CD (GitHub Actions, etc.), agile practices
- **Quality Standards**: Extract from existing linting configs, test requirements, code review patterns
- **Technology Patterns**: Document established patterns from codebase analysis
- **Security Practices**: Identify security patterns, authentication methods, data protection
- **Performance Requirements**: Extract from existing benchmarks, monitoring, or performance tests

## 5. Analyze Dependencies and Gaps
**Smart Analysis:**
- Parse import/require statements for internal dependencies
- Map database relationships and data flow
- Identify API endpoint dependencies and integrations
- Detect missing test coverage and documentation gaps
- Flag security vulnerabilities and performance issues

**Alignment Analysis:**
- If `.carl/project/vision.carl` exists, validate all discovered features against strategic alignment criteria
- Generate alignment scores for existing feature implementations
- Identify features that may represent unplanned strategic pivots
- Flag potential scope creep or misaligned development efforts
- Recommend feature prioritization based on alignment scoring

## 6. Update CARL System
After analysis completion:

1. **Update `.carl/project/vision.carl`**: Add discovered features, tech stack, and architectural patterns
2. **Create Session Record**: Generate analysis session in `.carl/sessions/` with discoveries and recommendations
3. **Generate Strategic Files**: Create or update `.carl/project/vision.carl`, `.carl/project/roadmap.carl`, and `.carl/decisions.carl` using templates
4. **Project Vision Discovery**: If no project vision exists, extract from existing docs OR initiate discovery session with key questions, then generate appropriate vision file
5. **Alignment Validation**: If project vision exists, validate all discovered features against alignment criteria and generate alignment report
6. **Create Project Process Definition**: Generate `.carl/project/process.carl` defining project-specific development workflow:
   - Development methodology (TDD, BDD, Agile, etc.)
   - Quality gates and standards
   - Testing requirements and coverage targets
   - Code review processes
   - Deployment workflow
   - Technical stack and patterns
   - Security and performance requirements
5. **Link Relationships**: Establish cross-references between related CARL files

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

---

**Link to detailed workflow:** `.carl/system/workflows/analyze.workflow.carl` (when needed)