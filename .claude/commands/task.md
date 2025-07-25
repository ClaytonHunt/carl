# CARL Task Execution

Context-aware task execution that leverages CARL (Context-Aware Requirements Language) files to provide perfect implementation context, automated progress tracking, and intelligent development assistance.

## Intelligent Task Context

CARL automatically loads relevant project context for every task, ensuring the AI has complete understanding of:

- **Current implementation state** from CARL state files
- **Feature requirements and constraints** from CARL intent files  
- **System relationships and dependencies** from CARL context files
- **Technical debt and quality considerations** from CARL analysis
- **Team patterns and established conventions** from project history

## Usage Scenarios

### 1. Context-Aware Task Execution
```bash
/task "implement user password reset"     # CARL loads authentication context automatically
/task "optimize analytics dashboard"     # CARL provides performance context and constraints
/task "fix mobile responsive layout"     # CARL loads UI patterns and design system context
```

### 2. CARL-Guided Implementation
```bash
/task --from-intent user-auth.intent     # Implement directly from CARL intent file
/task --continue session-xyz             # Resume previous CARL-tracked work session
/task --fix-debt auth-service-complexity # Address specific technical debt item
```

### 3. Collaborative Task Execution
```bash
/task --with-review "payment integration"  # Include code review checkpoints
/task --pair-program "complex algorithm"   # Enhanced assistance for complex tasks
/task --team-context "dashboard feature"   # Include team coordination context
```

## CARL Task Execution Process

### 1. Context Loading and Analysis
```pseudocode
FUNCTION load_carl_context_for_task(task_description):
    context = {}
    
    // Find relevant CARL files based on task description  
    relevant_intents = find_matching_intent_files(task_description)
    relevant_states = find_matching_state_files(task_description)
    relevant_contexts = find_matching_context_files(task_description)
    
    // Load comprehensive task context
    FOR EACH intent IN relevant_intents DO
        context.requirements.merge(load_intent_requirements(intent))
        context.constraints.merge(load_intent_constraints(intent))
        context.success_criteria.merge(load_success_criteria(intent))
    END FOR
    
    // Load current implementation state
    FOR EACH state IN relevant_states DO
        context.current_implementation = load_implementation_state(state)
        context.technical_debt = load_debt_items(state)
        context.quality_metrics = load_quality_data(state)
    END FOR
    
    // Load system relationships and dependencies
    FOR EACH ctx_file IN relevant_contexts DO
        context.dependencies.merge(load_dependencies(ctx_file))
        context.integration_points.merge(load_integrations(ctx_file))
        context.affected_components.merge(load_component_relationships(ctx_file))
    END FOR
    
    RETURN context
END FUNCTION
```

### 2. CARL-Informed Specialist Selection
Based on loaded CARL context, automatically select appropriate specialists:

```
# Implementation specialists based on CARL context
Task: carl-backend-analyst - Provide backend implementation context and API patterns from CARL analysis
Task: carl-frontend-analyst - Supply UI/UX requirements and component patterns from CARL intent files
Task: carl-architecture-analyst - Ensure architectural consistency and system integration compliance

# Quality and compliance specialists
Task: carl-quality-analyst - Define testing requirements and quality gates based on CARL specifications
Task: carl-security-analyst - Ensure security compliance and constraint adherence from CARL requirements
Task: carl-debt-analyst - Identify refactoring opportunities and technical debt considerations during implementation
```

### 3. Implementation with CARL Context Injection

#### CARL Context Integration Example
```yaml
# CARL automatically provides this context to the AI
task_context:
  requirements_from_carl:
    intent_files:
      - user-auth.intent: "Secure authentication with session management"
      - password-reset.intent: "Email-based password reset with security controls"
    
    constraints:
      - "Password reset tokens expire after 15 minutes"
      - "Maximum 3 password reset attempts per hour per user"
      - "Must log all password reset attempts for security audit"
    
    success_criteria:
      - "Password reset completes within 30 seconds"
      - "Email delivery within 2 minutes"
      - "Reset process works across all supported browsers"

  current_state_from_carl:
    implementation_status:
      - "User authentication: Production ready"
      - "Email service integration: Completed"
      - "Password validation logic: Needs refactoring (technical debt)"
    
    existing_components:
      - "AuthService: Handles user authentication"
      - "EmailService: Sends transactional emails"
      - "PasswordValidator: Complex validation logic (needs improvement)"
    
    quality_metrics:
      - "Authentication test coverage: 95%"
      - "Email service reliability: 99.8%"
      - "Password validation complexity: High (refactoring recommended)"

  dependencies_from_carl:
    required_services:
      - "user_database: PostgreSQL users table"
      - "email_service: SMTP configuration for transactional emails"
      - "redis_cache: Session and token storage"
    
    integration_points:
      - "AuthController: /api/auth/reset-password endpoint"
      - "EmailTemplates: password_reset_email.html template"
      - "FrontendComponents: PasswordResetForm component"

  team_patterns:
    established_conventions:
      - "Use bcrypt for password hashing with 12 rounds"
      - "JWT tokens for session management"
      - "Comprehensive error logging for authentication events"
      - "Email service uses template-based rendering"
```

### 4. TDD Implementation with CARL Guidance

**CARL-Enhanced Test-Driven Development:**
```javascript
// CARL provides test requirements from intent files and quality standards
describe('Password Reset Implementation (CARL-guided)', () => {
  // CARL context: Requirements from password-reset.intent
  describe('Security Requirements (from CARL intent)', () => {
    it('should generate secure reset tokens with 15-minute expiration', async () => {
      // CARL provides: Token expiration requirement from intent file
      const resetRequest = await requestPasswordReset('user@example.com');
      
      expect(resetRequest.token).toBeDefined();
      expect(resetRequest.expiresAt).toBeCloseTo(Date.now() + (15 * 60 * 1000), 1000);
    });

    it('should enforce rate limiting per CARL constraints', async () => {
      // CARL provides: Rate limiting requirement (3 attempts per hour)
      const email = 'test@example.com';
      
      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const result = await requestPasswordReset(email);
        expect(result.success).toBe(true);
      }
      
      // Fourth request should be rate limited
      const rateLimitedResult = await requestPasswordReset(email);
      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.error).toBe('Rate limit exceeded');
    });
  });

  // CARL context: Integration requirements from context files
  describe('Email Integration (from CARL context)', () => {
    it('should send password reset email using existing EmailService', async () => {
      // CARL provides: EmailService integration pattern
      const mockEmailService = createMockEmailService();
      const passwordResetService = new PasswordResetService(mockEmailService);
      
      await passwordResetService.sendResetEmail('user@example.com');
      
      expect(mockEmailService.sendTransactionalEmail).toHaveBeenCalledWith({
        template: 'password_reset_email',
        to: 'user@example.com',
        variables: expect.objectContaining({
          resetToken: expect.any(String),
          expirationTime: expect.any(String)
        })
      });
    });
  });

  // CARL context: Performance requirements from intent files
  describe('Performance Requirements (from CARL intent)', () => {
    it('should complete password reset within 30 seconds', async () => {
      // CARL provides: Performance requirement from success criteria
      const startTime = Date.now();
      
      const result = await completePasswordReset({
        token: 'valid-reset-token',
        newPassword: 'SecureNewPassword123!'
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
      expect(result.success).toBe(true);
    });
  });
});
```

### 5. Continuous CARL State Updates

**Real-Time Progress Tracking:**
```pseudocode
FUNCTION update_carl_state_during_implementation():
    // Track implementation progress automatically
    current_session = get_current_task_session()
    
    // Update state file with implementation progress
    state_updates = {
        last_updated: current_timestamp(),
        implementation_progress: {
            completed_components: extract_completed_work(),
            tests_written: count_new_tests(),
            code_coverage: calculate_coverage_change(),
            quality_metrics: assess_code_quality()
        },
        session_context: {
            session_id: current_session.id,
            developer_notes: extract_implementation_notes(),
            blockers_encountered: identify_blockers(),
            next_steps: generate_next_steps()
        }
    }
    
    update_carl_state_file(current_feature, state_updates)
    update_carl_index_with_progress(state_updates)
END FUNCTION
```

### 6. Quality Gate Integration

**CARL-Driven Quality Validation:**
```pseudocode
FUNCTION validate_implementation_against_carl():
    validation_results = {}
    
    // Validate against CARL intent requirements
    intent_validation = validate_against_intent_files()
    validation_results.requirements_met = intent_validation.all_requirements_satisfied
    
    // Validate against CARL context constraints  
    context_validation = validate_against_context_files()
    validation_results.integration_points_correct = context_validation.all_integrations_working
    
    // Validate against CARL quality standards
    quality_validation = validate_against_quality_standards()
    validation_results.quality_gates_passed = quality_validation.meets_standards
    
    // Generate quality report
    quality_report = generate_quality_report(validation_results)
    update_carl_state_with_quality_results(quality_report)
    
    RETURN validation_results
END FUNCTION
```

## Task Execution Features

### 1. Intelligent Code Generation
CARL context enables highly accurate code generation:
- **Existing patterns**: Follow established code patterns from the project
- **Integration points**: Generate code that integrates correctly with existing systems  
- **Quality standards**: Meet project-specific quality and testing requirements
- **Business constraints**: Implement business rules and validation logic correctly

### 2. Automated Testing Strategy
```yaml
# CARL automatically generates testing strategy based on context
testing_approach:
  unit_tests:
    coverage_target: 90%  # From CARL quality standards
    focus_areas:
      - business_logic_validation
      - edge_case_handling  
      - error_condition_handling
    
  integration_tests:
    required_integrations:
      - email_service_integration
      - database_transaction_handling
      - external_api_interactions
    
  performance_tests:
    requirements:
      - response_time_under_30s  # From CARL intent success criteria
      - concurrent_user_handling
      - email_delivery_timing
```

### 3. Progress Visualization
```bash
# CARL provides real-time progress updates
Task Progress: Implement Password Reset Feature
├── 🟢 Requirements Analysis (Complete)
│   ├── ✅ CARL intent file analysis
│   ├── ✅ Security constraint identification  
│   └── ✅ Integration point mapping
├── 🟡 Implementation (In Progress - 60%)
│   ├── ✅ Password reset token generation
│   ├── ✅ Email service integration
│   ├── 🔄 Rate limiting implementation
│   └── ⏳ Frontend form integration
├── ⏳ Testing (Pending)
│   ├── ⏳ Unit test implementation
│   ├── ⏳ Integration test setup
│   └── ⏳ End-to-end workflow testing
└── ⏳ Quality Gates (Pending)
    ├── ⏳ Code review completion
    ├── ⏳ Security validation
    └── ⏳ Performance verification
```

## Task Command Variations

### Context-Specific Execution
```bash
/task "implement user dashboard"           # Auto-loads relevant CARL context
/task --feature user-profile              # Specific feature context loading
/task --fix-debt authentication-complexity # Technical debt remediation focus
/task --from-intent analytics.intent      # Direct implementation from CARL intent
```

### Development Mode Options
```bash
/task --tdd "shopping cart logic"         # Enhanced TDD workflow with CARL context
/task --review-mode "payment processing"  # Include peer review checkpoints
/task --pair-program "complex algorithm"  # Collaborative implementation assistance
/task --refactor authentication-service   # Refactoring with technical debt awareness
```

### Quality and Compliance
```bash
/task --secure "user data handling"       # Enhanced security focus with CARL constraints
/task --performance "analytics queries"   # Performance optimization with CARL requirements
/task --accessible "user interface"       # Accessibility compliance with CARL standards
```

## Success Criteria

- [ ] CARL context automatically loaded and injected into AI assistance
- [ ] Relevant CARL files identified and integrated for comprehensive task context
- [ ] Implementation follows established project patterns and constraints
- [ ] Code generation leverages existing components and integration points
- [ ] Testing strategy automatically generated from CARL quality requirements
- [ ] Progress tracking updates CARL state files in real-time
- [ ] Quality gates validate implementation against CARL specifications
- [ ] Task completion properly documented in CARL session tracking

## Integration Points

- **Input**: Task description, CARL context files, current session state
- **Output**: Implemented code, updated CARL state files, session documentation
- **Next Commands**:
  - `/status` to view implementation progress and impact
  - `/plan [related-feature]` to plan follow-up work
  - `/analyze --sync` to update CARL files with implementation changes

CARL's task execution system transforms development by providing AI assistance with perfect project context, ensuring every implementation decision is informed by comprehensive requirements, constraints, and quality standards while maintaining real-time progress tracking and documentation.