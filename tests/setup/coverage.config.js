module.exports = {
  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!src/pages/api/**/*',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific file patterns can have different thresholds
    './src/utils/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/**/*.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './src/lib/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Files to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/__tests__/',
    '/tests/',
    '.test.',
    '.spec.',
    '.stories.',
  ],

  // Additional configuration for more detailed reporting
  verbose: true,
  
  // Fail tests if coverage falls below threshold
  coverageReporters: [
    'text-lcov',
    'text',
    'html',
    ['json', { file: 'coverage.json' }],
    ['json-summary', { file: 'coverage-summary.json' }],
  ],
}