CREATE TABLE `ConceptSummary` (
	`id` text PRIMARY KEY NOT NULL,
	`conceptId` text NOT NULL,
	`summary` text NOT NULL,
	`keyPoints` text,
	`contentHash` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ConceptSummary_conceptId_unique` ON `ConceptSummary` (`conceptId`);--> statement-breakpoint
CREATE TABLE `ContextSession` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionKey` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`contextMessages` text NOT NULL,
	`conceptIds` text,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ContextSession_sessionKey_unique` ON `ContextSession` (`sessionKey`);--> statement-breakpoint
CREATE TABLE `LLMCache` (
	`id` text PRIMARY KEY NOT NULL,
	`queryEmbedding` blob NOT NULL,
	`queryText` text NOT NULL,
	`response` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`createdAt` integer NOT NULL,
	`lastUsedAt` integer NOT NULL
);
