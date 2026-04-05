-- ── Oracle Attachments Storage Bucket ─────────────────────────────────────
-- Files are uploaded by the frontend, fetched by the backend, then deleted.
-- Ephemeral by design — each file lives only during message processing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oracle-attachments',
  'oracle-attachments',
  false,
  10485760, -- 10 MB per file
  array[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'text/plain','text/csv','text/markdown',
    'application/json'
  ]
) on conflict (id) do nothing;

-- Users can upload to their own folder only
create policy "oracle_attachments_insert"
on storage.objects for insert
with check (
  bucket_id = 'oracle-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own files
create policy "oracle_attachments_select"
on storage.objects for select
using (
  bucket_id = 'oracle-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
create policy "oracle_attachments_delete"
on storage.objects for delete
using (
  bucket_id = 'oracle-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
