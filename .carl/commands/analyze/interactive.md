# Analyze Command - Interactive Planning Mode

Gather project requirements through guided user interview when no technology stack is detected.

## Prerequisites Check

- [ ] Foundation files missing (vision.carl, process.carl, roadmap.carl)
- [ ] No technology stack detected in project
- [ ] Project appears to be in early planning/setup phase

## Interactive Planning Process Checklist

### Existing Information Analysis
- [ ] Read `CLAUDE.md` for project description and goals
- [ ] Read `README.md` for additional context and setup instructions
- [ ] Scan `docs/` directory for specifications or requirements
- [ ] Check for any configuration files that might indicate technology intent
- [ ] Extract hints about intended technology, features, scope, and timeline

### Context Presentation
- [ ] Summarize what was learned from existing documentation
- [ ] Present understanding back to user for confirmation
- [ ] Identify gaps that need to be filled through questions
- [ ] Set expectations for the interview process

### Essential Requirements Gathering

#### Technology Stack Questions
- [ ] **Primary Technology**: "What technology stack are you planning to use?"
  - Provide examples: Node.js/Express, Python/Django, Java/Spring, etc.
  - Explain impact on development workflow and tooling
- [ ] **Application Type**: "What type of application is this?"
  - Options: API service, web application, CLI tool, library, mobile app
- [ ] **Database Requirements**: "What data storage needs do you have?"
  - Options: PostgreSQL, MongoDB, SQLite, file-based, none

#### Project Scope Questions  
- [ ] **Target Users**: "Who are the primary users or consumers?"
  - Internal team, external customers, other developers, etc.
- [ ] **Core Features**: "What are the main features or capabilities?"
  - List 3-5 primary features for MVP scope
- [ ] **Success Definition**: "How will you know this project is successful?"
  - Measurable outcomes, user adoption, performance targets

#### Development Constraints
- [ ] **Timeline**: "Do you have any timeline goals or milestones?"
  - MVP target date, feature delivery phases, demo dates
- [ ] **Technical Constraints**: "Any specific requirements or limitations?"
  - Performance needs, security requirements, compliance, integrations
- [ ] **Team Structure**: "Who will be working on this project?"
  - Solo developer, small team, distributed team

### Response Processing and Validation
- [ ] Validate technology stack choices make sense for stated goals
- [ ] Identify any missing critical technologies
- [ ] Suggest additional technologies that might be needed
- [ ] Confirm understanding of requirements before proceeding

### Foundation Generation Strategy
- [ ] Based on gathered requirements:
  - [ ] Determine which project agents need to be created
  - [ ] Map technology choices to CARL agent requirements
  - [ ] Plan foundation file content structure
  - [ ] Identify any additional setup requirements

### Schema-Compliant Artifact Generation
- [ ] Generate **vision.carl** following `.carl/schemas/vision.schema.yaml`:
  - [ ] vision_statement: Clear project purpose statement
  - [ ] strategic_goals: List of measurable objectives
  - [ ] success_metrics: Quantifiable success indicators
  - [ ] target_audience: User/consumer descriptions
  - [ ] core_values: Technical principles and constraints

- [ ] Generate **roadmap.carl** following `.carl/schemas/roadmap.schema.yaml`:
  - [ ] phases: Development phases with timelines
  - [ ] epics: High-level feature groupings
  - [ ] milestones: Key delivery targets
  - [ ] dependencies: External blockers or requirements

- [ ] Generate **process.carl** following `.carl/schemas/process.schema.yaml`:
  - [ ] methodology: Development approach (TDD, Agile, etc.)
  - [ ] test_commands: Framework-specific testing setup
  - [ ] quality_gates: Coverage and quality requirements
  - [ ] build_process: Compilation and deployment steps

### Agent Creation Planning
- [ ] Create missing project agents based on technology choices:
  - [ ] Language agents (project-typescript, project-python, etc.)
  - [ ] Framework agents (project-react, project-express, etc.)
  - [ ] Database agents (project-postgresql, project-mongodb, etc.)
  - [ ] Infrastructure agents (project-docker, project-aws, etc.)

### Graceful Fallback Handling
- [ ] If user is unsure about technology → Suggest popular, well-supported stacks
- [ ] If requirements are vague → Create flexible foundation that can evolve
- [ ] If timeline is unclear → Use standard development phase estimates
- [ ] If constraints are complex → Note for future refinement

## Success Criteria

✅ **Complete Requirements**: All essential project information gathered  
✅ **Technology Clarity**: Clear technology stack decisions made  
✅ **Foundation Generated**: Schema-compliant CARL files created  
✅ **Agent Coverage**: Required project agents identified and created

## Interactive Flow Example

```
🔍 No technology stack detected. Let's plan your project foundation.

📄 From your documentation, I understand this is:
   A task management API with user authentication, task categorization, 
   and search capabilities. The README mentions REST API design but 
   no technology stack is specified.

Let me ask a few questions to create your CARL foundation:

❓ What technology stack are you planning to use?
   Examples: Node.js/Express, Python/Django, Java/Spring, Go/Gin
   
→ User: "Node.js with TypeScript and Express, using PostgreSQL"

❓ What type of application is this primarily?
   • RESTful API service
   • GraphQL API  
   • Web application with UI
   • CLI tool or library
   
→ User: "RESTful API service"

❓ Who are the primary users of this API?
   • Mobile app developers
   • Web frontend developers  
   • Third-party integrators
   • Internal microservices
   
→ User: "Mobile app developers and a web frontend"

❓ What are the core features for your MVP?
   Please list 3-5 main capabilities:
   
→ User: "User registration/login, create/edit tasks, task categories, basic search"

❓ How will you measure success for this project?
   Examples: User adoption, API response time, feature completion
   
→ User: "Support 1000+ daily active users, <200ms API response time"

❓ Any timeline goals or technical constraints?
   
→ User: "MVP in 8 weeks, need to integrate with mobile push notifications"

✅ Perfect! Based on your requirements, I'll create:

📊 Technology Profile:
   • Runtime: Node.js with TypeScript
   • Framework: Express.js 
   • Database: PostgreSQL
   • Additional: Push notification integration

📄 Generating CARL foundation:
✅ vision.carl → Task management API with mobile-first design
✅ roadmap.carl → 3 phases: MVP (8 weeks), Mobile Integration, Advanced Features  
✅ process.carl → TDD with Jest, 85% coverage, API documentation

🤖 Creating required project agents:
✅ project-nodejs.md → Node.js runtime and tooling patterns
✅ project-typescript.md → Type system and build configuration
✅ project-express.md → Express.js API patterns and middleware
✅ project-postgresql.md → Database schema and query optimization

🔄 Next Step: Restart Claude Code to load new agents
   Command: claude --resume
   Then: /carl:analyze (will complete foundation setup)
```

## Question Customization by Project Type

### API/Backend Projects
Focus on: data models, authentication, API design, performance, integrations

### Web Applications
Focus on: user experience, frontend frameworks, state management, SEO, accessibility

### CLI Tools
Focus on: command structure, configuration, distribution, platform compatibility

### Libraries
Focus on: API design, documentation, testing, versioning, distribution

## Error Handling

### User Uncertainty
- [ ] Provide common examples for each technology choice
- [ ] Explain trade-offs between different options  
- [ ] Offer to start with flexible defaults that can be changed later
- [ ] Give guidance on how to research technology decisions

### Incomplete Responses
- [ ] Use reasonable defaults for skipped questions
- [ ] Note assumptions in generated foundation files
- [ ] Provide guidance on updating foundation files later
- [ ] Ensure foundation is still functional with partial information

### Technology Mismatch
- [ ] Validate that chosen technologies work well together
- [ ] Warn about potential integration challenges
- [ ] Suggest alternatives if choices seem problematic
- [ ] Allow user to reconsider decisions before proceeding

## Quality Assurance

### Question Quality
- [ ] Questions are clear and provide sufficient context
- [ ] Examples are relevant and helpful
- [ ] Default suggestions are sensible for most projects
- [ ] Follow-up questions clarify ambiguous responses

### Foundation Quality
- [ ] Generated vision aligns with stated goals
- [ ] Roadmap phases are realistic for stated timeline
- [ ] Process configuration matches chosen technology stack
- [ ] Success metrics are measurable and appropriate