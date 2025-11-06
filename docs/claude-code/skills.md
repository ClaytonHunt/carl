# Agent Skills Documentation for Claude Code

## Overview

Agent Skills extend Claude's capabilities through modular, discoverable capabilities. Each Skill consists of a `SKILL.md` file with instructions plus optional supporting resources like scripts and templates.

**Key distinction**: Skills are "model-invoked"—Claude autonomously determines when to use them based on request context, unlike slash commands which require explicit user invocation.

## Creating Skills

### Directory Structure

**Personal Skills** (individual use across projects):
```
~/.claude/skills/my-skill-name/
```

**Project Skills** (team shared, version controlled):
```
.claude/skills/my-skill-name/
```

**Plugin Skills** (bundled with installed plugins)

### Required SKILL.md Format

Each Skill requires YAML frontmatter with:
- `name`: lowercase alphanumeric and hyphens (max 64 characters)
- `description`: explains what the Skill does and when Claude should use it (max 1024 characters)

The description field is critical for discovery—it should specify both functionality and usage triggers.

## Supporting Files

Organize supplementary resources alongside SKILL.md:
```
my-skill/
├── SKILL.md (required)
├── reference.md
├── examples.md
├── scripts/
└── templates/
```

Claude loads additional files progressively as needed, optimizing context management.

## Tool Restrictions

Use the `allowed-tools` field to restrict capabilities:

```yaml
---
name: safe-file-reader
description: Read-only file access
allowed-tools: Read, Grep, Glob
---
```

This prevents Claude from using unauthorized tools without permission—useful for read-only or security-sensitive workflows.

## Skill Discovery & Testing

Claude automatically discovers Skills from all three sources. To verify availability:

```
What Skills are available?
```

Test Skills by asking questions matching your description. Claude activates relevant Skills autonomously based on context matching.

## Common Debugging Issues

**Vague descriptions prevent discovery**—specify both what the Skill does and usage triggers with concrete keywords users mention.

**Verify file paths**:
- Personal: `~/.claude/skills/skill-name/SKILL.md`
- Project: `.claude/skills/skill-name/SKILL.md`

**Check YAML syntax**: Invalid frontmatter prevents loading. Ensure proper `---` delimiters and correct indentation.

**Run debug mode**: `claude --debug` reveals loading errors.

## Team Sharing

**Recommended**: Distribute through plugins for managed distribution.

**Direct sharing**: Commit project Skills to git—they become automatically available when teammates pull updates.

## Best Practices

- Keep Skills focused on single capabilities
- Write specific, discovery-friendly descriptions with trigger keywords
- Test with team members for real-world validation
- Document version history for tracking changes
- Use forward slashes in file paths (Unix style)
- Keep scripts executable with proper permissions

## Updating & Removing

Edit SKILL.md directly; changes take effect on next Claude Code restart. Delete entire Skill directories to remove them, then commit changes for project Skills.
