import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
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
    await db.$disconnect();
  });

  test("should get all link names including defaults", async () => {
    const result = await caller.linkName.getAll();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    // Should include default link names
    expect(result).toContain("references");
    expect(result).toContain("builds on");
  });

  test("should create a custom link name", async () => {
    const result = await caller.linkName.create({
      name: "custom relationship",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("custom relationship");
    expect(result.isDefault).toBe(false);

    // Should appear in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).toContain("custom relationship");
  });

  test("should return existing link name if it already exists", async () => {
    const created = await caller.linkName.create({
      name: "existing name",
    });

    const result = await caller.linkName.create({
      name: "existing name",
    });

    expect(result.id).toBe(created.id);
  });

  test("should trim whitespace from link name", async () => {
    const result = await caller.linkName.create({
      name: "  trimmed name  ",
    });

    expect(result.name).toBe("trimmed name");
  });

  test("should reject empty link name", async () => {
    await expect(
      caller.linkName.create({ name: "   " })
    ).rejects.toThrow("Link name cannot be empty");
  });

  test("should update a link name", async () => {
    const created = await caller.linkName.create({
      name: "old name",
    });

    const result = await caller.linkName.update({
      oldName: "old name",
      newName: "new name",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBeGreaterThanOrEqual(0);

    // Old name should not be in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).not.toContain("old name");
    expect(allNames).toContain("new name");
  });

  test("should update link name and update existing links", async () => {
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

    const linkName = await caller.linkName.create({
      name: "old link name",
    });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "old link name",
    });

    const result = await caller.linkName.update({
      oldName: "old link name",
      newName: "new link name",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);

    // Check that link was updated
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("new link name");
  });

  test("should reject empty new name in update", async () => {
    await caller.linkName.create({ name: "test name" });

    await expect(
      caller.linkName.update({
        oldName: "test name",
        newName: "   ",
      })
    ).rejects.toThrow("New name cannot be empty");
  });

  test("should delete a default link name (mark as deleted)", async () => {
    const result = await caller.linkName.delete({
      name: "references",
    });

    expect(result.success).toBe(true);

    // Should not appear in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).not.toContain("references");
  });

  test("should delete a custom link name", async () => {
    const created = await caller.linkName.create({
      name: "custom to delete",
    });

    const result = await caller.linkName.delete({
      name: "custom to delete",
    });

    expect(result.success).toBe(true);

    // Should not appear in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).not.toContain("custom to delete");
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

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "references",
    });

    await expect(
      caller.linkName.delete({ name: "references" })
    ).rejects.toThrow("Cannot delete default link name that is in use without replacement");
  });

  test("should get usage of a link name", async () => {
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

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "references",
    });

    const usage = await caller.linkName.getUsage({ name: "references" });

    expect(usage.count).toBeGreaterThan(0);
    expect(usage.isDefault).toBe(true);
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

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "references",
    });

    const customName = await caller.linkName.create({
      name: "replacement name",
    });

    const result = await caller.linkName.delete({
      name: "references",
      replaceWith: "replacement name",
    });

    expect(result.success).toBe(true);

    // Check that links were updated
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("replacement name");
  });

  test("should update link name when old name doesn't exist in database", async () => {
    // Update a default link name that hasn't been created in DB yet
    const result = await caller.linkName.update({
      oldName: "references",
      newName: "updated references",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(0); // No links to update

    // New name should be in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).toContain("updated references");
  });

  test("should handle update when new name already exists", async () => {
    // Create a custom link name
    await caller.linkName.create({ name: "existing name" });

    // Update another name to the existing one
    await caller.linkName.create({ name: "to update" });

    const result = await caller.linkName.update({
      oldName: "to update",
      newName: "existing name",
    });

    expect(result.success).toBe(true);
  });

  test("should delete default link name not in use", async () => {
    // Delete a default that's not being used
    const result = await caller.linkName.delete({ name: "opposes" });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0);

    // Should not appear in getAll
    const allNames = await caller.linkName.getAll();
    expect(allNames).not.toContain("opposes");
  });

  test("should delete custom link name with replacement", async () => {
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

    await caller.linkName.create({ name: "custom link" });
    await caller.linkName.create({ name: "replacement link" });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "custom link",
    });

    const result = await caller.linkName.delete({
      name: "custom link",
      replaceWith: "replacement link",
    });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(1);

    // Check that link was updated
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("replacement link");
  });

  test("should update link name when both forward and reverse names match", async () => {
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

    await caller.linkName.create({ name: "old name" });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "old name",
      reverseName: "old name",
    });

    const result = await caller.linkName.update({
      oldName: "old name",
      newName: "new name",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);

    // Check that both forward and reverse names were updated
    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("new name");
    expect(updatedLink?.reverseName).toBe("new name");
  });

  test("should handle update when link has only forward name matching", async () => {
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

    await caller.linkName.create({ name: "old forward" });
    await caller.linkName.create({ name: "different reverse" });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "old forward",
      reverseName: "different reverse",
    });

    const result = await caller.linkName.update({
      oldName: "old forward",
      newName: "new forward",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);

    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("new forward");
    expect(updatedLink?.reverseName).toBe("different reverse"); // Should remain unchanged
  });

  test("should handle update when link has only reverse name matching", async () => {
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

    await caller.linkName.create({ name: "different forward" });
    await caller.linkName.create({ name: "old reverse" });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "different forward",
      reverseName: "old reverse",
    });

    const result = await caller.linkName.update({
      oldName: "old reverse",
      newName: "new reverse",
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);

    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("different forward"); // Should remain unchanged
    expect(updatedLink?.reverseName).toBe("new reverse");
  });

  test("should handle delete with replacement when link has both forward and reverse matching", async () => {
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

    await caller.linkName.create({ name: "to replace" });
    await caller.linkName.create({ name: "replacement" });

    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      forwardName: "to replace",
      reverseName: "to replace",
    });

    const result = await caller.linkName.delete({
      name: "to replace",
      replaceWith: "replacement",
    });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(1);

    const links = await caller.link.getAll();
    const updatedLink = links.find(
      (l) => l.sourceId === concept1.id && l.targetId === concept2.id
    );
    expect(updatedLink?.forwardName).toBe("replacement");
    expect(updatedLink?.reverseName).toBe("replacement");
  });
});

