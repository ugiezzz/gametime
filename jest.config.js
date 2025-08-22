const SKIP_COVERAGE = process.env.RUN_RIOT_INT_TESTS === '1';

module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',

    '^__mocks__/(.*)$': '<rootDir>/__mocks__/$1',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  clearMocks: true,
  collectCoverage: !SKIP_COVERAGE,
  collectCoverageFrom: [
    './src/**/*.{js,ts}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
  ],
  coverageThreshold: SKIP_COVERAGE
    ? undefined
    : {
        global: {
          branches: 30,
          functions: 30,
          lines: 30,
          statements: 30,
        },
      },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.expo/'],
};
