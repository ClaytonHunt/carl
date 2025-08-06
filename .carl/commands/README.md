# CARL Commands Directory Structure

This directory contains modular command logic organized for reusability and maintainability across all CARL commands.

## Directory Structure

```
.carl/commands/
├── lib/                       # Executable shell script libraries
│   ├── foundation-validation.sh   # CARL foundation validation functions
│   ├── work-item-validation.sh    # Work item schema and content validation
│   ├── error-handling.sh          # Standardized error messaging and recovery
│   └── progress-tracking.sh       # Work item progress and session tracking
├── shared/                    # Documentation and reference materials
│   ├── foundation-validation.md   # Usage docs for foundation validation
│   ├── work-item-validation.md    # Usage docs for work item validation
│   ├── dependency-validation.md   # Dependency analysis documentation
│   ├── error-handling.md          # Error handling usage guide
│   ├── progress-tracking.md       # Progress tracking usage guide
│   └── rollback-operations.md     # Recovery and rollback documentation
├── analyze/                   # /carl:analyze command modules
│   ├── sync.md                    # Quick update check for existing foundations
│   ├── agent-creation.md          # Create missing project agents
│   ├── foundation-creation.md     # Generate CARL foundation files
│   └── interactive.md             # Guided project setup interview
├── plan/                      # /carl:plan command modules
│   ├── new-item.md                # Create new work items from requirements
│   └── breakdown.md               # Break down existing items into children
├── status/                    # /carl:status command modules
│   ├── default.md                 # Project health dashboard
│   ├── historical.md              # Trend analysis and historical insights
│   ├── work-item.md               # Detailed work item analysis
│   └── standup.md                 # Daily standup format
├── task/                      # /carl:task command modules
│   ├── epic-execute.md            # Epic execution logic
│   ├── feature-execute.md         # Feature execution logic  
│   ├── story-execute.md           # Story execution logic
│   ├── technical-execute.md       # Technical work execution logic
│   └── yolo-execute.md            # Rapid prototype execution mode
└── README.md                  # This file
```

## Architecture Overview

### Two-Layer Design

**1. Executable Libraries (`lib/`)**
- Shell scripts with reusable bash functions
- Sourced by CARL commands: `source .carl/commands/lib/script-name.sh`
- Optimized for context efficiency and code reusability
- Use relative paths from project root directory

**2. Documentation Modules (`shared/`, command folders)**
- Markdown files with usage guidance and checklists
- Referenced by commands for process flows and validation steps
- Lightweight documentation that references executable libraries
- Contains detailed process checklists and validation requirements

## Usage Patterns

### Command Structure
Each CARL command follows a consistent checklist-driven structure:

1. **Load Executable Libraries** - Source shell scripts from `lib/`
2. **Validate Prerequisites** - Use shared validation functions
3. **Determine Mode** - Route to appropriate command module
4. **Execute Mode** - Follow mode-specific checklist process
5. **Validate Results** - Ensure quality and provide next steps

### Library Integration
Commands source executable libraries at startup:
```bash
# In command markdown files
- [ ] Source foundation validation: `source .carl/commands/lib/foundation-validation.sh`
- [ ] Source error handling: `source .carl/commands/lib/error-handling.sh`
- [ ] Source progress tracking: `source .carl/commands/lib/progress-tracking.sh`
```

### Function Usage
After sourcing libraries, functions are available:
```bash
# Example usage
validate_carl_foundation
handle_validation_error "foundation_missing" "Missing .carl directory" "" "analyze"
update_work_item_progress "path/to/item.carl" 50 "implementation"
```

## Library Functions

### Foundation Validation (`foundation-validation.sh`)
- `validate_carl_foundation()` - Check CARL directory structure
- `validate_schemas()` - Ensure required schema files exist
- `validate_git_state()` - Check git repository configuration
- `create_foundation_structure()` - Create missing directories

### Work Item Validation (`work-item-validation.sh`)
- `validate_work_item_file()` - Check file structure and content
- `validate_epic_fields()` - Epic-specific field validation
- `validate_feature_fields()` - Feature-specific field validation
- `validate_story_fields()` - Story-specific field validation
- `validate_technical_fields()` - Technical work item validation
- `validate_naming_conventions()` - File and ID naming standards

### Error Handling (`error-handling.sh`)
- `handle_validation_error()` - Standardized validation error messages
- `handle_execution_error()` - Execution failure error handling
- `show_warning()` - Non-blocking warning messages
- `show_info()` - Informational status messages

### Progress Tracking (`progress-tracking.sh`)
- `initialize_work_item_tracking()` - Start progress tracking
- `update_work_item_progress()` - Update completion percentage
- `complete_work_item()` - Mark work item as completed
- `calculate_duration()` - Time calculation utilities
- `get_current_session_file()` - Session file path resolution

## Benefits

### Context Efficiency
- **Reduced Token Usage**: Commands reference lightweight shell scripts instead of large bash code blocks
- **Faster Loading**: Shell functions load once and remain available
- **Better Performance**: Less markdown parsing for executable code

### Code Quality
- **Reusability**: Functions shared across multiple commands
- **Testability**: Shell scripts can be tested independently
- **Maintainability**: Easier to debug and modify bash code in proper shell files
- **Consistency**: Standardized functions ensure uniform behavior

### Development Experience
- **Clear Separation**: Documentation vs executable code clearly separated
- **Better IDE Support**: Shell scripts get proper syntax highlighting and linting
- **Easier Debugging**: Shell scripts can be executed and tested individually
- **Version Control**: Changes to logic vs documentation can be tracked separately

## Naming Conventions

### File Naming
- **Library scripts**: kebab-case with `.sh` extension (`foundation-validation.sh`)
- **Command directories**: lowercase command name (`analyze/`, `plan/`, `status/`, `task/`)
- **Module files**: kebab-case descriptive names (`agent-creation.md`, `new-item.md`)
- **Documentation**: matches corresponding library name (`foundation-validation.md`)

### Function Naming
- **snake_case** for all function names
- **Descriptive names** indicating purpose and return type
- **Consistent prefixes** for related functions (e.g., `validate_*`, `handle_*`)

## Path Resolution

All libraries use relative paths from project root:
- Commands execute from project root directory
- Libraries use `.carl/` relative path prefix
- No dependency on `$CLAUDE_PROJECT_DIR` environment variable
- Consistent with slash command execution model

## Extension Guidelines

### Adding New Libraries
1. Create shell script in `.carl/commands/lib/` with executable permissions
2. Follow existing naming and function conventions
3. Add corresponding documentation in `.carl/commands/shared/`
4. Update this README with function descriptions

### Adding Command Modules
1. Create command-specific directory under `.carl/commands/`
2. Add mode-specific markdown files with checklist structure
3. Reference appropriate library functions for validation and processing
4. Update command files to reference new modules

This modular architecture ensures CARL commands are maintainable, efficient, and provide consistent user experience while enabling specialized functionality for different use cases.