-- ============================================================
-- Agency OS — Migration: Storage Bucket creative-assets
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Criar bucket (ignora se já existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creative-assets',
  'creative-assets',
  false,                          -- privado: acesso via signed URL
  52428800,                       -- 50 MB por arquivo
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Garantir que RLS está ativo na tabela de objetos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. RLS: usuários autenticados podem fazer upload (todos os uploads reais
--    são feitos via service_role no server; esta policy é fallback de segurança)
DROP POLICY IF EXISTS "Authenticated users can upload to creative-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to creative-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creative-assets');

-- 4. RLS: usuários autenticados podem ler qualquer objeto do bucket
DROP POLICY IF EXISTS "Authenticated users can read creative-assets" ON storage.objects;
CREATE POLICY "Authenticated users can read creative-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'creative-assets');

-- 5. RLS: usuários autenticados podem deletar objetos do bucket
--    (o server usa service_role, mas esta policy permite deleção futura client-side)
DROP POLICY IF EXISTS "Authenticated users can delete from creative-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete from creative-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'creative-assets');

-- 6. RLS: service_role tem acesso total (server-side, bypass RLS)
DROP POLICY IF EXISTS "Service role full access to creative-assets" ON storage.objects;
CREATE POLICY "Service role full access to creative-assets"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'creative-assets')
WITH CHECK (bucket_id = 'creative-assets');
