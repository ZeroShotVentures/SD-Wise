-- CreateEnum
CREATE TYPE "Department" AS ENUM ('HR', 'IT', 'FINANCE', 'MARKETING', 'SALES', 'CUSTOMER_SERVICE', 'PRODUCTION', 'LOGISTICS', 'MAINTENANCE', 'SECURITY', 'CLEANING', 'SECRETARIAL', 'RECEPTION', 'ACCOUNTING', 'AUDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('slack', 'email', 'google_meet');

-- CreateEnum
CREATE TYPE "KnowledgeSource" AS ENUM ('MESSAGE', 'EMAIL', 'MEETING', 'DOCUMENT', 'OTHER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "Integrations" (
    "id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,

    CONSTRAINT "Integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" "Department" NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentSummary" TEXT NOT NULL,
    "source" "KnowledgeSource" NOT NULL,
    "integrationId" TEXT NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "edgeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_KnowledgeNodeToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KnowledgeNodeToPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "KnowledgeNode_integrationId_idx" ON "KnowledgeNode"("integrationId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_targetId_idx" ON "KnowledgeEdge"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEdge_sourceId_targetId_key" ON "KnowledgeEdge"("sourceId", "targetId");

-- CreateIndex
CREATE INDEX "_KnowledgeNodeToPerson_B_index" ON "_KnowledgeNodeToPerson"("B");

-- CreateIndex
CREATE UNIQUE INDEX "user_personId_key" ON "user"("personId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeNodeToPerson" ADD CONSTRAINT "_KnowledgeNodeToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeNodeToPerson" ADD CONSTRAINT "_KnowledgeNodeToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

