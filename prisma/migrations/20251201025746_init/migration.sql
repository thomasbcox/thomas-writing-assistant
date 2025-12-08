-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "content" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "trashedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "forwardName" TEXT NOT NULL,
    "reverseName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Link_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Link_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinkName" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Capsule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "promise" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "offerMapping" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capsuleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "painPoints" TEXT,
    "solutionSteps" TEXT,
    "proof" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Anchor_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepurposedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anchorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepurposedContent_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MRUConcept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Concept_identifier_key" ON "Concept"("identifier");

-- CreateIndex
CREATE INDEX "Concept_status_idx" ON "Concept"("status");

-- CreateIndex
CREATE INDEX "Concept_identifier_idx" ON "Concept"("identifier");

-- CreateIndex
CREATE INDEX "Link_sourceId_idx" ON "Link"("sourceId");

-- CreateIndex
CREATE INDEX "Link_targetId_idx" ON "Link"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Link_sourceId_targetId_key" ON "Link"("sourceId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkName_name_key" ON "LinkName"("name");

-- CreateIndex
CREATE INDEX "LinkName_name_idx" ON "LinkName"("name");

-- CreateIndex
CREATE INDEX "Capsule_title_idx" ON "Capsule"("title");

-- CreateIndex
CREATE INDEX "Anchor_capsuleId_idx" ON "Anchor"("capsuleId");

-- CreateIndex
CREATE INDEX "RepurposedContent_anchorId_idx" ON "RepurposedContent"("anchorId");

-- CreateIndex
CREATE INDEX "RepurposedContent_type_idx" ON "RepurposedContent"("type");

-- CreateIndex
CREATE INDEX "MRUConcept_lastUsed_idx" ON "MRUConcept"("lastUsed");

-- CreateIndex
CREATE UNIQUE INDEX "MRUConcept_conceptId_key" ON "MRUConcept"("conceptId");
