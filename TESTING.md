# CARL Testing Guide

## Test Isolation Pattern

**CRITICAL**: All tests MUST use `tests/.test-artifacts/` directory to avoid polluting the project root.

### The Problem

When tests create `.cascade/` directories or other artifacts in the project root:
- Pollutes working directory
- Confuses Git status
- Mixes test data with real data
- Hard to clean up

### The Solution

**Always use test artifacts directory:**

```javascript
const path = require('path');

// ✅ CORRECT - Uses test artifacts directory
const testDir = path.join(__dirname, '..', '.test-artifacts', 'test-name');
const manager = new CascadeManager(testDir);

// ❌ WRONG - Creates files in project root!
const manager = new CascadeManager('.cascade');
const manager = new CascadeManager('.cascade-test');
```

### Quick Test Helper

For ad-hoc test scripts:

```javascript
const { getTestDir, cleanup } = require('./tests/utils/run-quick-test.js');

async function test() {
  const testDir = getTestDir('my-test');
  await cleanup(testDir); // Clean before test

  const manager = new CascadeManager(testDir);

  // ... test code ...

  await cleanup(testDir); // Clean after test
}
```

### Jest Tests

Jest tests use `beforeEach` and `afterEach` to clean up:

```javascript
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', 'test-name');

describe('My Tests', () => {
  let manager;

  beforeEach(async () => {
    manager = new CascadeManager(TEST_DIR);
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should do something', async () => {
    // Test code here - uses TEST_DIR
  });
});
```

## Directory Structure

```
carl/
├── .gitignore              # Ignores /.cascade/ and tests/.test-artifacts/
├── tests/
│   ├── .test-artifacts/    # All test files go here (gitignored)
│   │   ├── .cascade-test/  # Jest tests
│   │   ├── my-test/        # Quick test scripts
│   │   └── ...
│   ├── unit/
│   │   └── *.test.js       # Uses tests/.test-artifacts/
│   └── utils/
│       ├── test-helpers.js
│       └── run-quick-test.js
└── plugins/
    └── carl/
        └── lib/            # Source code - NO test artifacts here!
```

## Verification

Check that root is clean:

```bash
# Should show nothing
ls -la | grep cascade

# Should show clean root
npm test && ls -la | grep cascade
```

## Cleaning Up

```bash
# Clean all test artifacts
npm run test:clean

# Manually clean
rm -rf tests/.test-artifacts coverage
```

## Common Mistakes

### ❌ Creating test directories in root

```javascript
// DON'T DO THIS
const manager = new CascadeManager('.cascade-test');
```

**Problem**: Creates `.cascade-test/` in project root

**Fix**: Use test artifacts directory:
```javascript
const testDir = path.join(__dirname, '..', '.test-artifacts', 'cascade-test');
const manager = new CascadeManager(testDir);
```

### ❌ Running inline Node tests without path

```bash
# DON'T DO THIS
node -e "const manager = new CascadeManager('.cascade'); ..."
```

**Problem**: Creates `.cascade/` in current directory (project root)

**Fix**: Use helper or specify full path:
```bash
node tests/utils/run-quick-test.js
# or
node -e "const testDir = path.join('tests', '.test-artifacts', 'test'); ..."
```

### ❌ Forgetting to clean up after tests

```javascript
// DON'T DO THIS
it('test', async () => {
  const manager = new CascadeManager(testDir);
  await manager.initialize();
  // ... test ...
  // NO CLEANUP!
});
```

**Problem**: Leaves test artifacts on disk

**Fix**: Use afterEach:
```javascript
afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
});
```

## Git Configuration

`.gitignore` is configured to ignore:

```gitignore
# Test artifacts
tests/.test-artifacts/
coverage/

# Cascade work items (should be in separate location)
/.cascade/
```

This ensures:
- Test artifacts are never committed
- Root `.cascade/` is gitignored (shouldn't exist anyway)
- Only actual source code is tracked

## Best Practices

1. **Always use test artifacts directory** for any test files
2. **Clean up before and after** each test
3. **Use descriptive test directory names** (e.g., 'cascade-crud-test')
4. **Never create test files in project root**
5. **Run `npm run test:clean`** periodically to clean up
6. **Check root directory** before committing: `ls -la | grep cascade` should show nothing

## Resources

- Test README: `tests/README.md`
- Quick Test Helper: `tests/utils/run-quick-test.js`
- Test Helpers: `tests/utils/test-helpers.js`
- Jest Config: `package.json` → `jest` section
