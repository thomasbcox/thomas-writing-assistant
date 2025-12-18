import { PrismaClient } from "@prisma/client";

// @ts-expect-error - PrismaClient type definition issue with empty config
const prisma = new PrismaClient({});

async function checkData() {
  try {
    const counts = {
      concepts: await prisma.concept.count(),
      links: await prisma.link.count(),
      capsules: await prisma.capsule.count(),
      anchors: await prisma.anchor.count(),
      repurposedContent: await prisma.repurposedContent.count(),
      linkNames: await prisma.linkName.count(),
      mruConcepts: await prisma.mRUConcept.count(),
    };

    console.log("\n=== Database Record Counts ===\n");
    console.log(JSON.stringify(counts, null, 2));

    if (counts.concepts > 0) {
      console.log("\n=== Sample Concepts ===\n");
      const sampleConcepts = await prisma.concept.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      });
      console.log(JSON.stringify(sampleConcepts, null, 2));
    }

    if (counts.capsules > 0) {
      console.log("\n=== Sample Capsules ===\n");
      const sampleCapsules = await prisma.capsule.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      });
      console.log(JSON.stringify(sampleCapsules, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

