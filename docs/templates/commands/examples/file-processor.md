---
description: Process and transform files matching a pattern
allowed-tools: Read, Write, Edit, Grep, Glob
argument-hint: [glob-pattern] [operation]
---

# File Processor Command

Process multiple files matching a glob pattern and apply transformations.

## Purpose

This command demonstrates a medium-complexity file operation pattern. It finds files matching a pattern, applies transformations, and reports results. Useful for batch operations on code files.

## Variables

- `${FILE_PATTERN}` - Glob pattern to match files (e.g., `**/*.ts`, `src/**/*.md`)
- `${OPERATION}` - Operation to perform (`format`, `lint`, `update-headers`, `extract-comments`)

## Instructions

When this command is invoked, perform the following workflow:

### Step 1: File Discovery
1. Use the Glob tool to find all files matching `${FILE_PATTERN}`
2. Validate that files were found (error if no matches)
3. Display count and sample of files to process

### Step 2: Read and Analyze
1. Use Read tool to examine first file as a sample
2. Determine the specific transformation needed for `${OPERATION}`
3. Confirm operation is safe and reversible

### Step 3: Process Files
For each file:
1. Read current contents
2. Apply transformation based on `${OPERATION}`:
   - **format**: Apply consistent formatting (indentation, spacing)
   - **lint**: Check for common issues and fix auto-fixable ones
   - **update-headers**: Add/update file headers with copyright, description
   - **extract-comments**: Pull all comments into summary document
3. Use Edit or Write tool to save changes
4. Track successes and failures

### Step 4: Report Results
Display summary:
- Total files processed
- Files successfully transformed
- Files with errors (if any)
- Sample of changes made
- Suggested next steps

## Example Usage

```bash
# Format all TypeScript files
/file-processor "**/*.ts" format

# Update headers in all JavaScript files
/file-processor "src/**/*.js" update-headers

# Extract comments from markdown files
/file-processor "docs/**/*.md" extract-comments
```

## Expected Output

```
Processing files matching: **/*.ts

Found 47 files to process

Processing files:
✓ src/utils/helper.ts
✓ src/components/Button.ts
✓ src/services/api.ts
...

Summary:
- Total files: 47
- Successfully processed: 45
- Errors: 2
  - src/broken/file.ts: Parse error
  - src/old/legacy.ts: Permission denied

Sample changes:
- Normalized indentation to 2 spaces
- Added trailing semicolons
- Organized imports

Next steps:
- Review changes with git diff
- Run tests to verify no breakage
- Commit changes
```

## Notes

- **Tool Restrictions**: Limited to file operations (Read, Write, Edit, Grep, Glob) for safety
- **No Bash**: Prevents accidental deletion or system commands
- **Idempotent**: Running multiple times should be safe
- **Reversible**: Changes can be reverted via git
- **Validation**: Always read before writing to prevent corruption

## Safety Considerations

- Preview changes before applying
- Validate file contents after read
- Check file permissions
- Handle errors gracefully
- Report all failures clearly
- Never process files in `.git/`, `node_modules/`, or similar directories

## Related

- Command: `/file-analyzer` - Analyze files without modification
- Skill: `code-formatter` - Specialized formatting capabilities
- Tool: Glob - Pattern matching for file discovery
