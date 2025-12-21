import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
  closeTestDb,
} from "./test-utils";

describe("Link Router", () => {
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

  test("should create a link between two concepts", async () => {
    // Create two concepts
    const source = await caller.concept.create({
      title: "Source Concept",
      description: "Source",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const target = await caller.concept.create({
      title: "Target Concept",
      description: "Target",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get or create a link name pair
    const linkNames = await caller.linkName.getAll();
    const linkNamePair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];
    
    if (!linkNamePair) {
      throw new Error("No link name pairs available for test");
    }

    // Create link
    const link = await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: linkNamePair.id,
    });

    expect(link.id).toBeDefined();
    expect(link.sourceId).toBe(source.id);
    expect(link.targetId).toBe(target.id);
    expect(link.linkNameId).toBe(linkNamePair.id);
    expect(link.linkName).toBeDefined();
    expect(link.linkName.forwardName).toBe("references");
    expect(link.linkName.reverseName).toBe("referenced by");
  });

  test("should update existing link if it already exists", async () => {
    const source = await caller.concept.create({
      title: "Source",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const target = await caller.concept.create({
      title: "Target",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get link name pairs
    const linkNames = await caller.linkName.getAll();
    const referencesPair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];
    const buildsOnPair = linkNames.find((ln) => ln.forwardName === "builds on");
    
    if (!referencesPair || !buildsOnPair) {
      // Create builds on pair if it doesn't exist
      const newPair = await caller.linkName.create({
        forwardName: "builds on",
        reverseName: "built on by",
      });
      const linkNames2 = await caller.linkName.getAll();
      const buildsOnPair2 = linkNames2.find((ln) => ln.id === newPair.id);
      if (!buildsOnPair2) throw new Error("Failed to create link name pair");
    }

    const linkNamesFinal = await caller.linkName.getAll();
    const referencesPairFinal = linkNamesFinal.find((ln) => ln.forwardName === "references") || linkNamesFinal[0];
    const buildsOnPairFinal = linkNamesFinal.find((ln) => ln.forwardName === "builds on") || linkNamesFinal[1];

    // Create first link
    const link1 = await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: referencesPairFinal.id,
    });

    // Update the same link with different linkNameId
    const link2 = await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: buildsOnPairFinal.id,
    });

    expect(link2.id).toBe(link1.id);
    expect(link2.linkNameId).toBe(buildsOnPairFinal.id);
    expect(link2.linkName.forwardName).toBe("builds on");
    expect(link2.linkName.reverseName).toBe("built on by");
  });

  test("should update existing link with notes", async () => {
    const source = await caller.concept.create({
      title: "Source",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const target = await caller.concept.create({
      title: "Target",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get link name pair
    const linkNames = await caller.linkName.getAll();
    const linkNamePair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];

    // Create link with notes
    const link1 = await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: linkNamePair.id,
      notes: "Initial notes",
    });

    // Update with new notes
    const link2 = await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: linkNamePair.id,
      notes: "Updated notes",
    });

    expect(link2.id).toBe(link1.id);
    expect(link2.notes).toBe("Updated notes");
  });

  test("should return all links", async () => {
    const source = await caller.concept.create({
      title: "Source",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const target = await caller.concept.create({
      title: "Target",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const linkNames = await caller.linkName.getAll();
    const linkNamePair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];

    await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: linkNamePair.id,
    });

    const links = await caller.link.getAll();

    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.source).toBeDefined();
    expect(links[0]?.target).toBeDefined();
    expect(links[0]?.linkName).toBeDefined();
  });

  test("should return outgoing and incoming links for a concept", async () => {
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

    const concept3 = await caller.concept.create({
      title: "Concept 3",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    // Get link name pair
    const linkNames = await caller.linkName.getAll();
    const linkNamePair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];
    
    if (!linkNamePair) {
      throw new Error("No link name pairs available for test");
    }

    // Concept 1 -> Concept 2 (outgoing from concept1)
    await caller.link.create({
      sourceId: concept1.id,
      targetId: concept2.id,
      linkNameId: linkNamePair.id,
    });

    // Concept 3 -> Concept 1 (incoming to concept1)
    await caller.link.create({
      sourceId: concept3.id,
      targetId: concept1.id,
      linkNameId: linkNamePair.id,
    });

    const result = await caller.link.getByConcept({ conceptId: concept1.id });

    expect(result.outgoing).toHaveLength(1);
    expect(result.incoming).toHaveLength(1);
    expect(result.outgoing[0]?.target.id).toBe(concept2.id);
    expect(result.incoming[0]?.source.id).toBe(concept3.id);
  });

  test("should delete a link", async () => {
    const source = await caller.concept.create({
      title: "Source",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const target = await caller.concept.create({
      title: "Target",
      description: "Test",
      content: "Content",
      creator: "User",
      source: "Source",
      year: "2024",
    });

    const linkNames = await caller.linkName.getAll();
    const linkNamePair = linkNames.find((ln) => ln.forwardName === "references") || linkNames[0];

    await caller.link.create({
      sourceId: source.id,
      targetId: target.id,
      linkNameId: linkNamePair.id,
    });

    await caller.link.delete({
      sourceId: source.id,
      targetId: target.id,
    });

    const links = await caller.link.getAll();
    const found = links.find(
      (l) => l.sourceId === source.id && l.targetId === target.id
    );
    expect(found).toBeUndefined();
  });
});

