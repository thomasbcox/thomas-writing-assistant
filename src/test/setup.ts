import '@testing-library/jest-dom';

// Prevent accidental Prisma client initialization in tests
// Individual test files should mock ~/server/db explicitly
// This is a safety net to prevent adapter errors
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

