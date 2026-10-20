-- Access requests are gone: people ask questions and get answers. A pending
-- access request becomes a question routed to the owner, who answers it from
-- a draft. Resolved ones are deleted, and the access they granted with them.

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "routed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Question" SET "routed" = true WHERE "kind" = 'ACCESS' AND "status" = 'PENDING';

DELETE FROM "NodeAccess" WHERE "questionId" IS NOT NULL;

DELETE FROM "Question" WHERE "kind" = 'ACCESS' AND "status" <> 'PENDING';

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "kind";

-- DropForeignKey
ALTER TABLE "NodeAccess" DROP CONSTRAINT "NodeAccess_questionId_fkey";

-- DropIndex
DROP INDEX "NodeAccess_questionId_idx";

-- AlterTable
ALTER TABLE "NodeAccess" DROP COLUMN "questionId";

-- DropEnum
DROP TYPE "QuestionKind";
