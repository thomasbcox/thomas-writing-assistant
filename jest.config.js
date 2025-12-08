import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    // Map @prisma/client directly to the generated client to bypass ESM issues
    '^@prisma/client$': '<rootDir>/node_modules/.prisma/client/client.ts',
  },
  // Transform Prisma packages - need to handle both .ts and .mjs
  transformIgnorePatterns: [
    'node_modules/(?!(@prisma|.prisma)/)',
  ],
  // Handle ESM in node_modules
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  // Handle ESM modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
  ],
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/test/**/*.test.ts', '!<rootDir>/src/test/components/**'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
        '^.+\\.mjs$': ['ts-jest', {
          useESM: true,
        }],
        'node_modules/@prisma/client/.*\\.js$': ['ts-jest', {
          useESM: true,
        }],
      },
      moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/src/$1',
        '^@prisma/client$': '<rootDir>/node_modules/.prisma/client/client.ts',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@prisma|.prisma)/)',
      ],
      moduleFileExtensions: ['ts', 'js', 'json', 'mjs'],
      extensionsToTreatAsEsm: ['.ts'],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/test/components/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/src/$1',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    },
  ],
};

export default config;
