const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Tells next/jest where to find next.config.ts and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Handle @/ path alias
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub out static assets that Jest can't handle
    '\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/__mocks__/fileMock.js',
  },
};

module.exports = createJestConfig(config);
