# File Structure & Organization

## Directory Structure
```
.carl/
├── project/
│   ├── epics/           # Strategic initiatives (3-6 months)
│   │   └── completed/   # Completed epic files
│   ├── features/        # User capabilities (2-4 weeks)
│   │   └── completed/   # Completed feature files
│   ├── stories/         # Implementation tasks (2-5 days)
│   │   └── completed/   # Completed story files
│   ├── technical/       # Infrastructure & process (varies)
│   │   └── completed/   # Completed technical files
│   ├── vision.carl      # Strategic project vision
│   ├── roadmap.carl     # Development roadmap
│   ├── process.carl     # Team processes and standards
│   ├── active.work.carl # Current work queue and priorities
│   └── tech-debt.carl   # Technical debt tracking (TODO/FIXME/HACK comments)
├── sessions/            # Daily session tracking per developer
│   ├── session-YYYY-MM-DD-{user}.carl  # Daily files (7 days)
│   └── archive/         # Compacted: weekly → monthly → quarterly → yearly
└── schemas/             # CARL file schema definitions
    ├── epic.schema.yaml      # Epic file structure and validation rules
    ├── feature.schema.yaml   # Feature file structure and validation rules
    ├── story.schema.yaml     # Story file structure and validation rules
    ├── tech.schema.yaml      # Technical file structure and validation rules
    ├── active-work.schema.yaml  # Active work file structure
    ├── process.schema.yaml   # Process file structure and validation rules
    ├── session.schema.yaml   # Session file structure and validation rules
    └── tech-debt.schema.yaml # Technical debt file structure and validation rules
```

## Critical File Path Rules
**NEVER DEVIATE - Enforced by all agents**:
- Epic files: `.carl/project/epics/[name].epic.carl`
- Feature files: `.carl/project/features/[name].feature.carl`
- Story files: `.carl/project/stories/[name].story.carl`
- Technical files: `.carl/project/technical/[name].tech.carl`
- Completed items: Move completed work items to `completed/` subdirectory within scope directory

## Naming Conventions
- **Epic files**: `kebab-case-descriptive-name.epic.carl`
- **Feature files**: `kebab-case-descriptive-name.feature.carl`
- **Story files**: `kebab-case-descriptive-name.story.carl`
- **Technical files**: `kebab-case-descriptive-name.tech.carl`
- **IDs**: `snake_case_descriptive_id`
- **Scope directories**: `epics/`, `features/`, `stories/`, `technical/`

**Pattern Distinction**:
- **File names**: kebab-case for filesystem compatibility (`user-auth.epic.carl`)
- **Internal IDs**: snake_case for code/YAML compatibility (`user_auth_system`)