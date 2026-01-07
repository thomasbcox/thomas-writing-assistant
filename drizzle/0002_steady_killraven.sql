PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ConceptEmbedding` (
	`id` text PRIMARY KEY NOT NULL,
	`conceptId` text NOT NULL,
	`embedding` blob NOT NULL,
	`model` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ConceptEmbedding`("id", "conceptId", "embedding", "model", "createdAt", "updatedAt") SELECT "id", "conceptId", "embedding", "model", "createdAt", "updatedAt" FROM `ConceptEmbedding`;--> statement-breakpoint
DROP TABLE `ConceptEmbedding`;--> statement-breakpoint
ALTER TABLE `__new_ConceptEmbedding` RENAME TO `ConceptEmbedding`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ConceptEmbedding_conceptId_unique` ON `ConceptEmbedding` (`conceptId`);