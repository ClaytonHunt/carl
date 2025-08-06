# Analyze Command - Agent Creation Mode

Creates missing project-specific agents based on detected technology stack.

## Prerequisites Check

- [ ] Foundation files missing (vision.carl, process.carl, roadmap.carl)
- [ ] Technology stack detected in project
- [ ] Required project agents are missing

## Agent Creation Process Checklist

### Technology Stack Detection
- [ ] Use Glob to find technology indicators:
  - [ ] `**/{package.json,yarn.lock,pnpm-lock.yaml}` (Node.js)
  - [ ] `**/{requirements.txt,setup.py,pyproject.toml}` (Python)
  - [ ] `**/{Cargo.toml,Cargo.lock}` (Rust)
  - [ ] `**/{pom.xml,build.gradle,*.csproj}` (JVM/.NET)
  - [ ] `**/{Dockerfile,docker-compose.yml}` (Containers)
  - [ ] `**/{*.tf,*.tfvars}` (Infrastructure)

### Framework Detection
- [ ] Use Grep to identify specific frameworks and libraries:
  - [ ] JavaScript: react, vue, @angular/core, next, express
  - [ ] Python: django, flask, fastapi
  - [ ] Database: prisma, typeorm, mongoose, pg, redis
  - [ ] Testing: jest, pytest, playwright
  - [ ] Cloud: aws-sdk, @azure, @google-cloud

### Technology Profile Building
- [ ] Map detected files to technology types
- [ ] Identify primary language(s)
- [ ] Determine framework stack
- [ ] Detect database technologies
- [ ] Identify deployment/infrastructure tools
- [ ] Build comprehensive technology profile

### Agent Gap Analysis
- [ ] Map technologies to required project agent types:
  - [ ] Languages: project-typescript, project-python, project-rust
  - [ ] Frontend: project-react, project-vue, project-angular
  - [ ] Backend: project-express, project-django, project-fastapi
  - [ ] Database: project-postgresql, project-mongodb, project-redis
  - [ ] Deployment: project-docker, project-kubernetes, project-aws
  - [ ] Testing: project-jest, project-pytest, project-playwright

- [ ] Check existing agents in `.claude/agents/project-*.md`
- [ ] Identify missing agents needed for comprehensive analysis
- [ ] Prioritize agents by importance to project

### Batch Agent Creation
- [ ] For each missing critical agent:
  - [ ] Use Task tool with carl-agent-builder subagent
  - [ ] Provide technology-specific context and requirements
  - [ ] Validate agent creation success
  - [ ] Add agent to project agent inventory

### Restart Instructions
- [ ] Provide clear restart command: `claude --resume`
- [ ] Explain why restart is needed (agent loading)
- [ ] Confirm next step is to run `/carl:analyze` again
- [ ] **STOP EXECUTION** - do not proceed to foundation creation

## Success Criteria

✅ **Complete Detection**: All major technologies identified  
✅ **Agent Coverage**: Critical project agents created  
✅ **Clear Instructions**: Restart guidance provided  
✅ **No Continuation**: Execution stops after agent creation

## Output Format

```
🔍 No foundation detected - analyzing technology stack...
📊 Technology Profile:
   Languages: TypeScript, Python
   Frontend: React with Next.js
   Backend: Express.js, FastAPI
   Database: PostgreSQL, Redis
   Deployment: Docker, AWS

🤖 Creating missing project agents:
✅ project-react.md (React patterns and best practices)
✅ project-typescript.md (TypeScript utilities and patterns)  
✅ project-express.md (Express.js API patterns)
✅ project-postgresql.md (Database schema and query patterns)
✅ project-docker.md (Container and deployment patterns)

🔄 **Next Step**: Restart Claude Code and run /carl:analyze again
   New agents need to be loaded for comprehensive project analysis.

   Command: claude --resume
   Then: /carl:analyze
```

## Agent Creation Specifications

### Agent Requirements Per Technology

**Node.js/TypeScript Projects**:
- project-nodejs.md (runtime and tooling patterns)
- project-typescript.md (type system and compilation)
- Frontend framework agent (react/vue/angular)
- Testing framework agent (jest/vitest)

**Python Projects**:
- project-python.md (language patterns and tooling)
- Framework agent (django/flask/fastapi)
- project-pytest.md (testing patterns)

**Database Projects**:
- Specific database agent (postgresql/mongodb/redis)
- ORM/query builder agent if detected

**Deployment Projects**:
- project-docker.md for containerized apps
- Cloud provider agent (aws/azure/gcp) if detected

## Error Handling

### Technology Detection Failures
- [ ] If no technology stack detected → Switch to Interactive Mode
- [ ] If partial detection → Create agents for detected technologies
- [ ] If uncertain detection → Prompt user for clarification

### Agent Creation Failures  
- [ ] Report specific agent creation failures
- [ ] Continue with successfully created agents
- [ ] Provide manual agent creation guidance for failures
- [ ] Still require restart even if some agents failed

### Recovery Process
- [ ] Log all detection results for debugging
- [ ] Provide fallback instructions if agent creation fails
- [ ] Allow manual override of technology detection
- [ ] Give guidance on creating agents manually if needed