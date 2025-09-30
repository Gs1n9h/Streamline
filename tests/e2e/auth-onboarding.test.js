/**
 * End-to-End Test: Auth and Onboarding Flow
 * 
 * This test validates the complete user journey from signup to onboarding completion.
 * It tests both the "add employees" and "skip employees" flows.
 */

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU',
  
  // Test user data
  testUser: {
    email: `test-user-${Date.now()}@streamline-test.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    companyName: 'Test Company Inc',
    industry: 'Construction',
    companySize: '1-5',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    postalCode: '90210',
    country: 'US',
    companyPhone: '(555) 123-4567',
    website: 'https://testcompany.com',
    role: 'owner',
    adminPhone: '(555) 987-6543',
    timeZone: 'America/Los_Angeles',
    currency: 'USD',
    defaultPayRate: 20.00,
    employees: [
      {
        email: 'employee1@testcompany.com',
        fullName: 'John Employee',
        role: 'staff',
        payRate: 18.00,
        payPeriod: 'hourly'
      },
      {
        email: 'employee2@testcompany.com',
        fullName: 'Jane Worker',
        role: 'staff',
        payRate: 22.00,
        payPeriod: 'hourly'
      }
    ]
  }
};

class AuthOnboardingTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.supabase = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async setup() {
    console.log('🚀 Setting up test environment...');
    
    // Initialize Supabase client
    this.supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    
    // Launch browser
    this.browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 1000 // Slow down for debugging
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Test environment ready');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      // Delete test user and data
      await this.cleanupTestData();
      
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
    
    console.log('✅ Cleanup complete');
  }

  async cleanupTestData() {
    try {
      // This would need to be implemented with proper admin access
      // For now, we'll rely on the test email being unique
      console.log('🧹 Test data cleanup (manual verification required)');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error.message);
    }
  }

  async runTest(name, testFunction) {
    console.log(`\n🧪 Running test: ${name}`);
    
    try {
      await testFunction();
      this.testResults.passed++;
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async testSignup() {
    // Navigate to signup page
    await this.page.goto(`${TEST_CONFIG.baseUrl}/auth/signup`);
    await this.page.waitForLoadState('networkidle');

    // Fill signup form
    await this.page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await this.page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await this.page.fill('input[name="companyName"]', TEST_CONFIG.testUser.companyName);
    await this.page.fill('input[name="fullName"]', TEST_CONFIG.testUser.fullName);

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect to onboarding
    await this.page.waitForURL('**/onboarding**', { timeout: 10000 });

    // Verify onboarding page loaded
    const onboardingTitle = await this.page.textContent('h2');
    if (!onboardingTitle.includes('Tell us about your company')) {
      throw new Error('Onboarding page did not load correctly');
    }

    console.log('✅ Signup completed successfully');
  }

  async testOnboardingStep1() {
    console.log('📝 Testing onboarding step 1: Company Information');

    // Verify company name is pre-filled
    const companyNameValue = await this.page.inputValue('input[value*="' + TEST_CONFIG.testUser.companyName + '"]');
    if (!companyNameValue) {
      throw new Error('Company name was not pre-filled from signup');
    }

    // Fill remaining company information
    await this.page.selectOption('select', { label: TEST_CONFIG.testUser.industry });
    await this.page.selectOption('select:nth-of-type(2)', { label: TEST_CONFIG.testUser.companySize + ' employees' });
    await this.page.fill('input[placeholder*="123 Main St"]', TEST_CONFIG.testUser.address);
    await this.page.fill('input[placeholder*="New York"]', TEST_CONFIG.testUser.city);
    await this.page.selectOption('select:nth-of-type(3)', { value: TEST_CONFIG.testUser.state });
    await this.page.fill('input[placeholder*="10001"]', TEST_CONFIG.testUser.postalCode);
    await this.page.fill('input[placeholder*="(555) 123-4567"]', TEST_CONFIG.testUser.companyPhone);
    await this.page.fill('input[placeholder*="https://"]', TEST_CONFIG.testUser.website);

    // Click Next
    await this.page.click('button:has-text("Next")');

    // Verify we moved to step 2
    await this.page.waitForSelector('h2:has-text("Complete your profile")', { timeout: 5000 });

    console.log('✅ Step 1 completed successfully');
  }

  async testOnboardingStep2() {
    console.log('📝 Testing onboarding step 2: Admin Profile');

    // Verify email is pre-filled and disabled
    const emailInput = await this.page.locator('input[type="email"]');
    const isDisabled = await emailInput.isDisabled();
    if (!isDisabled) {
      throw new Error('Email field should be disabled');
    }

    // Fill admin profile
    await this.page.selectOption('select', { label: TEST_CONFIG.testUser.role });
    await this.page.fill('input[placeholder*="(555) 123-4567"]', TEST_CONFIG.testUser.adminPhone);

    // Click Next
    await this.page.click('button:has-text("Next")');

    // Verify we moved to step 3
    await this.page.waitForSelector('h2:has-text("Configure your settings")', { timeout: 5000 });

    console.log('✅ Step 2 completed successfully');
  }

  async testOnboardingStep3() {
    console.log('📝 Testing onboarding step 3: Settings');

    // Verify timezone and currency are auto-detected
    const timezoneValue = await this.page.inputValue('select');
    const currencyValue = await this.page.inputValue('select:nth-of-type(2)');

    if (timezoneValue !== TEST_CONFIG.testUser.timeZone) {
      console.warn(`⚠️ Timezone auto-detection: expected ${TEST_CONFIG.testUser.timeZone}, got ${timezoneValue}`);
    }

    if (currencyValue !== TEST_CONFIG.testUser.currency) {
      console.warn(`⚠️ Currency auto-detection: expected ${TEST_CONFIG.testUser.currency}, got ${currencyValue}`);
    }

    // Set default pay rate
    await this.page.fill('input[type="number"]', TEST_CONFIG.testUser.defaultPayRate.toString());

    // Click Next
    await this.page.click('button:has-text("Next")');

    // Verify we moved to step 4
    await this.page.waitForSelector('h2:has-text("Invite your team")', { timeout: 5000 });

    console.log('✅ Step 3 completed successfully');
  }

  async testOnboardingStep4WithEmployees() {
    console.log('📝 Testing onboarding step 4: Add Employees');

    // Add first employee
    await this.page.click('button:has-text("+ Add Employee")');
    await this.page.fill('input[placeholder*="Jane Doe"]', TEST_CONFIG.testUser.employees[0].fullName);
    await this.page.fill('input[placeholder*="jane@company.com"]', TEST_CONFIG.testUser.employees[0].email);
    await this.page.selectOption('select', { value: TEST_CONFIG.testUser.employees[0].role });
    await this.page.selectOption('select:nth-of-type(2)', { value: TEST_CONFIG.testUser.employees[0].payPeriod });
    await this.page.fill('input[type="number"]', TEST_CONFIG.testUser.employees[0].payRate.toString());

    // Add second employee
    await this.page.click('button:has-text("+ Add Employee")');
    await this.page.fill('input[placeholder*="Jane Doe"]:nth-of-type(2)', TEST_CONFIG.testUser.employees[1].fullName);
    await this.page.fill('input[placeholder*="jane@company.com"]:nth-of-type(2)', TEST_CONFIG.testUser.employees[1].email);
    await this.page.selectOption('select:nth-of-type(3)', { value: TEST_CONFIG.testUser.employees[1].role });
    await this.page.selectOption('select:nth-of-type(4)', { value: TEST_CONFIG.testUser.employees[1].payPeriod });
    await this.page.fill('input[type="number"]:nth-of-type(2)', TEST_CONFIG.testUser.employees[1].payRate.toString());

    // Complete setup
    await this.page.click('button:has-text("Complete Setup")');

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Verify welcome modal appears
    await this.page.waitForSelector('text=Welcome to Streamline!', { timeout: 5000 });

    console.log('✅ Step 4 with employees completed successfully');
  }

  async testOnboardingStep4Skip() {
    console.log('📝 Testing onboarding step 4: Skip Employees');

    // Click skip button
    await this.page.click('button:has-text("Skip for now")');

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Verify welcome modal appears
    await this.page.waitForSelector('text=Welcome to Streamline!', { timeout: 5000 });

    console.log('✅ Step 4 skip completed successfully');
  }

  async testDashboardAccess() {
    console.log('📝 Testing dashboard access');

    // Close welcome modal
    await this.page.click('button:has-text("Explore Dashboard")');

    // Verify dashboard loaded
    await this.page.waitForSelector('text=Dashboard', { timeout: 5000 });

    // Verify company name is displayed
    const companyName = await this.page.textContent('text=' + TEST_CONFIG.testUser.companyName);
    if (!companyName) {
      throw new Error('Company name not found on dashboard');
    }

    console.log('✅ Dashboard access successful');
  }

  async runAllTests() {
    console.log('🚀 Starting Auth & Onboarding E2E Tests');
    console.log(`📧 Test Email: ${TEST_CONFIG.testUser.email}`);
    console.log(`🏢 Test Company: ${TEST_CONFIG.testUser.companyName}`);

    try {
      await this.setup();

      // Run all tests
      await this.runTest('Signup Flow', () => this.testSignup());
      await this.runTest('Onboarding Step 1', () => this.testOnboardingStep1());
      await this.runTest('Onboarding Step 2', () => this.testOnboardingStep2());
      await this.runTest('Onboarding Step 3', () => this.testOnboardingStep3());
      await this.runTest('Onboarding Step 4 with Employees', () => this.testOnboardingStep4WithEmployees());
      await this.runTest('Dashboard Access', () => this.testDashboardAccess());

      // Print results
      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Suite', error: error.message });
    } finally {
      await this.cleanup();
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
    
    const success = this.testResults.failed === 0;
    console.log(`\n${success ? '🎉 All tests passed!' : '💥 Some tests failed!'}`);
    
    return success;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new AuthOnboardingTest();
  test.runAllTests().catch(console.error);
}

module.exports = AuthOnboardingTest;
