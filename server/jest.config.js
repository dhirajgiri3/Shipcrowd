/**
 * Jest Configuration for Helix Backend
 * Configured for TypeScript with MongoDB Memory Server
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/*.interface.ts',
        '!src/types/**'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
    globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts',
    setupFilesAfterEnv: ['<rootDir>/tests/setup/testHelpers.ts'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    // CRITICAL: Run tests serially to prevent database conflicts
    // Tests were failing due to parallel execution causing race conditions
    maxWorkers: 1,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: false,
            isolatedModules: true
        }]
    },
    // Transform ESM packages that Jest cannot handle natively
    transformIgnorePatterns: [
        'node_modules/(?!(@faker-js/faker)/)'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
