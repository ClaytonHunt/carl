---
description: Trigger multi-step deployment workflow with validation
allowed-tools: Bash, Read, Write, Grep, AskUserQuestion
argument-hint: [environment]
---

# Deployment Workflow Command

Orchestrate a multi-step deployment workflow with validation checkpoints and rollback capabilities.

## Purpose

This command demonstrates a complex workflow pattern with:
- Sequential steps with dependencies
- Validation at each stage
- User confirmation for critical operations
- Error handling and rollback
- Status reporting

## Variables

- `${ENVIRONMENT}` - Target environment (`dev`, `staging`, `production`)

## Instructions

Execute the following deployment workflow for `${ENVIRONMENT}` environment:

### Step 1: Pre-Deployment Validation

1. **Check Git Status**
   ```bash
   git status
   ```
   - Verify working directory is clean
   - Confirm on correct branch for environment
   - Error if uncommitted changes

2. **Run Tests**
   ```bash
   npm test
   ```
   - All tests must pass
   - Stop deployment if any failures
   - Report failed tests to user

3. **Check Dependencies**
   ```bash
   npm audit
   ```
   - Report critical vulnerabilities
   - Warn on high-severity issues
   - Continue after user review

### Step 2: Build

1. **Clean Previous Build**
   ```bash
   rm -rf dist/
   ```

2. **Build Application**
   ```bash
   npm run build
   ```
   - Monitor for build errors
   - Stop if build fails
   - Report compilation warnings

3. **Verify Build Output**
   - Check `dist/` directory exists
   - Validate expected files present
   - Check bundle sizes

### Step 3: Version Management

1. **Read Current Version**
   - Read `package.json` to get current version
   - Determine next version based on semver

2. **Update Version**
   - For `production`: Increment version
   - For `staging`: Use pre-release tag
   - For `dev`: Use build number

3. **Create Git Tag**
   ```bash
   git tag -a v${VERSION} -m "Release v${VERSION}"
   ```

### Step 4: Deployment Confirmation

Use AskUserQuestion tool to confirm:
```
Question: Ready to deploy version ${VERSION} to ${ENVIRONMENT}?
Options:
  - Proceed with deployment
  - Cancel deployment
  - Review changes first
```

If user selects "Review changes":
- Show git diff since last deployment
- Show changelog
- Ask for confirmation again

If user cancels:
- Stop workflow
- Report cancellation
- Provide rollback instructions

### Step 5: Deploy

1. **Execute Deployment**
   ```bash
   npm run deploy:${ENVIRONMENT}
   ```

2. **Monitor Deployment**
   - Watch for errors
   - Report progress
   - Capture deployment logs

3. **Verify Deployment**
   - Check deployment succeeded
   - Verify service health
   - Run smoke tests

### Step 6: Post-Deployment

1. **Update Changelog**
   - Read CHANGELOG.md
   - Add entry for this deployment
   - Write updated file

2. **Push Git Tags**
   ```bash
   git push origin v${VERSION}
   ```

3. **Notify Stakeholders**
   - Report successful deployment
   - Provide deployment summary
   - Include rollback instructions

### Step 7: Rollback (If Failure)

If any step fails:
1. Report failure clearly
2. Preserve error logs
3. Provide rollback command:
   ```bash
   npm run rollback:${ENVIRONMENT} -- --to=${PREVIOUS_VERSION}
   ```
4. Document what went wrong
5. Suggest corrective actions

## Example Usage

```bash
# Deploy to development
/workflow-trigger dev

# Deploy to staging
/workflow-trigger staging

# Deploy to production (requires extra confirmation)
/workflow-trigger production
```

## Expected Output

```
🚀 Starting deployment workflow for: staging

✓ Step 1: Pre-Deployment Validation
  ✓ Git status: Clean
  ✓ Tests: All 127 tests passed
  ⚠ Dependencies: 2 high-severity warnings (reviewed)

✓ Step 2: Build
  ✓ Clean: dist/ removed
  ✓ Build: Completed in 34s
  ✓ Validation: All expected files present

✓ Step 3: Version Management
  Current: 1.4.2
  Next: 1.5.0-staging.1
  ✓ Tagged: v1.5.0-staging.1

⏸ Step 4: Confirmation
  Waiting for user confirmation...

[User confirms]

✓ Step 5: Deploy
  ✓ Deployment: Completed in 2m 14s
  ✓ Health check: All services healthy
  ✓ Smoke tests: Passed

✓ Step 6: Post-Deployment
  ✓ Changelog updated
  ✓ Tags pushed
  ✓ Notifications sent

🎉 Deployment successful!

Summary:
- Version: 1.5.0-staging.1
- Environment: staging
- Duration: 3m 12s
- Deployed by: user@example.com
- Rollback command: npm run rollback:staging -- --to=1.4.2
```

## Notes

- **Environment-Specific Logic**: Production has extra validation
- **User Confirmation**: Critical operations require explicit approval
- **Error Handling**: Each step validates before proceeding
- **Rollback Ready**: Always provide rollback instructions
- **Observable**: Clear progress reporting at each step
- **Idempotent**: Can be re-run safely (with version bump)

## Safety Considerations

### Production Deployments
- Require additional confirmation
- Run extended test suite
- Check for active users
- Schedule during maintenance window
- Have rollback plan ready

### All Deployments
- Never deploy with uncommitted changes
- Always run full test suite
- Validate build output
- Monitor deployment progress
- Verify post-deployment health

## Error Handling

| Error Type | Action | Rollback |
|------------|--------|----------|
| Test failure | Stop immediately | Not needed |
| Build failure | Stop immediately | Not needed |
| Deployment failure | Stop, preserve state | Automatic |
| Health check failure | Alert, wait | Manual decision |
| Smoke test failure | Alert, rollback option | User decides |

## Related

- Command: `/rollback` - Manual rollback to previous version
- Command: `/health-check` - Verify deployment health
- Skill: `deployment-monitoring` - Monitor deployment metrics
- Hook: `PreToolUse[Bash]` - Validate bash commands before execution
