import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
  closeTestDb,
} from "./test-utils";

// Skip AI tests if OPENAI_API_KEY is not set
const hasApiKey = !!process.env.OPENAI_API_KEY;
const describeIf = hasApiKey ? describe : describe.skip;

describeIf("AI Router", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);

  beforeAll(async () => {
    await migrateTestDb(db);
  });

  afterAll(async () => {
    await cleanupTestData(db);
    closeTestDb(db);
  });

  test("should get AI settings", async () => {
    const result = await caller.ai.getSettings();

    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("temperature");
    expect(typeof result.model).toBe("string");
    expect(typeof result.temperature).toBe("number");
  });

  test("should update AI model", async () => {
    const result = await caller.ai.updateSettings({
      model: "gpt-4",
    });

    expect(result.model).toBe("gpt-4");
  });

  test("should update AI temperature", async () => {
    const result = await caller.ai.updateSettings({
      temperature: 0.9,
    });

    expect(result.temperature).toBe(0.9);
  });

  test("should update both model and temperature", async () => {
    const result = await caller.ai.updateSettings({
      model: "gpt-4o",
      temperature: 0.8,
    });

    expect(result.model).toBe("gpt-4o");
    expect(result.temperature).toBe(0.8);
  });
});

