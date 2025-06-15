# Testing Documentation

## Overview

EquiSplit has a comprehensive testing suite designed to ensure the reliability, security, and performance of the application. Our testing strategy covers multiple layers including unit tests, integration tests, end-to-end tests, accessibility tests, security tests, and performance tests.

## Testing Stack

- **Jest**: Unit and integration testing framework
- **React Testing Library**: React component testing utilities
- **Playwright**: End-to-end testing framework
- **Axe-core**: Accessibility testing
- **Node Test Runner**: Performance testing utilities

## Test Types

### 1. Unit Tests (`tests/unit/`)

Unit tests focus on testing individual components, functions, and modules in isolation.

#### Structure:
```
tests/unit/
├── components/          # React component tests
├── utils/              # Utility function tests  
├── hooks/              # Custom hook tests
└── lib/                # Library module tests
```

#### Key Features:
- **Component Testing**: Tests for all React components with focus on behavior, props, and user interactions
- **Utility Testing**: Comprehensive tests for calculation functions, validation logic, and helper utilities
- **Hook Testing**: Tests for custom React hooks like `useMultiStepForm`
- **Mocking**: Extensive mocking of external dependencies and APIs

#### Example:
```typescript
describe('calculatePropertyDivision', () => {
  it('should handle community property states with 50/50 split', () => {
    const result = calculatePropertyDivision(californiaInputs)
    expect(result.spouse1Share).toBe(0.5)
    expect(result.spouse2Share).toBe(0.5)
  })
})
```

### 2. Integration Tests (`tests/integration/`)

Integration tests verify that different parts of the application work together correctly.

#### Structure:
```
tests/integration/
├── api/                # API route testing
└── forms/              # Multi-component form testing
```

#### Key Features:
- **API Testing**: Tests for all Next.js API routes with real request/response cycles
- **Database Integration**: Tests with actual database operations
- **Authentication Flow**: Tests for NextAuth.js integration
- **Error Handling**: Comprehensive error scenario testing

#### Example:
```typescript
describe('/api/calculate', () => {
  it('should calculate property division successfully', async () => {
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(data.result.spouse1Share).toBeGreaterThanOrEqual(0.3)
  })
})
```

### 3. End-to-End Tests (`tests/e2e/`)

E2E tests simulate real user interactions with the application.

#### Structure:
```
tests/e2e/
├── calculator-flow.spec.ts     # Main calculator workflow
├── authentication.spec.ts      # Authentication flows
└── accessibility.spec.ts       # Accessibility compliance
```

#### Key Features:
- **User Workflows**: Complete calculator flow from start to finish
- **Cross-browser Testing**: Chrome, Firefox, Safari, Mobile browsers
- **Authentication**: Sign-in/sign-out flows with multiple providers
- **Responsive Design**: Mobile and desktop viewport testing
- **Error Scenarios**: Network failures, validation errors, API errors

#### Example:
```typescript
test('should complete full calculator flow', async ({ page }) => {
  await page.goto('/calculator')
  await page.fill('[data-testid="spouse1-name"]', 'John Doe')
  // ... complete form
  await page.click('[data-testid="calculate-button"]')
  await expect(page.getByTestId('results')).toBeVisible()
})
```

### 4. Accessibility Tests

Accessibility tests ensure WCAG 2.1 Level AA compliance.

#### Features:
- **Automated Scanning**: Axe-core integration for automated accessibility testing
- **Keyboard Navigation**: Tab order and keyboard accessibility
- **Screen Reader Support**: ARIA labels, roles, and properties
- **Color Contrast**: Meets WCAG contrast requirements
- **Focus Management**: Proper focus indicators and management

#### Example:
```typescript
test('should not have accessibility violations', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
  expect(accessibilityScanResults.violations).toEqual([])
})
```

### 5. Performance Tests (`tests/performance/`)

Performance tests ensure the application meets speed and efficiency requirements.

#### Features:
- **Calculation Performance**: Tests for calculation speed with large datasets
- **Memory Usage**: Memory leak detection and usage monitoring
- **Concurrent Operations**: Testing under concurrent load
- **Edge Cases**: Performance with extreme values and scenarios

#### Example:
```typescript
test('should calculate division quickly with large dataset', async () => {
  const duration = await measurePerformance(async () => {
    calculatePropertyDivision(largeInputs)
  }, 'Large dataset calculation')
  expect(duration).toBeLessThan(1000) // 1 second
})
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests
```bash
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

### Integration Tests
```bash
npm test -- --testPathPattern=integration
```

### End-to-End Tests
```bash
npm run test:e2e           # All E2E tests
npm run test:e2e:ui        # With Playwright UI
```

### Performance Tests
```bash
npm test -- --testPathPattern=performance
```

### Accessibility Tests
```bash
npx playwright test tests/e2e/accessibility.spec.ts
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: jsdom for React component testing
- **Module Mapping**: `@/` alias for `src/` directory
- **Coverage Thresholds**: 80% minimum coverage
- **Timeout**: 10 second default timeout

### Playwright Configuration (`playwright.config.ts`)
- **Browsers**: Chrome, Firefox, Safari, Mobile browsers
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure
- **Video Recording**: On failure
- **Trace Collection**: On retry

### Coverage Configuration
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  }
}
```

## Test Data Management

### Test Helpers (`tests/utils/test-helpers.ts`)
Utility functions for creating consistent test data:

- `createMockCalculationInputs()`: Complete calculation input data
- `createMockAsset()`: Individual asset data
- `createMockDebt()`: Individual debt data
- `mockLocalStorage()`: localStorage mock utilities
- `mockFetch()`: API response mocking

### Mock Data
- **Realistic Data**: Based on real-world scenarios
- **Edge Cases**: Extreme values, empty data, error conditions
- **State Variations**: Different US states and legal rules

## Continuous Integration

### GitHub Actions (`.github/workflows/test.yml`)
Automated testing pipeline that runs:

1. **Lint & Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Jest unit test suite with coverage
3. **Integration Tests**: API and database integration tests
4. **E2E Tests**: Playwright end-to-end tests
5. **Security Tests**: npm audit and security validation
6. **Accessibility Tests**: Automated accessibility scanning
7. **Build Verification**: Successful application build

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No accessibility violations
- No security vulnerabilities
- Successful build completion

## Test Maintenance

### Writing Tests
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the function or interaction
3. **Assert**: Verify expected outcomes

### Best Practices
- **Descriptive Names**: Clear test descriptions
- **Single Responsibility**: One assertion per test
- **Independent Tests**: No test dependencies
- **Realistic Data**: Use meaningful test data
- **Clean Up**: Proper test cleanup and reset

### Debugging Tests
- Use `--verbose` flag for detailed output
- Add `console.log` statements for debugging
- Use Playwright's debug mode: `npx playwright test --debug`
- Check coverage reports for missed scenarios

## Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: Interactive coverage report in `coverage/` directory
- **LCOV**: Machine-readable format for CI/CD
- **Text**: Console output summary
- **JSON**: Programmatic access to coverage data

### Viewing Coverage
```bash
npm run test:coverage
open coverage/index.html
```

## Security Testing

Security tests ensure the application is protected against common vulnerabilities:

- **Input Validation**: XSS and injection prevention
- **Authentication**: Proper session management
- **Authorization**: Role-based access control
- **Data Encryption**: Sensitive data protection
- **Dependency Scanning**: npm audit for vulnerable packages

## Accessibility Compliance

Our accessibility testing ensures compliance with:
- **WCAG 2.1 Level AA**: International accessibility standard
- **Section 508**: US federal accessibility requirements
- **ADA**: Americans with Disabilities Act compliance

### Automated Testing
- Color contrast validation
- Keyboard navigation testing
- Screen reader compatibility
- Focus management verification

### Manual Testing
- Real screen reader testing
- Voice control testing
- High contrast mode verification
- Magnification tool compatibility

## Performance Benchmarks

Performance benchmarks ensure optimal user experience:

- **Page Load**: < 2 seconds for initial load
- **Calculation Speed**: < 1 second for complex calculations
- **Memory Usage**: No memory leaks detected
- **Concurrent Operations**: Stable under load

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout or check for infinite loops
2. **Module Resolution**: Verify `@/` alias configuration
3. **Authentication Mocks**: Ensure NextAuth mocks are properly set up
4. **Browser Downloads**: Install Playwright browsers: `npx playwright install`

### Debug Commands
```bash
# Run specific test file
npm test calculator.test.ts

# Run tests in watch mode
npm run test:watch

# Debug Playwright tests
npx playwright test --debug

# Generate test coverage
npm run test:coverage
```

## Future Enhancements

- **Visual Regression Testing**: Screenshot comparison testing
- **Load Testing**: High-volume user simulation
- **Mobile Testing**: Extended mobile device coverage
- **API Fuzzing**: Random input testing for API endpoints
- **Chaos Engineering**: Failure scenario simulation

For detailed implementation examples, see the test files in the `tests/` directory.