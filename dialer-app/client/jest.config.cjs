module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    'test-utils\\.(ts|tsx|js|jsx)$'  // Exclude test-utils files
  ],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  setupFiles: ['./jest.setup.cjs'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^.+\\.svg$': 'jest-svg-transformer',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock imports that use import.meta
    '^.*/axiosInstance$': '<rootDir>/src/__mocks__/axiosInstance.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@chakra-ui|@emotion|framer-motion|react-icons)/)'
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
}; 