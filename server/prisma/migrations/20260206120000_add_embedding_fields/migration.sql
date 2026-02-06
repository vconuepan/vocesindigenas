-- Add embedding column with pgvector type
ALTER TABLE "stories" ADD COLUMN "embedding" vector(1536);

-- Add content hash for change detection
ALTER TABLE "stories" ADD COLUMN "embedding_content_hash" VARCHAR(64);

-- Add timestamp for tracking when embedding was generated
ALTER TABLE "stories" ADD COLUMN "embedding_generated_at" TIMESTAMP(3);

-- Create HNSW index for fast cosine similarity search
-- HNSW does not require training data (unlike IVFFlat) so it works immediately
-- The query must use the <=> (cosine distance) operator to use this index
CREATE INDEX "stories_embedding_idx" ON "stories"
USING hnsw ("embedding" vector_cosine_ops);
