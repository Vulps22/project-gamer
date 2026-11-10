module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/database'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  clearMocks: true,
  resetMocks: true,
  testTimeout: 10000
};
