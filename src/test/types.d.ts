/**
 * Type declarations for test files
 * Extends Jest matchers with @testing-library/jest-dom types
 */

import "@testing-library/jest-dom";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// Extend the expect matchers from @jest/expect
declare module "@jest/expect" {
  interface Matchers<R extends void | Promise<void>>
    extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}
