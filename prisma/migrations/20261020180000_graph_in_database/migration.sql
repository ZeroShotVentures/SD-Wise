-- The knowledge graph moves from fixtures in code to these tables. Written to
-- also run on tables that still hold rows from the old AI seed: new required
-- columns are backfilled, and the old access list is copied before it goes.
-- One transaction, so a failure leaves the database as it was.
BEGIN;

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "EdgeKind" AS ENUM ('RELATES_TO', 'UPDATES', 'DEPENDS_ON', 'ANSWERS');

-- AlterEnum: the 13 kinds the app knows. 'email' was only used by the old AI
-- seed and becomes 'outlook'.
CREATE TYPE "IntegrationType_new" AS ENUM ('slack', 'teams', 'outlook', 'teams_meetings', 'google_meet', 'gmail', 'zoom', 'sharepoint', 'onedrive', 'onenote', 'google_drive', 'notion', 'confluence');
ALTER TABLE "Integrations" ALTER COLUMN "type" TYPE "IntegrationType_new" USING (
  CASE WHEN "type"::text = 'email' THEN 'outlook' ELSE "type"::text END
)::"IntegrationType_new";
ALTER TYPE "IntegrationType" RENAME TO "IntegrationType_old";
ALTER TYPE "IntegrationType_new" RENAME TO "IntegrationType";
DROP TYPE "public"."IntegrationType_old";

-- AlterTable
ALTER TABLE "Integrations" ADD COLUMN     "connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "connectedAt" TIMESTAMP(3);

-- AlterTable: names come from the linked account until `pnpm db:seed` sets
-- them.
ALTER TABLE "Person" ADD COLUMN     "name" TEXT;
UPDATE "Person" p SET "name" = COALESCE(
  (SELECT u."name" FROM "user" u WHERE u."personId" = p."id"),
  p."role"
);
ALTER TABLE "Person" ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "KnowledgeNode" ADD COLUMN     "questionId" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
ALTER COLUMN "integrationId" DROP NOT NULL;
UPDATE "KnowledgeNode" SET "title" = "contentSummary";
ALTER TABLE "KnowledgeNode" ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "KnowledgeEdge" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" "EdgeKind" NOT NULL DEFAULT 'RELATES_TO';
ALTER TABLE "KnowledgeEdge" ALTER COLUMN "description" DROP DEFAULT,
ALTER COLUMN "kind" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NodeAccess" (
    "nodeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "owner" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "questionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeAccess_pkey" PRIMARY KEY ("nodeId","personId")
);

-- The old access list didn't know owners: everyone on it becomes one.
INSERT INTO "NodeAccess" ("nodeId", "personId", "owner")
SELECT "A", "B", true FROM "_KnowledgeNodeToPerson";

-- DropForeignKey
ALTER TABLE "_KnowledgeNodeToPerson" DROP CONSTRAINT "_KnowledgeNodeToPerson_A_fkey";

-- DropForeignKey
ALTER TABLE "_KnowledgeNodeToPerson" DROP CONSTRAINT "_KnowledgeNodeToPerson_B_fkey";

-- DropTable
DROP TABLE "_KnowledgeNodeToPerson";

-- CreateIndex
CREATE INDEX "NodeAccess_personId_idx" ON "NodeAccess"("personId");

-- CreateIndex
CREATE INDEX "NodeAccess_questionId_idx" ON "NodeAccess"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeNode_questionId_key" ON "KnowledgeNode"("questionId");

-- DropForeignKey
ALTER TABLE "KnowledgeNode" DROP CONSTRAINT "KnowledgeNode_integrationId_fkey";

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeAccess" ADD CONSTRAINT "NodeAccess_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeAccess" ADD CONSTRAINT "NodeAccess_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeAccess" ADD CONSTRAINT "NodeAccess_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
