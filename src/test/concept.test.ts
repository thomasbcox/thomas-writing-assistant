import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
} from "./test-utils";

describe("Concept Router", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);

  beforeAll(async () => {
    // Initialize database schema
    await migrateTestDb(db);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(db);
  });

  afterAll(async () => {
    // Clean up and disconnect
    await cleanupTestData(db);
    await db.$disconnect();
  });

  test("should create a new concept", async () => {
    const result = await caller.concept.create({
      title: "Test Concept",
      description: "A test concept",
      content: "This is test content",
      creator: "Test User",
      source: "Test Source",
      year: "2024",
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Test Concept");
    expect(result.description).toBe("A test concept");
    expect(result.identifier).toMatch(/^zettel-/);
    expect(result.status).toBe("active");
  });

  test("should require all required fields", async () => {
    await expect(
      caller.concept.create({
        title: "",
        description: "",
        content: "",
        creator: "",
        source: "",
        year: "",
      })
    ).rejects.toThrow();
  });

  test("should list all active concepts", async () => {
    // Create test concepts
    await caller.concept.create({
      title: "Active Concept 1",
      description: "First concept",
      content: "Content 1",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.create({
      title: "Active Concept 2",
      description: "Second concept",
      content: "Content 2",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const result = await caller.concept.list({ includeTrash: false });

    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === "active")).toBe(true);
  });

  test("should filter by search term", async () => {
    await caller.concept.create({
      title: "JavaScript Concepts",
      description: "JS related",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.create({
      title: "Python Concepts",
      description: "Python related",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const result = await caller.concept.list({
      includeTrash: false,
      search: "JavaScript",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("JavaScript Concepts");
  });

  test("should retrieve a concept by id", async () => {
    const created = await caller.concept.create({
      title: "Test Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const result = await caller.concept.getById({ id: created.id });

    expect(result.id).toBe(created.id);
    expect(result.title).toBe("Test Concept");
  });

  test("should throw NOT_FOUND for non-existent concept", async () => {
    await expect(
      caller.concept.getById({ id: "non-existent-id" })
    ).rejects.toThrow("Concept not found");
  });

  test("should update a concept", async () => {
    const created = await caller.concept.create({
      title: "Original Title",
      description: "Original",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const updated = await caller.concept.update({
      id: created.id,
      title: "Updated Title",
      description: "Updated",
      content: "Updated Content",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.description).toBe("Updated");
    expect(updated.content).toBe("Updated Content");
  });

  test("should soft delete a concept", async () => {
    const created = await caller.concept.create({
      title: "To Delete",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: created.id });

    const result = await caller.concept.getById({ id: created.id });
    expect(result.status).toBe("trash");
    expect(result.trashedAt).toBeDefined();
  });

  test("should restore a trashed concept", async () => {
    const created = await caller.concept.create({
      title: "To Restore",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: created.id });
    await caller.concept.restore({ id: created.id });

    const result = await caller.concept.getById({ id: created.id });
    expect(result.status).toBe("active");
    expect(result.trashedAt).toBeNull();
  });

  test("should list concepts including trash when requested", async () => {
    const active = await caller.concept.create({
      title: "Active Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const trashed = await caller.concept.create({
      title: "Trashed Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: trashed.id });

    const result = await caller.concept.list({ includeTrash: true });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((c) => c.status === "trash")).toBe(true);
    expect(result.some((c) => c.status === "active")).toBe(true);
  });

  test("should get concept with links", async () => {
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

    const result = await caller.concept.getById({ id: concept1.id });

    expect(result.outgoingLinks).toBeDefined();
    expect(result.outgoingLinks.length).toBeGreaterThan(0);
    expect(result.incomingLinks).toBeDefined();
  });

  test("should purge old trashed concepts", async () => {
    // Create and trash a concept
    const concept1 = await caller.concept.create({
      title: "Old Trashed Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: concept1.id });

    // Manually update trashedAt to be 31 days ago
    await db.concept.update({
      where: { id: concept1.id },
      data: {
        trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      },
    });

    // Create another trashed concept that's only 10 days old
    const concept2 = await caller.concept.create({
      title: "Recent Trashed Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: concept2.id });

    await db.concept.update({
      where: { id: concept2.id },
      data: {
        trashedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    // Purge concepts older than 30 days
    const result = await caller.concept.purgeTrash({ daysOld: 30 });

    expect(result.deletedCount).toBe(1);

    // Old concept should be gone
    await expect(
      caller.concept.getById({ id: concept1.id })
    ).rejects.toThrow("Concept not found");

    // Recent concept should still exist
    const recent = await caller.concept.getById({ id: concept2.id });
    expect(recent.status).toBe("trash");
  });

  test("should purge with custom daysOld parameter", async () => {
    const concept = await caller.concept.create({
      title: "Custom Days Concept",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    await caller.concept.delete({ id: concept.id });

    // Set trashedAt to 15 days ago
    await db.concept.update({
      where: { id: concept.id },
      data: {
        trashedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    });

    // Purge with 10 days (should delete)
    const result1 = await caller.concept.purgeTrash({ daysOld: 10 });
    expect(result1.deletedCount).toBe(1);

    // Verify it's gone
    await expect(
      caller.concept.getById({ id: concept.id })
    ).rejects.toThrow("Concept not found");
  });
});

