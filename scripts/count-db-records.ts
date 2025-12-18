import { PrismaClient } from "@prisma/client";

// @ts-expect-error - PrismaClient type definition issue with empty config
const prisma = new PrismaClient({});

async function countRecords() {
  try {
    console.log("\n=== Database Record Counts ===\n");
    
    const counts = {
      Concept: await prisma.concept.count(),
      Link: await prisma.link.count(),
      Capsule: await prisma.capsule.count(),
      Anchor: await prisma.anchor.count(),
      RepurposedContent: await prisma.repurposedContent.count(),
      LinkName: await prisma.linkName.count(),
      MRUConcept: await prisma.mRUConcept.count(),
    };

    // Also get status breakdowns
    const activeConcepts = await prisma.concept.count({ where: { status: "active" } });
    const trashedConcepts = await prisma.concept.count({ where: { status: "trash" } });

    console.log("Table                    | Count");
    console.log("-------------------------|-------");
    console.log(`Concept                  | ${counts.Concept.toString().padStart(5)} (${activeConcepts} active, ${trashedConcepts} trashed)`);
    console.log(`Link                     | ${counts.Link.toString().padStart(5)}`);
    console.log(`Capsule                  | ${counts.Capsule.toString().padStart(5)}`);
    console.log(`Anchor                   | ${counts.Anchor.toString().padStart(5)}`);
    console.log(`RepurposedContent        | ${counts.RepurposedContent.toString().padStart(5)}`);
    console.log(`LinkName                 | ${counts.LinkName.toString().padStart(5)}`);
    console.log(`MRUConcept               | ${counts.MRUConcept.toString().padStart(5)}`);
    console.log("\n");

    // Show sample data for verification
    if (counts.Concept > 0) {
      console.log("=== Sample Concepts (first 3) ===");
      const samples = await prisma.concept.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
      });
      samples.forEach((c, i) => {
        console.log(`${i + 1}. [${c.status}] ${c.title}`);
        if (c.description) console.log(`   ${c.description.slice(0, 60)}...`);
      });
      console.log("\n");
    }

    if (counts.Capsule > 0) {
      console.log("=== Sample Capsules (first 3) ===");
      const samples = await prisma.capsule.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
        },
        orderBy: { createdAt: "desc" },
      });
      samples.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title}`);
      });
      console.log("\n");
    }

    if (counts.Link > 0) {
      console.log("=== Sample Links (first 3) ===");
      const samples = await prisma.link.findMany({
        take: 3,
        select: {
          id: true,
          forwardName: true,
          reverseName: true,
          source: { select: { title: true } },
          target: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      samples.forEach((l, i) => {
        console.log(`${i + 1}. ${l.source.title} --[${l.forwardName}]--> ${l.target.title}`);
      });
      console.log("\n");
    }

    return counts;
  } catch (error) {
    console.error("Error counting records:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

countRecords()
  .then(() => {
    console.log("✅ Record count complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
