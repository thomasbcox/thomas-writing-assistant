import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { offer, capsule } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { logger, logServiceError } from "../../src/lib/logger.js";

// Input schemas
const createOfferSchema = z.object({
  name: z.string().min(1, "Offer name is required"),
  description: z.string().optional(),
});

const updateOfferSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const deleteOfferSchema = z.object({
  id: z.string(),
});

const getByIdSchema = z.object({
  id: z.string(),
});

const assignCapsuleSchema = z.object({
  capsuleId: z.string(),
  offerId: z.string().nullable(), // null to unassign
});

export function registerOfferHandlers() {
  // List all offers with their capsule counts
  ipcMain.handle("offer:list", async (_event, input: unknown) => {
    const db = getDb();

    logger.info({ operation: "offer:list" }, "Fetching all offers");

    try {
      const offers = await db.query.offer.findMany({
        with: {
          capsules: true,
        },
        orderBy: [desc(offer.createdAt)],
      });

      // Add capsule count to each offer
      const offersWithCount = offers.map(o => ({
        ...o,
        capsuleCount: o.capsules?.length ?? 0,
      }));

      logger.info({ operation: "offer:list", count: offers.length }, "Offers fetched successfully");
      return offersWithCount;
    } catch (error) {
      logServiceError(error, "offer.list");
      throw error;
    }
  });

  // Get offer by ID with capsules
  ipcMain.handle("offer:getById", async (_event, input: unknown) => {
    const parsed = getByIdSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:getById", offerId: parsed.id }, "Fetching offer by ID");

    try {
      const foundOffer = await db.query.offer.findFirst({
        where: eq(offer.id, parsed.id),
        with: {
          capsules: {
            with: {
              anchors: true,
            },
          },
        },
      });

      if (!foundOffer) {
        logger.warn({ operation: "offer:getById", offerId: parsed.id }, "Offer not found");
        throw new Error("Offer not found");
      }

      logger.info({ operation: "offer:getById", offerId: parsed.id, capsuleCount: foundOffer.capsules?.length ?? 0 }, "Offer fetched successfully");
      return foundOffer;
    } catch (error) {
      logServiceError(error, "offer.getById", { offerId: parsed.id });
      throw error;
    }
  });

  // Create a new offer
  ipcMain.handle("offer:create", async (_event, input: unknown) => {
    const parsed = createOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:create", name: parsed.name }, "Creating offer");

    try {
      const [newOffer] = await db
        .insert(offer)
        .values({
          name: parsed.name,
          description: parsed.description ?? null,
        })
        .returning();

      logger.info({ operation: "offer:create", offerId: newOffer.id, name: parsed.name }, "Offer created successfully");
      return newOffer;
    } catch (error) {
      logServiceError(error, "offer.create", { name: parsed.name });
      throw error;
    }
  });

  // Update an offer
  ipcMain.handle("offer:update", async (_event, input: unknown) => {
    const parsed = updateOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:update", offerId: parsed.id }, "Updating offer");

    try {
      const { id, ...updateData } = parsed;

      const [updatedOffer] = await db
        .update(offer)
        .set(updateData)
        .where(eq(offer.id, id))
        .returning();

      if (!updatedOffer) {
        logger.warn({ operation: "offer:update", offerId: id }, "Offer not found");
        throw new Error("Offer not found");
      }

      logger.info({ operation: "offer:update", offerId: id }, "Offer updated successfully");
      return updatedOffer;
    } catch (error) {
      logServiceError(error, "offer.update", { offerId: parsed.id });
      throw error;
    }
  });

  // Delete an offer (capsules are unassigned, not deleted)
  ipcMain.handle("offer:delete", async (_event, input: unknown) => {
    const parsed = deleteOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:delete", offerId: parsed.id }, "Deleting offer");

    try {
      // Check if offer exists
      const existingOffer = await db.query.offer.findFirst({
        where: eq(offer.id, parsed.id),
        with: { capsules: true },
      });

      if (!existingOffer) {
        logger.warn({ operation: "offer:delete", offerId: parsed.id }, "Offer not found");
        throw new Error("Offer not found");
      }

      // Delete the offer (capsules will have offerId set to null due to ON DELETE SET NULL)
      await db.delete(offer).where(eq(offer.id, parsed.id));

      logger.info({ operation: "offer:delete", offerId: parsed.id, unassignedCapsules: existingOffer.capsules?.length ?? 0 }, "Offer deleted successfully");
      return { deleted: true, unassignedCapsules: existingOffer.capsules?.length ?? 0 };
    } catch (error) {
      logServiceError(error, "offer.delete", { offerId: parsed.id });
      throw error;
    }
  });

  // Assign a capsule to an offer
  ipcMain.handle("offer:assignCapsule", async (_event, input: unknown) => {
    const parsed = assignCapsuleSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:assignCapsule", capsuleId: parsed.capsuleId, offerId: parsed.offerId }, "Assigning capsule to offer");

    try {
      // Verify offer exists if assigning (not unassigning)
      if (parsed.offerId) {
        const existingOffer = await db.query.offer.findFirst({
          where: eq(offer.id, parsed.offerId),
          with: { capsules: true },
        });

        if (!existingOffer) {
          throw new Error("Offer not found");
        }

        // Check if assigning would exceed recommended limit (4-6 capsules)
        const currentCount = existingOffer.capsules?.length ?? 0;
        if (currentCount >= 6) {
          logger.warn({ operation: "offer:assignCapsule", offerId: parsed.offerId, currentCount }, "Offer already has 6 capsules (recommended maximum)");
          // Warning but allow assignment
        }
      }

      // Update capsule's offerId
      const [updatedCapsule] = await db
        .update(capsule)
        .set({ offerId: parsed.offerId })
        .where(eq(capsule.id, parsed.capsuleId))
        .returning();

      if (!updatedCapsule) {
        throw new Error("Capsule not found");
      }

      logger.info({ operation: "offer:assignCapsule", capsuleId: parsed.capsuleId, offerId: parsed.offerId }, "Capsule assigned successfully");
      return updatedCapsule;
    } catch (error) {
      logServiceError(error, "offer.assignCapsule", { capsuleId: parsed.capsuleId, offerId: parsed.offerId });
      throw error;
    }
  });

  // Get capsules without an offer (for assignment UI)
  ipcMain.handle("offer:getUnassignedCapsules", async (_event) => {
    const db = getDb();

    logger.info({ operation: "offer:getUnassignedCapsules" }, "Fetching unassigned capsules");

    try {
      const unassignedCapsules = await db
        .select()
        .from(capsule)
        .where(eq(capsule.offerId, null as any)) // SQLite null comparison
        .orderBy(desc(capsule.createdAt));

      logger.info({ operation: "offer:getUnassignedCapsules", count: unassignedCapsules.length }, "Unassigned capsules fetched successfully");
      return unassignedCapsules;
    } catch (error) {
      logServiceError(error, "offer.getUnassignedCapsules");
      throw error;
    }
  });
}

