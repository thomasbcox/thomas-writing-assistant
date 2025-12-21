import { describe, test, expect, afterAll } from "@jest/globals";
import {
  createTestDb,
  createTestDbFile,
  migrateTestDb,
  cleanupTestData,
  closeTestDb,
} from "./test-utils";
import { unlinkSync, existsSync } from "fs";
import { concept } from "~/server/schema";

describe("Test Utils", () => {
  test("should create test database file", async () => {
    const testDbPath = "./test-file.db";
    const { db, dbPath } = createTestDbFile(testDbPath);

    expect(dbPath).toBe(testDbPath);
    expect(db).toBeDefined();

    // Initialize schema
    await migrateTestDb(db);

    // Verify it works by querying
    await db.select().from(concept).limit(1);

    closeTestDb(db);

    // Clean up
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  test("should clean up existing test database file", async () => {
    const testDbPath = "./test-cleanup.db";

    // Create first database
    const { db: db1 } = createTestDbFile(testDbPath);
    await migrateTestDb(db1);
    closeTestDb(db1);

    // Verify file exists
    expect(existsSync(testDbPath)).toBe(true);

    // Create second database (should clean up first)
    const { db: db2 } = createTestDbFile(testDbPath);
    await migrateTestDb(db2);
    closeTestDb(db2);

    // Clean up
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  test("should handle initTestDb", async () => {
    const db = createTestDb();

    // Initialize schema
    await migrateTestDb(db);

    // Verify it works
    await db.select().from(concept).limit(1);

    closeTestDb(db);
  });

  afterAll(async () => {
    // Clean up any test database files
    const testFiles = ["./test-file.db", "./test-cleanup.db"];
    for (const file of testFiles) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  });
});
