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

**CARL-Enhanced Test-Driven Development follows the Red-Green-Refactor cycle with intelligent context injection:**

#### TDD Cycle with CARL Context
```pseudocode
FUNCTION carl_enhanced_tdd_cycle(feature_requirements, carl_context):
    // CARL loads requirements, constraints, and patterns automatically
    test_requirements = extract_test_requirements_from_carl(carl_context)
    quality_standards = load_quality_standards_from_carl(carl_context)
    integration_patterns = load_integration_patterns_from_carl(carl_context)
    
    FOR EACH requirement IN feature_requirements DO
        // RED PHASE: Write failing test informed by CARL context
        failing_test = write_failing_test_with_carl_guidance(
            requirement, 
            test_requirements,
            quality_standards,
            integration_patterns
        )
        
        ASSERT test_fails(failing_test) == TRUE
        log_tdd_phase("RED", failing_test.description)
        
        // GREEN PHASE: Write minimal code to pass test
        minimal_implementation = write_minimal_passing_code(
            failing_test,
            carl_context.existing_patterns,
            carl_context.integration_points
        )
        
        ASSERT test_passes(failing_test) == TRUE  
        log_tdd_phase("GREEN", minimal_implementation.description)
        
        // REFACTOR PHASE: Improve code quality using CARL standards
        refactored_code = refactor_with_carl_standards(
            minimal_implementation,
            carl_context.quality_standards,
            carl_context.architectural_patterns,
            carl_context.technical_debt_guidelines
        )
        
        ASSERT all_tests_still_pass() == TRUE
        log_tdd_phase("REFACTOR", refactored_code.improvements)
        
        // Update CARL state with implementation progress
        update_carl_state_with_tdd_progress(requirement, refactored_code)
    END FOR
    
    RETURN completed_feature_with_full_test_coverage
END FUNCTION
```

#### Red-Green-Refactor Implementation Example

**RED Phase: Write Failing Test with CARL Context**
```pseudocode
FUNCTION write_failing_test_with_carl_guidance(requirement, carl_context):
    // CARL provides test structure based on intent files and quality standards
    test_spec = {
        description: requirement.user_story_description,
        
        // CARL injects security constraints from intent files
        security_requirements: carl_context.security_constraints,
        
        // CARL provides performance criteria from success criteria
        performance_requirements: carl_context.performance_criteria,
        
        // CARL supplies integration requirements from context files  
        integration_requirements: carl_context.integration_points,
        
        // CARL defines expected behavior from business rules
        expected_behavior: carl_context.business_logic_requirements
    }
    
    // Generate failing test that covers all CARL requirements
    failing_test = generate_comprehensive_test(test_spec)
    
    // Test should fail because implementation doesn't exist yet
    ASSERT run_test(failing_test).status == "FAILED"
    
    RETURN failing_test
END FUNCTION

// Example RED phase output:
test_password_reset_token_generation() {
    // CARL context: Security requirement from password-reset.intent
    // "Password reset tokens must expire after 15 minutes"
    
    // This test will FAIL because resetPasswordToken() doesn't exist yet
    token = resetPasswordToken("user@example.com")
    
    ASSERT token.value != null                    // Basic functionality
    ASSERT token.expiresAt == now() + 15_minutes  // CARL security requirement
    ASSERT token.isSecurelyGenerated == true      // CARL security standard
    ASSERT token.isOneTimeUse == true             // CARL business rule
}
```

**GREEN Phase: Write Minimal Passing Code**
```pseudocode
FUNCTION write_minimal_passing_code(failing_test, carl_context):
    // CARL provides integration patterns and existing component references
    existing_components = carl_context.existing_components
    integration_patterns = carl_context.integration_patterns
    
    // Write minimal implementation that makes test pass
    minimal_code = {
        // Use existing components identified by CARL
        dependencies: existing_components.required_services,
        
        // Follow integration patterns from CARL context
        integration_approach: integration_patterns.recommended,
        
        // Implement just enough to satisfy the failing test
        core_logic: implement_minimal_logic_for_test(failing_test)
    }
    
    // Verify test now passes
    ASSERT run_test(failing_test).status == "PASSED"
    
    RETURN minimal_code
END FUNCTION

// Example GREEN phase implementation:
FUNCTION resetPasswordToken(email) {
    // Minimal implementation to make RED test pass
    token = {
        value: generateRandomString(32),           // Basic token generation
        expiresAt: currentTime() + (15 * 60000),  // 15 minutes from now
        isSecurelyGenerated: true,                // Placeholder - meets test
        isOneTimeUse: true                        // Placeholder - meets test
    }
    
    RETURN token  // Test passes, but code needs improvement
}
```

**REFACTOR Phase: Improve with CARL Standards**
```pseudocode
FUNCTION refactor_with_carl_standards(minimal_code, carl_context):
    quality_standards = carl_context.quality_standards
    architectural_patterns = carl_context.architectural_patterns
    security_patterns = carl_context.security_patterns
    
    refactored_code = minimal_code
    
    // Apply CARL quality standards
    refactored_code = apply_security_patterns(refactored_code, security_patterns)
    refactored_code = apply_architectural_patterns(refactored_code, architectural_patterns)
    refactored_code = improve_error_handling(refactored_code, quality_standards)
    refactored_code = add_logging_and_monitoring(refactored_code, quality_standards)
    refactored_code = optimize_performance(refactored_code, quality_standards)
    
    // Verify all tests still pass after refactoring
    ASSERT run_all_tests().status == "ALL_PASSED"
    
    // Verify code meets CARL quality gates
    ASSERT meets_carl_quality_standards(refactored_code) == TRUE
    
    RETURN refactored_code
END FUNCTION

// Example REFACTOR phase improvements:
FUNCTION resetPasswordToken(email) {
    // Refactored implementation with CARL quality standards
    
    // CARL security pattern: Use cryptographically secure random generation
    tokenValue = cryptoSecureRandom(32)  // Improved from basic random
    
    // CARL architectural pattern: Use dependency injection for services
    tokenStorage = inject(TokenStorageService)
    emailValidator = inject(EmailValidationService)
    auditLogger = inject(AuditLoggingService)
    
    // CARL quality standard: Input validation and error handling
    IF NOT emailValidator.isValid(email) THEN
        auditLogger.logInvalidEmailAttempt(email)
        THROW InvalidEmailException("Invalid email format")
    END IF
    
    // CARL business rule: Check rate limiting before token generation
    IF rateLimiter.isExceeded(email) THEN
        auditLogger.logRateLimitExceeded(email)
        THROW RateLimitException("Too many reset attempts")
    END IF
    
    // Create token with proper security and business logic
    token = {
        value: tokenValue,
        email: email,
        expiresAt: currentTime() + (15 * 60000),
        isUsed: false,
        createdAt: currentTime()
    }
    
    // CARL integration pattern: Store token using existing storage service
    tokenStorage.store(token)
    
    // CARL monitoring standard: Log security events
    auditLogger.logPasswordResetTokenGenerated(email, token.value)
    
    RETURN token
}
```

#### CARL TDD Quality Gates
```pseudocode
FUNCTION validate_tdd_implementation_against_carl(implementation):
    validation_results = {}
    
    // Verify Red-Green-Refactor cycle was followed
    validation_results.tdd_cycle_complete = verify_red_green_refactor_cycle()
    
    // Validate test coverage meets CARL quality standards
    coverage = calculate_test_coverage(implementation)
    validation_results.coverage_meets_standards = coverage >= carl_context.minimum_coverage
    
    // Ensure integration tests validate CARL context requirements
    integration_tests = extract_integration_tests(implementation)
    validation_results.integration_requirements_tested = validate_integration_coverage(
        integration_tests, 
        carl_context.integration_points
    )
    
    // Verify security requirements from CARL intent files are tested
    security_tests = extract_security_tests(implementation)
    validation_results.security_requirements_tested = validate_security_coverage(
        security_tests,
        carl_context.security_constraints
    )
    
    // Confirm performance requirements from CARL success criteria are validated
    performance_tests = extract_performance_tests(implementation)
    validation_results.performance_requirements_tested = validate_performance_coverage(
        performance_tests,
        carl_context.performance_criteria
    )
    
    RETURN validation_results
END FUNCTION
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