-- Every account is exactly one person in the graph. Accounts without a person
-- got a 404 on every page, so they go; pnpm db:seed:accounts recreates them.
DELETE FROM "user" WHERE "personId" IS NULL;

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_personId_fkey";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "personId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
