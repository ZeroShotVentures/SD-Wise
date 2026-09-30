-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "KnowledgeNode" ADD COLUMN "contentEmbedding" vector(1536);

-- CreateIndex
CREATE INDEX "KnowledgeNode_contentEmbedding_idx" ON "KnowledgeNode" USING hnsw ("contentEmbedding" vector_cosine_ops);
