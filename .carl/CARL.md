# CARL - Context-Aware Requirements Language

CARL helps you plan and execute software development work with intelligent AI assistance.

## Quick Start

### 1. Initialize Your Project
```bash
/carl:analyze
```
This sets up your project foundation and detects your technology stack.

### 2. Plan Your Work
```bash
/carl:plan "Add user authentication system"
```
Creates structured work items (epics → features → stories).

### 3. Execute Work
```bash
/carl:task user-auth.epic.carl
```
Intelligently executes work with dependency analysis and quality gates.

### 4. Monitor Progress
```bash
/carl:status
```
View project health, progress, and session analytics.

## Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/carl:analyze` | Project foundation setup | `/carl:analyze` |
| `/carl:plan` | Create work items | `/carl:plan "Add payment system"` |
| `/carl:task` | Execute work | `/carl:task payment.feature.carl` |
| `/carl:status` | Progress dashboard | `/carl:status` |

## Rapid Prototyping

For quick implementation without detailed breakdown:
```bash
/carl:task user-auth.epic.carl --yolo
```
⚠️ Creates technical debt - use for prototypes only.

## File Structure

```
.carl/
├── project/
│   ├── epics/           # High-level business goals
│   ├── features/        # User-facing functionality  
│   ├── stories/         # Implementation tasks
│   └── technical/       # Technical work & debt
├── sessions/            # Daily development tracking
└── schemas/             # Validation rules
```

## Work Item Types

- **Epic**: Large business initiative (months)
- **Feature**: User-facing capability (weeks)  
- **Story**: Implementation task (days)
- **Technical**: Architecture, refactoring, or debt

## Getting Help

- **Documentation**: [Full CARL Guide](https://github.com/ClaytonHunt/carl)
- **Issues**: [Report Problems](https://github.com/ClaytonHunt/carl/issues)
- **Examples**: Check `.carl/sessions/` for your usage patterns

## Tips

1. **Start Small**: Begin with `/carl:analyze` to understand your project
2. **Plan First**: Use `/carl:plan` before jumping into implementation
3. **Check Status**: Regular `/carl:status` keeps you informed
4. **Review Sessions**: Your `.carl/sessions/` files show development patterns
5. **Use Yolo Sparingly**: `--yolo` is for prototypes, not production code

---

*CARL integrates with Claude Code to provide intelligent, context-aware development assistance.*