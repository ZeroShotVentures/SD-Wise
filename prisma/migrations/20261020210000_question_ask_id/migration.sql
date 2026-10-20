-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "askId" TEXT;

-- One routed ask sent one question per owner, all in the same moment. Group
-- the ones already sent so the asker sees them as one.
UPDATE "Question"
SET "askId" = md5("askerId" || ':' || "question" || ':' || date_trunc('minute', "createdAt")::text)
WHERE "routed" = true;
