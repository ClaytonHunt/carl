---
description: Example command that greets the user
argument-hint: [name]
---

# Example Command

This is a simple example command that demonstrates the basic structure of a custom slash command in a plugin.

## Purpose

Greet the user by name and demonstrate command parameter usage.

## Variables

- `${NAME}` - The name to greet (from first argument, or "World" if not provided)

## Instructions

Greet the user with a friendly message.

### Step 1: Get the Name
Extract the name from `$1` (first argument). If no argument provided, use "World".

### Step 2: Generate Greeting
Create a personalized greeting message that includes:
- A friendly hello
- The provided name
- Current date and time
- A tip about using this plugin

### Step 3: Display Response
Show the greeting in a clear, friendly format.

## Example Usage

```bash
# Basic usage
/minimal-plugin:example-command

# With name parameter
/minimal-plugin:example-command Alice

# With full name
/minimal-plugin:example-command "Alice Smith"
```

## Expected Output

A friendly greeting message like:

```
Hello, Alice! 👋

Current time: [timestamp]

This is an example command from the minimal-plugin.
You can customize this command or create new ones in the commands/ directory.

Happy coding!
```

## Notes

- This is a simple demonstration command
- Modify this file to create your own custom commands
- Commands in plugins are invoked with the pattern: `/plugin-name:command-name`
- Subdirectories in commands/ don't affect the command name
