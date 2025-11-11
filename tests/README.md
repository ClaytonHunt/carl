# CARL Tests

Comprehensive test suite for CARL (Coding Assistant for Rapid Launch).

## Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── cascade-manager.foundation.test.js    # Registry & ID management
│   ├── cascade-manager.crud.test.js          # Create/Read/Update/Delete
│   ├── cascade-manager.state.test.js         # State tracking
│   ├── cascade-manager.hierarchy.test.js     # Parent/child navigation
│   ├── cascade-manager.search.test.js        # Search & queries
│   ├── adapters.test.js (future)
│   └── work-item-templates.test.js (future)
├── integration/             # Integration tests for workflows
│   ├── planning-workflow.test.js (future)
│   └── work-orchestration.test.js (future)
├── fixtures/                # Test data and fixtures
│   └── sample-work-items/ (future)
├── utils/                   # Test utilities and helpers
│   └── test-helpers.js
└── .test-artifacts/         # Temporary test files (gitignored, auto-cleaned)
    ├── .cascade-test/       # Foundation tests
    ├── .cascade-crud-test/  # CRUD tests
    ├── .cascade-state-test/ # State tests
    ├── .cascade-hierarchy-test/ # Hierarchy tests
    └── .cascade-search-test/    # Search tests
```

**⚠️ IMPORTANT**: All test artifacts (temp files, `.cascade` directories, etc.) **MUST** be created in `tests/.test-artifacts/` to avoid polluting the project root. This directory is gitignored and cleaned automatically by tests.

### Test Directory Pattern

**✅ Correct** (use test artifacts directory):
```javascript
const path = require('path');
const testDir = path.join(__dirname, '..', '.test-artifacts', 'my-test-name');
const manager = new CascadeManager(testDir);
```

**❌ Wrong** (pollutes project root):
```javascript
// DON'T DO THIS - creates .cascade/ in project root!
const manager = new CascadeManager('.cascade');
const manager = new CascadeManager('.cascade-test');
```

**Helper Available**: Use `tests/utils/run-quick-test.js` for quick test scripts:
```javascript
const { getTestDir, cleanup } = require('./tests/utils/run-quick-test.js');
const testDir = getTestDir('my-test');
await cleanup(testDir);
const manager = new CascadeManager(testDir);
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (development)
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

### Clean Test Artifacts
```bash
npm run test:clean
```
This removes `tests/.test-artifacts/` and `coverage/` directories.

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Specific Test File
```bash
npm test cascade-manager
```

## Testing Framework

- **Framework**: Jest 29.7.0
- **Environment**: Node.js
- **Pattern**: `**/ tests/**/*.test.js`

## Writing Tests

### Test Structure

```javascript
describe('Module Name', () => {
  let instance;

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('methodName()', () => {
    it('should do something specific', () => {
      // Test implementation
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test artifacts (files, directories)
3. **Descriptive**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Coverage**: Aim for >80% code coverage

### Test Naming

```javascript
// ✅ Good
it('should create work item with valid hierarchy', () => {});
it('should throw error for invalid work item type', () => {});
it('should return null when parent does not exist', () => {});

// ❌ Bad
it('test 1', () => {});
it('works', () => {});
it('check function', () => {});
```

## Test Coverage

Current coverage for implemented modules:

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| cascade-manager.js | TBD | TBD | TBD | TBD |

Run `npm run test:coverage` to generate detailed coverage report.

## Continuous Integration

Tests should run on:
- Pre-commit (via git hooks)
- Pull requests
- Main branch pushes

## Test Data

Test fixtures and sample data are in `tests/fixtures/`. These are used for:
- Sample work items
- Mock registry data
- Example hierarchies

## Debugging Tests

### Run Single Test
```bash
npm test -- -t "should create work item"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
npm test -- --verbose
```

## Adding New Tests

1. Create test file: `tests/unit/module-name.test.js`
2. Import module to test
3. Write describe blocks for module and methods
4. Add setup/teardown in beforeEach/afterEach
5. Write specific test cases with it()
6. Run tests: `npm test`

## Current Test Status

### Foundation ✅ Complete
**File:** `cascade-manager.foundation.test.js`

Core initialization, registry management, and ID generation:
- `initialize()` - 4 tests
- `loadRegistry()` - 3 tests
- `saveRegistry()` - 4 tests
- `getNextId()` - 7 tests
- `validateId()` - 5 tests
- Utility functions - 6 test suites (parseId, generateSlug, etc.)

**Total: 35 tests**

### CRUD Operations ✅ Complete
**File:** `cascade-manager.crud.test.js`

Creating, reading, updating, and deleting work items:
- `createWorkItem()` - 14 tests
- `getWorkItem()` - 7 tests
- `updateWorkItem()` - 10 tests
- `deleteWorkItem()` - 5 tests
- `_generateMarkdown()` - 3 tests
- `_parseMarkdown()` - 3 tests

**Total: 42 tests**

### State Management ✅ Complete
**File:** `cascade-manager.state.test.js`

Work item state tracking and status updates:
- `createState()` - 6 tests
- `getState()` - 5 tests
- `updateStatus()` - 10 tests

**Total: 21 tests**

### Hierarchy Navigation ✅ Complete
**File:** `cascade-manager.hierarchy.test.js`

Traversing and querying parent-child relationships:
- `getParent()` - 6 tests
- `getChildren()` - 8 tests
- `getHierarchy()` - 11 tests

**Total: 25 tests**

### Search & Queries ✅ Complete
**File:** `cascade-manager.search.test.js`

Finding and filtering work items:
- `searchWorkItems()` - 10 tests
- `getWorkItemsByType()` - 11 tests

**Total: 21 tests**

### Overall Status

🎉 **144 total tests passing** - Complete test coverage for all 22 Cascade Manager methods!

**Test Suite Breakdown:**
- Foundation: 35 tests ✅
- CRUD Operations: 42 tests ✅
- State Management: 21 tests ✅
- Hierarchy Navigation: 25 tests ✅
- Search & Queries: 21 tests ✅

**All test files properly isolated in `tests/.test-artifacts/`**

### Upcoming

- Integration: Planning workflows
- Integration: Work orchestration
- Adapter tests (ADO, GitHub, Jira)
