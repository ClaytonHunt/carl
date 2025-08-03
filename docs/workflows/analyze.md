# /carl:analyze - Project Understanding & Foundation Setup

**Purpose**: Understand project fundamentals and establish CARL strategic foundation

## Process

1. **Technology Stack Analysis**: Identify languages, frameworks, build tools, testing patterns
2. **Architecture Pattern Recognition**: Detect MVC, microservices, monolith, API patterns, etc.
3. **Development Pattern Discovery**: TDD practices, deployment patterns, code organization
4. **Utility and Library Assessment**: Key dependencies, custom utilities, integration patterns
5. **Interactive Validation**: Present findings to developer for confirmation and refinement
6. **Strategic Artifact Generation**: Create/update `vision.carl`, `roadmap.carl`, `process.carl`
   - **Monorepo Detection**: Automatically identifies multiple applications and creates per-app process sections
   - **Process Customization**: Each app gets appropriate test commands and coverage goals
7. **Specialized Agent Creation**: Generate project-specific agents based on technology stack (see Agent Architecture section)

## Modes

- `--sync`: Detect code changes that affect strategic artifacts or require new agents
- `--comprehensive`: Deep analysis with full technology assessment and interactive validation