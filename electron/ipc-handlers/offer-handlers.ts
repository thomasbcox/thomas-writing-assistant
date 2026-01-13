import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc, isNull } from "drizzle-orm";
import { offer, capsule } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { logger } from "../../src/lib/logger.js";
import { serializeOffer, serializeCapsule, serializeOfferWithCapsules } from "../../src/lib/serializers.js";
import { handleIpc } from "./ipc-wrapper.js";

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
  ipcMain.handle("offer:list", handleIpc(async (_event, input: unknown) => {
    const db = getDb();

    logger.info({ operation: "offer:list" }, "Fetching all offers");

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
  }, "offer:list"));

  // Get offer by ID with capsules
  ipcMain.handle("offer:getById", handleIpc(async (_event, input: unknown) => {
    const parsed = getByIdSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:getById", offerId: parsed.id }, "Fetching offer by ID");

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
    return serializeOfferWithCapsules(foundOffer);
  }, "offer:getById"));

  // Create a new offer
  ipcMain.handle("offer:create", handleIpc(async (_event, input: unknown) => {
    const parsed = createOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:create", name: parsed.name }, "Creating offer");

    const [newOffer] = await db
      .insert(offer)
      .values({
        name: parsed.name,
        description: parsed.description ?? null,
      })
      .returning();

    logger.info({ operation: "offer:create", offerId: newOffer.id, name: parsed.name }, "Offer created successfully");
    return serializeOffer(newOffer);
  }, "offer:create"));

  // Update an offer
  ipcMain.handle("offer:update", handleIpc(async (_event, input: unknown) => {
    const parsed = updateOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:update", offerId: parsed.id }, "Updating offer");

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
    return serializeOffer(updatedOffer);
  }, "offer:update"));

  // Delete an offer (capsules are unassigned, not deleted)
  ipcMain.handle("offer:delete", handleIpc(async (_event, input: unknown) => {
    const parsed = deleteOfferSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:delete", offerId: parsed.id }, "Deleting offer");

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
  }, "offer:delete"));

  // Assign a capsule to an offer
  ipcMain.handle("offer:assignCapsule", handleIpc(async (_event, input: unknown) => {
    const parsed = assignCapsuleSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "offer:assignCapsule", capsuleId: parsed.capsuleId, offerId: parsed.offerId }, "Assigning capsule to offer");

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
    return serializeCapsule(updatedCapsule);
  }, "offer:assignCapsule"));

  // Get capsules without an offer (for assignment UI)
  ipcMain.handle("offer:getUnassignedCapsules", handleIpc(async (_event) => {
    const db = getDb();

    logger.info({ operation: "offer:getUnassignedCapsules" }, "Fetching unassigned capsules");

    const unassignedCapsules = await db
      .select()
      .from(capsule)
      .where(isNull(capsule.offerId)) // SQLite null comparison
      .orderBy(desc(capsule.createdAt));

    logger.info({ operation: "offer:getUnassignedCapsules", count: unassignedCapsules.length }, "Unassigned capsules fetched successfully");
    return unassignedCapsules.map(serializeCapsule);
  }, "offer:getUnassignedCapsules"));
}

