-- =============================================================================
-- MIGRATION FASE 10 — Migrate embeddings from vector(1536) → vector(768)
-- Gemini text-embedding-004 produz 768 dims (vs OpenAI 1536)
-- =============================================================================

-- 1. Drop old index (incompatível com nova dimensão)
DROP INDEX IF EXISTS client_memories_embedding_idx;

-- 2. Alter column: zera embeddings existentes (gerados com 1536 dims, incompatíveis)
ALTER TABLE client_memories
  ALTER COLUMN embedding TYPE vector(768) USING NULL;

-- 3. Recria index com nova dimensão
CREATE INDEX client_memories_embedding_idx
  ON client_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Cria (ou recria) a função de busca vetorial
CREATE OR REPLACE FUNCTION match_client_memories(
  query_embedding  vector(768),
  match_client_id  uuid,
  match_threshold  float DEFAULT 0.7,
  match_count      int   DEFAULT 10
)
RETURNS TABLE (
  id         uuid,
  client_id  uuid,
  content    text,
  source     text,
  source_id  text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.client_id,
    cm.content,
    cm.source,
    cm.source_id,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM client_memories cm
  WHERE cm.client_id = match_client_id
    AND cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
