# Analyze Command - Sync Mode

Quick update check for established projects with existing foundation.

## Prerequisites Check

- [ ] `.carl/project/vision.carl` exists
- [ ] `.carl/project/process.carl` exists  
- [ ] `.carl/project/roadmap.carl` exists
- [ ] All foundation files are schema-compliant

## Sync Process Checklist

### Change Detection
- [ ] Compare file timestamps (package.json vs process.carl)
- [ ] Check for new dependency files (requirements.txt, Cargo.toml, etc.)
- [ ] Scan for removed technology indicators
- [ ] Detect new framework usage in codebase

### Agent Inventory Verification
- [ ] Load current foundation files to understand declared technologies
- [ ] Scan codebase for any new technology patterns
- [ ] Verify project agents still match current stack
- [ ] Identify any new agents needed for detected technologies

### Minimal Update Process
- [ ] Update only files that show actual changes
- [ ] Preserve existing foundation content where appropriate
- [ ] Add new technology agents if needed
- [ ] Update process.carl with new test commands if detected

### Validation and Feedback
- [ ] Validate all updated files against schemas
- [ ] Report specific changes made
- [ ] Provide performance timing (target: <2 seconds)
- [ ] Give clear next step guidance

## Success Criteria

✅ **Fast Execution**: Complete within 2 seconds  
✅ **Minimal Changes**: Only update what actually changed  
✅ **Clear Feedback**: Report exactly what was updated  
✅ **Ready State**: Confirm project is ready for planning

## Output Format

```
⚡ Foundation exists - running sync check...
🔍 Checking for changes since last analysis...
✅ No changes detected (0.8s)
💡 Ready for planning with /carl:plan

OR

⚡ Foundation exists - running sync check...  
🔍 Checking for changes since last analysis...
📦 New dependency detected: Redis
🤖 Created project-redis.md agent
✅ Sync completed (1.2s)  
💡 Ready for planning with /carl:plan
```

## Error Handling

If sync mode fails:
- Fall back to foundation creation mode
- Report why sync was not possible
- Provide recovery guidance