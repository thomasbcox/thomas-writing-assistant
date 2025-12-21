-- Migration: Convert LinkName to forward/reverse pairs and Link to use linkNameId
-- This migration handles both schema changes and data migration

-- Step 1: Create new LinkName table structure (temporary table)
CREATE TABLE `LinkName_new` (
	`id` text PRIMARY KEY NOT NULL,
	`forwardName` text NOT NULL,
	`reverseName` text NOT NULL,
	`isSymmetric` integer DEFAULT 0 NOT NULL,
	`isDefault` integer DEFAULT 0 NOT NULL,
	`isDeleted` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL
);

-- Step 2: Migrate existing LinkName data to new structure
-- For each existing name, create a symmetric pair (forward = reverse = name)
INSERT INTO `LinkName_new` (`id`, `forwardName`, `reverseName`, `isSymmetric`, `isDefault`, `isDeleted`, `createdAt`)
SELECT 
	`id`,
	`name` as `forwardName`,
	`name` as `reverseName`,
	1 as `isSymmetric`,  -- All existing names are treated as symmetric
	`isDefault`,
	`isDeleted`,
	`createdAt`
FROM `LinkName`;

-- Step 3: Add default link name pairs
-- These are the standard bidirectional pairs
INSERT OR IGNORE INTO `LinkName_new` (`id`, `forwardName`, `reverseName`, `isSymmetric`, `isDefault`, `isDeleted`, `createdAt`)
VALUES
	-- Generate IDs using a simple approach (in real migration, use proper ID generation)
	('ln_belongs_to', 'belongs to', 'contains', 0, 1, 0, strftime('%s', 'now')),
	('ln_references', 'references', 'referenced by', 0, 1, 0, strftime('%s', 'now')),
	('ln_subset', 'is a subset of', 'is a superset of', 0, 1, 0, strftime('%s', 'now')),
	('ln_builds_on', 'builds on', 'built on by', 0, 1, 0, strftime('%s', 'now')),
	('ln_contradicts', 'contradicts', 'contradicted by', 0, 1, 0, strftime('%s', 'now')),
	('ln_related_to', 'related to', 'related to', 1, 1, 0, strftime('%s', 'now')),
	('ln_example_of', 'example of', 'exemplified by', 0, 1, 0, strftime('%s', 'now')),
	('ln_prerequisite', 'prerequisite for', 'requires', 0, 1, 0, strftime('%s', 'now')),
	('ln_extends', 'extends', 'extended by', 0, 1, 0, strftime('%s', 'now')),
	('ln_similar_to', 'similar to', 'similar to', 1, 1, 0, strftime('%s', 'now')),
	('ln_part_of', 'part of', 'contains', 0, 1, 0, strftime('%s', 'now')),
	('ln_contains', 'contains', 'part of', 0, 1, 0, strftime('%s', 'now')),
	('ln_inspired_by', 'inspired by', 'inspired', 0, 1, 0, strftime('%s', 'now')),
	('ln_opposes', 'opposes', 'opposed by', 0, 1, 0, strftime('%s', 'now'));

-- Step 4: Create LinkName pairs for any unique forward/reverse combinations in existing Link table
-- This handles custom link name pairs that users may have created
INSERT OR IGNORE INTO `LinkName_new` (`id`, `forwardName`, `reverseName`, `isSymmetric`, `isDefault`, `isDeleted`, `createdAt`)
SELECT DISTINCT
	'ln_' || substr(hex(randomblob(8)), 1, 16) as `id`,
	`forwardName`,
	`reverseName`,
	CASE WHEN `forwardName` = `reverseName` THEN 1 ELSE 0 END as `isSymmetric`,
	0 as `isDefault`,
	0 as `isDeleted`,
	strftime('%s', 'now') as `createdAt`
FROM `Link`
WHERE NOT EXISTS (
	SELECT 1 FROM `LinkName_new` 
	WHERE `forwardName` = `Link`.`forwardName` 
	AND `reverseName` = `Link`.`reverseName`
);

-- Step 5: Add linkNameId column to Link table (temporary, will be made NOT NULL after population)
ALTER TABLE `Link` ADD COLUMN `linkNameId` text;

-- Step 6: Populate linkNameId in Link table by matching forwardName/reverseName
UPDATE `Link`
SET `linkNameId` = (
	SELECT `id` 
	FROM `LinkName_new` 
	WHERE `LinkName_new`.`forwardName` = `Link`.`forwardName`
	AND `LinkName_new`.`reverseName` = `Link`.`reverseName`
	LIMIT 1
);

-- Step 7: Replace old LinkName table with new one
DROP TABLE `LinkName`;
ALTER TABLE `LinkName_new` RENAME TO `LinkName`;

-- Step 8: Create indexes on new LinkName table
CREATE UNIQUE INDEX `LinkName_forwardName_unique` ON `LinkName` (`forwardName`);
CREATE INDEX `LinkName_forwardName_idx` ON `LinkName` (`forwardName`);
CREATE INDEX `LinkName_reverseName_idx` ON `LinkName` (`reverseName`);

-- Step 9: Make linkNameId NOT NULL and add foreign key constraint
-- First, ensure all links have a linkNameId (set to a default if missing)
UPDATE `Link` 
SET `linkNameId` = (SELECT `id` FROM `LinkName` WHERE `forwardName` = 'related to' AND `reverseName` = 'related to' LIMIT 1)
WHERE `linkNameId` IS NULL;

-- Note: SQLite doesn't support ALTER COLUMN to add NOT NULL constraint directly
-- We'll need to recreate the table or use a workaround
-- For now, we'll add the foreign key constraint
CREATE INDEX `Link_linkNameId_idx` ON `Link` (`linkNameId`);

-- Step 10: Remove forwardName and reverseName columns from Link table
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE `Link_new` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`targetId` text NOT NULL,
	`linkNameId` text NOT NULL,
	`notes` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`targetId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkNameId`) REFERENCES `LinkName`(`id`) ON UPDATE no action ON DELETE restrict
);

-- Copy data to new table (only links with valid linkNameId)
INSERT INTO `Link_new` (`id`, `sourceId`, `targetId`, `linkNameId`, `notes`, `createdAt`)
SELECT `id`, `sourceId`, `targetId`, `linkNameId`, `notes`, `createdAt`
FROM `Link`
WHERE `linkNameId` IS NOT NULL;

-- Replace old table
DROP TABLE `Link`;
ALTER TABLE `Link_new` RENAME TO `Link`;

-- Step 11: Recreate indexes on Link table
CREATE UNIQUE INDEX `Link_sourceId_targetId_unique` ON `Link` (`sourceId`, `targetId`);
CREATE INDEX `Link_sourceId_idx` ON `Link` (`sourceId`);
CREATE INDEX `Link_targetId_idx` ON `Link` (`targetId`);
CREATE INDEX `Link_linkNameId_idx` ON `Link` (`linkNameId`);
