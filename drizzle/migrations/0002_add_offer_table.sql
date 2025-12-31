-- Migration: Add Offer table and update Capsule with offerId foreign key
-- This migration creates a proper domain model for Offers with validation support

-- Create Offer table
CREATE TABLE IF NOT EXISTS "Offer" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Add index on Offer.name for faster lookups
CREATE INDEX IF NOT EXISTS "Offer_name_idx" ON "Offer" ("name");

-- Add offerId column to Capsule table
ALTER TABLE "Capsule" ADD COLUMN "offerId" TEXT REFERENCES "Offer"("id") ON DELETE SET NULL;

-- Add index on Capsule.offerId for faster lookups
CREATE INDEX IF NOT EXISTS "Capsule_offerId_idx" ON "Capsule" ("offerId");

-- Note: The offerMapping column is preserved for backward compatibility
-- It can be removed in a future migration after data is migrated to the Offer table

