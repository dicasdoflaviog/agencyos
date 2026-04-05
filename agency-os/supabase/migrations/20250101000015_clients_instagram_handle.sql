-- Add instagram_handle to clients table (needed for metrics sync)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
