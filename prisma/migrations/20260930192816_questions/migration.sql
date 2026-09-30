-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('QUESTION', 'ACCESS');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'ANSWERED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ShareScope" AS ENUM ('ASKER', 'PUBLIC');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "kind" "QuestionKind" NOT NULL,
    "askerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "nodeIds" TEXT[],
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "answer" TEXT,
    "shareScope" "ShareScope",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_recipientId_status_idx" ON "Question"("recipientId", "status");

-- CreateIndex
CREATE INDEX "Question_askerId_idx" ON "Question"("askerId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
