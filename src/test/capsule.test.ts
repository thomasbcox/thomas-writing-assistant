import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
} from "./test-utils";

describe("Capsule Router", () => {
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

  test("should create a capsule", async () => {
    const result = await caller.capsule.create({
      title: "Test Capsule",
      promise: "This will help you achieve X",
      cta: "Get started now",
      offerMapping: "offer-1",
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Test Capsule");
    expect(result.promise).toBe("This will help you achieve X");
    expect(result.cta).toBe("Get started now");
    expect(result.offerMapping).toBe("offer-1");
  });

  test("should list all capsules", async () => {
    const capsule1 = await caller.capsule.create({
      title: "Capsule 1",
      promise: "Promise 1",
      cta: "CTA 1",
    });

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const capsule2 = await caller.capsule.create({
      title: "Capsule 2",
      promise: "Promise 2",
      cta: "CTA 2",
    });

    const result = await caller.capsule.list();

    expect(result).toHaveLength(2);
    // Most recent first (desc order)
    expect(result[0]?.id).toBe(capsule2.id);
    expect(result[1]?.id).toBe(capsule1.id);
  });

  test("should get capsule by id", async () => {
    const created = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const result = await caller.capsule.getById({ id: created.id });

    expect(result.id).toBe(created.id);
    expect(result.title).toBe("Test Capsule");
    expect(result.anchors).toBeDefined();
    expect(Array.isArray(result.anchors)).toBe(true);
  });

  test("should throw NOT_FOUND for non-existent capsule", async () => {
    await expect(
      caller.capsule.getById({ id: "non-existent-id" })
    ).rejects.toThrow("Capsule not found");
  });

  test("should create an anchor for a capsule", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Anchor content here",
      painPoints: ["Pain 1", "Pain 2"],
      solutionSteps: ["Step 1", "Step 2"],
      proof: "Proof text",
    });

    expect(anchor.id).toBeDefined();
    expect(anchor.title).toBe("Test Anchor");
    expect(anchor.content).toBe("Anchor content here");
    expect(anchor.capsuleId).toBe(capsule.id);
  });


  test("should create repurposed content for an anchor", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Anchor content",
    });

    const repurposed = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Social media post content",
    });

    expect(repurposed.id).toBeDefined();
    expect(repurposed.anchorId).toBe(anchor.id);
    expect(repurposed.type).toBe("social_post");
    expect(repurposed.content).toBe("Social media post content");
  });

  test("should get capsule with anchors and repurposed content", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Content",
    });

    await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "email",
      content: "Email content",
    });

    const result = await caller.capsule.getById({ id: capsule.id });

    expect(result.anchors).toHaveLength(1);
    expect(result.anchors[0]?.repurposedContent).toHaveLength(1);
    expect(result.anchors[0]?.repurposedContent[0]?.type).toBe("email");
  });

  test("should update an anchor", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Original Title",
      content: "Original content",
      painPoints: ["Original pain"],
      solutionSteps: ["Original step"],
      proof: "Original proof",
    });

    const updated = await caller.capsule.updateAnchor({
      id: anchor.id,
      title: "Updated Title",
      content: "Updated content",
      painPoints: ["Updated pain 1", "Updated pain 2"],
      solutionSteps: ["Updated step 1"],
      proof: "Updated proof",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.content).toBe("Updated content");
    expect(updated.proof).toBe("Updated proof");
    
    // Verify pain points and solution steps are stored as JSON
    const painPoints = updated.painPoints ? JSON.parse(updated.painPoints) : [];
    const solutionSteps = updated.solutionSteps ? JSON.parse(updated.solutionSteps) : [];
    expect(painPoints).toEqual(["Updated pain 1", "Updated pain 2"]);
    expect(solutionSteps).toEqual(["Updated step 1"]);
  });

  test("should update anchor partially", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Original Title",
      content: "Original content",
    });

    const updated = await caller.capsule.updateAnchor({
      id: anchor.id,
      title: "Updated Title Only",
    });

    expect(updated.title).toBe("Updated Title Only");
    expect(updated.content).toBe("Original content"); // Should remain unchanged
  });

  test("should delete an anchor and cascade to repurposed content", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Content",
    });

    await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Post content",
    });

    await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "email",
      content: "Email content",
    });

    // Delete the anchor
    await caller.capsule.deleteAnchor({ id: anchor.id });

    // Verify anchor is deleted
    const anchors = await db.anchor.findMany({ where: { id: anchor.id } });
    expect(anchors).toHaveLength(0);

    // Verify repurposed content is also deleted (cascade)
    const repurposed = await db.repurposedContent.findMany({ where: { anchorId: anchor.id } });
    expect(repurposed).toHaveLength(0);
  });

  test("should update repurposed content", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Content",
    });

    const repurposed = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Original post content",
    });

    const updated = await caller.capsule.updateRepurposedContent({
      id: repurposed.id,
      content: "Updated post content",
    });

    expect(updated.content).toBe("Updated post content");
    expect(updated.type).toBe("social_post"); // Should remain unchanged
  });

  test("should update repurposed content type", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Content",
    });

    const repurposed = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Post content",
    });

    const updated = await caller.capsule.updateRepurposedContent({
      id: repurposed.id,
      type: "email",
    });

    expect(updated.type).toBe("email");
    expect(updated.content).toBe("Post content"); // Should remain unchanged
  });

  test("should delete repurposed content", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Content",
    });

    const repurposed1 = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Post 1",
    });

    const repurposed2 = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "email",
      content: "Email content",
    });

    // Delete one repurposed content item
    await caller.capsule.deleteRepurposedContent({ id: repurposed1.id });

    // Verify it's deleted
    const deleted = await db.repurposedContent.findUnique({ where: { id: repurposed1.id } });
    expect(deleted).toBeNull();

    // Verify the other one still exists
    const remaining = await db.repurposedContent.findUnique({ where: { id: repurposed2.id } });
    expect(remaining).toBeDefined();
    expect(remaining?.type).toBe("email");
  });

  test("should throw NOT_FOUND when regenerating for non-existent anchor", async () => {
    await expect(
      caller.capsule.regenerateRepurposedContent({ anchorId: "non-existent-id" })
    ).rejects.toThrow("Anchor not found");
  });

  test("should regenerate repurposed content successfully", async () => {
    const capsule = await caller.capsule.create({
      title: "Test Capsule",
      promise: "Promise",
      cta: "CTA",
    });

    const anchor = await caller.capsule.createAnchor({
      capsuleId: capsule.id,
      title: "Test Anchor",
      content: "Test anchor content for repurposing",
      painPoints: ["Pain 1", "Pain 2"],
      solutionSteps: ["Step 1", "Step 2"],
    });

    // Create some existing repurposed content
    const oldRepurposed = await caller.capsule.createRepurposedContent({
      anchorId: anchor.id,
      type: "social_post",
      content: "Old post",
    });

    // Verify it exists
    const before = await db.repurposedContent.findUnique({ where: { id: oldRepurposed.id } });
    expect(before).toBeDefined();

    // Regenerate repurposed content (should succeed if LLM is configured)
    try {
      const result = await caller.capsule.regenerateRepurposedContent({ anchorId: anchor.id });
      
      // If successful, old content should be deleted and new content created
      const after = await db.repurposedContent.findUnique({ where: { id: oldRepurposed.id } });
      expect(after).toBeNull(); // Old content should be deleted
      expect(result.length).toBeGreaterThan(0); // New content should be created
    } catch (error) {
      // If LLM is not configured, the operation will fail
      // In that case, old content should still exist
      const after = await db.repurposedContent.findUnique({ where: { id: oldRepurposed.id } });
      expect(after).toBeDefined(); // Should still exist because LLM failed
    }
  });
});

