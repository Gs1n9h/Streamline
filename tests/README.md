# Streamline Test Suite

This directory contains comprehensive tests for the Streamline application, including end-to-end tests and SQL validation scripts.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   └── auth-onboarding.test.js
├── sql/                    # SQL validation scripts
│   └── validate-onboarding-data.sql
├── utils/                  # Test utilities
│   └── test-runner.js
├── package.json           # Test dependencies
└── README.md             # This file
```

## Test Types

### 1. End-to-End Tests (`e2e/`)

**File**: `auth-onboarding.test.js`

**Purpose**: Tests the complete user journey from signup to onboarding completion.

**Test Flow**:
1. **Signup Flow**: Creates a new user account
2. **Onboarding Step 1**: Company information (pre-filled data, industry selection, address)
3. **Onboarding Step 2**: Admin profile (role, contact info)
4. **Onboarding Step 3**: Settings (timezone, currency, pay rates)
5. **Onboarding Step 4**: Employee invitations (with employees or skip)
6. **Dashboard Access**: Verifies successful completion and dashboard access

**Test Data**:
- Unique test email with timestamp
- Complete company information
- Multiple employees with different pay periods
- Global location and currency data

### 2. SQL Validation (`sql/`)

**File**: `validate-onboarding-data.sql`

**Purpose**: Validates that all database operations completed correctly.

**Validation Checks**:
- User exists in `auth.users`
- Profile created in `profiles` table
- Company created in `streamline.companies`
- Admin membership in `streamline.company_members`
- Employee invitations in `streamline.employee_invitations`
- Data integrity and relationships

**Functions**:
- `validate_onboarding_data(user_email)`: Complete validation for a user
- `cleanup_test_data(user_email)`: Cleanup test data (requires admin access)

### 3. Test Runner (`utils/`)

**File**: `test-runner.js`

**Purpose**: Orchestrates the complete test suite execution.

**Features**:
- Runs E2E tests with Playwright
- Validates data using SQL scripts
- Generates comprehensive test reports
- Handles test cleanup
- Provides detailed error reporting

## Running Tests

### Prerequisites

1. **Application Running**: Ensure the Streamline app is running on `http://localhost:3000`
2. **Database Access**: Supabase project must be accessible
3. **Dependencies**: Install test dependencies

### Installation

```bash
cd tests
npm install
```

### Running All Tests

```bash
npm test
```

### Running Individual Tests

```bash
# E2E tests only
npm run test:e2e

# SQL validation only (requires MCP tools)
npm run test:sql
```

## Test Configuration

### Environment Variables

The tests use the following environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TEST_EMAIL=optional_custom_test_email
```

### Test Data

Each test run creates unique test data:
- **Email**: `test-user-{timestamp}@streamline-test.com`
- **Company**: `Test Company Inc`
- **Employees**: 2 test employees with different pay rates
- **Location**: US-based with auto-detected timezone/currency

## Validation Process

### 1. E2E Test Validation

The E2E tests verify:
- ✅ All form fields are filled correctly
- ✅ Navigation between steps works
- ✅ Data pre-filling from signup to onboarding
- ✅ Auto-detection of timezone/currency
- ✅ Employee invitation creation
- ✅ Dashboard access after completion

### 2. SQL Validation

The SQL validation checks:
- ✅ User authentication record exists
- ✅ Profile created with correct data
- ✅ Company created with all fields
- ✅ Admin membership established
- ✅ Employee invitations created
- ✅ Data relationships are correct

### 3. Security Validation

The tests ensure:
- ✅ No SQL injection vulnerabilities
- ✅ Proper RLS policies enforced
- ✅ User can only access their own data
- ✅ No data leakage between companies

## Test Results

### Success Criteria

A test passes if:
1. **E2E Flow**: All steps complete without errors
2. **Database**: All records created correctly
3. **Security**: No unauthorized data access
4. **Data Integrity**: All relationships maintained

### Failure Handling

When tests fail:
1. **Error Logging**: Detailed error messages captured
2. **Screenshots**: Playwright captures screenshots on failure
3. **Database State**: SQL validation shows exact data state
4. **Cleanup**: Test data cleaned up automatically

## Manual Testing

### Quick Manual Test

1. Visit `http://localhost:3000`
2. Click "Start 14-Day Free Trial"
3. Complete signup with test data
4. Go through 4-step onboarding
5. Verify dashboard access
6. Check settings page functionality

### SQL Manual Validation

```sql
-- Check specific user data
SELECT * FROM validate_onboarding_data('test-user@streamline-test.com');

-- Check all recent test users
SELECT u.email, p.full_name, c.name as company_name, c.industry
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN streamline.company_members cm ON u.id = cm.user_id
LEFT JOIN streamline.companies c ON cm.company_id = c.id
WHERE u.email LIKE 'test-user-%@streamline-test.com'
ORDER BY u.created_at DESC;
```

## Troubleshooting

### Common Issues

1. **Test Timeout**: Increase timeout values for slow environments
2. **Database Connection**: Verify Supabase credentials
3. **Playwright Issues**: Ensure browser dependencies installed
4. **RLS Policies**: Check Row Level Security policies

### Debug Mode

Run tests with debug output:
```bash
DEBUG=1 npm test
```

## Continuous Integration

### GitHub Actions

```yaml
name: Streamline Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd tests
          npm install
      - name: Run tests
        run: |
          cd tests
          npm test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Contributing

### Adding New Tests

1. **E2E Tests**: Add to `e2e/` directory
2. **SQL Tests**: Add to `sql/` directory
3. **Utilities**: Add to `utils/` directory
4. **Documentation**: Update this README

### Test Standards

- **Naming**: Use descriptive test names
- **Data**: Use unique test data for each run
- **Cleanup**: Always clean up test data
- **Documentation**: Document test purpose and flow

## Security Considerations

- **Test Data**: Never use real user data in tests
- **Credentials**: Use test-specific credentials
- **Isolation**: Ensure tests don't affect production data
- **Cleanup**: Always clean up test data after runs
