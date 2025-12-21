import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
  closeTestDb,
} from "./test-utils";

describe("LinkName Router", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);

  beforeAll(async () => {
    await migrateTestDb(db);
  });

  beforeEach(async () => {
    await cleanupTestData(db);
  });

  afterAll(async () => {
    await cleanupTestData(db);
    closeTestDb(db);
  });

  test("should get all link name pairs including defaults", async () => {
    const result = await caller.linkName.getAll();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    // Should include default link name pairs
    const hasReferences = result.some((ln) => ln.forwardName === "references");
    const hasBuildsOn = result.some((ln) => ln.forwardName === "builds on");
    expect(hasReferences).toBe(true);
    expect(hasBuildsOn).toBe(true);
  });

  test("should create a custom link name pair", async () => {
    const result = await caller.linkName.create({
      forwardName: "custom relationship",
      reverseName: "related to custom",
    });

    expect(result.id).toBeDefined();
    expect(result.forwardName).toBe("custom relationship");
    expect(result.reverseName).toBe("related to custom");
    expect(result.isSymmetric).toBe(false);
    expect(result.isDefault).toBe(false);

    // Should appear in getAll
    const allPairs = await caller.linkName.getAll();
    const found = allPairs.find((ln) => ln.id === result.id);
    expect(found).toBeDefined();
  });

  test("should return existing link name pair if it already exists", async () => {
    const created = await caller.linkName.create({
      forwardName: "existing forward",
      reverseName: "existing reverse",
    });

    const result = await caller.linkName.create({
      forwardName: "existing forward",
      reverseName: "existing reverse",
    });

    expect(result.id).toBe(created.id);
  });

  test("should trim whitespace from link name pair", async () => {
    const result = await caller.linkName.create({
      forwardName: "  trimmed forward  ",
      reverseName: "  trimmed reverse  ",
    });

    expect(result.forwardName).toBe("trimmed forward");
    expect(result.reverseName).toBe("trimmed reverse");
  });

  test("should reject empty forward name", async () => {
    await expect(
      caller.linkName.create({ forwardName: "   " })
    ).rejects.toThrow("Forward name cannot be empty");
  });

  test("should create symmetric link name pair", async () => {
    const result = await caller.linkName.create({
      forwardName: "related to",
      reverseName: "related to",
    });

    expect(result.isSymmetric).toBe(true);
  });

  test("should update a link name pair", async () => {
    const created = await caller.linkName.create({
      forwardName: "old forward",
      reverseName: "old reverse",
    });

    const result = await caller.linkName.update({
      id: created.id,
      forwardName: "new forward",
      reverseName: "new reverse",
    });

    expect(result.success).toBe(true);
    expect(result.linkCount).toBeGreaterThanOrEqual(0);

    // Updated pair should have new names
    const allPairs = await caller.linkName.getAll();
    const updated = allPairs.find((ln) => ln.id === created.id);
    expect(updated).toBeDefined();
    expect(updated?.forwardName).toBe("new forward");
    expect(updated?.reverseName).toBe("new reverse");
  });

  test("should update link name pair and existing links automatically get new names", async () => {
    const concept1 = await caller.concept.create({
      title: "Concept 1",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const concept2 = await caller.concept.create({
      title: "Concept 2",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const linkNamePair = await caller.linkName.create({
      forwardName: "old forward",
      reverseName: "old reverse",
    });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      linkNameId: linkNamePair.id,
    });

    const result = await caller.linkName.update({
      id: linkNamePair.id,
      forwardName: "new forward",
      reverseName: "new reverse",
    });

    expect(result.success).toBe(true);
    expect(result.linkCount).toBe(1);

    // Link should now use updated names via the linkName relation
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.linkName.forwardName).toBe("new forward");
    expect(updatedLink?.linkName.reverseName).toBe("new reverse");
  });

  test("should reject updating with empty forward name", async () => {
    const created = await caller.linkName.create({
      forwardName: "test forward",
      reverseName: "test reverse",
    });

    await expect(
      caller.linkName.update({
        id: created.id,
        forwardName: "   ",
      })
    ).rejects.toThrow("Forward name cannot be empty");
  });

  test("should delete a default link name (mark as deleted)", async () => {
    // Get a default link name pair
    const allPairs = await caller.linkName.getAll();
    const referencesPair = allPairs.find((ln) => ln.forwardName === "references" && ln.isDefault);
    
    if (!referencesPair) {
      // Create it if it doesn't exist
      const created = await caller.linkName.create({
        forwardName: "references",
        reverseName: "referenced by",
      });
      const result = await caller.linkName.delete({ id: created.id });
      expect(result.success).toBe(true);
      return;
    }

    const result = await caller.linkName.delete({
      id: referencesPair.id,
    });

    expect(result.success).toBe(true);

    // Should be marked as deleted (soft delete for defaults)
    const allPairsAfter = await caller.linkName.getAll();
    const deleted = allPairsAfter.find((ln) => ln.id === referencesPair.id);
    expect(deleted?.isDeleted).toBe(true);
  });

  test("should delete a custom link name", async () => {
    const created = await caller.linkName.create({
      forwardName: "custom to delete",
      reverseName: "deleted custom",
    });

    const result = await caller.linkName.delete({
      id: created.id,
    });

    expect(result.success).toBe(true);

    // Should not appear in getAll
    const allPairs = await caller.linkName.getAll();
    const found = allPairs.find((ln) => ln.id === created.id);
    expect(found).toBeUndefined();
  });

  test("should reject deleting default link name in use without replacement", async () => {
    const concept1 = await caller.concept.create({
      title: "Concept 1",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const concept2 = await caller.concept.create({
      title: "Concept 2",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get or create references pair
    const allPairs = await caller.linkName.getAll();
    let referencesPair = allPairs.find((ln) => ln.forwardName === "references");
    if (!referencesPair) {
      referencesPair = await caller.linkName.create({
        forwardName: "references",
        reverseName: "referenced by",
      });
    }

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      linkNameId: referencesPair.id,
    });

    await expect(
      caller.linkName.delete({ id: referencesPair.id })
    ).rejects.toThrow("Cannot delete default link name that is in use without replacement");
  });

  test("should get usage of a link name pair", async () => {
    const concept1 = await caller.concept.create({
      title: "Concept 1",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const concept2 = await caller.concept.create({
      title: "Concept 2",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get or create a link name pair
    const allPairs = await caller.linkName.getAll();
    let linkNamePair = allPairs.find((ln) => ln.forwardName === "references");
    if (!linkNamePair) {
      linkNamePair = await caller.linkName.create({
        forwardName: "references",
        reverseName: "referenced by",
      });
    }

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      linkNameId: linkNamePair.id,
    });

    const usage = await caller.linkName.getUsage({ id: linkNamePair.id });

    expect(usage.count).toBeGreaterThan(0);
    expect(usage.linkName).toBeDefined();
    expect(usage.linkName.forwardName).toBe("references");
    expect(usage.links).toBeDefined();
    expect(usage.links.length).toBeGreaterThan(0);
  });

  test("should delete link name with replacement", async () => {
    const concept1 = await caller.concept.create({
      title: "Concept 1",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const concept2 = await caller.concept.create({
      title: "Concept 2",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const oldPair = await caller.linkName.create({
      forwardName: "old forward",
      reverseName: "old reverse",
    });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      linkNameId: oldPair.id,
    });

    const replacementPair = await caller.linkName.create({
      forwardName: "replacement forward",
      reverseName: "replacement reverse",
    });

    const result = await caller.linkName.delete({
      id: oldPair.id,
      replaceWithId: replacementPair.id,
    });

    expect(result.success).toBe(true);

    // Check that links were updated to use replacement
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.linkNameId).toBe(replacementPair.id);
    expect(updatedLink?.linkName.forwardName).toBe("replacement forward");
  });
});
