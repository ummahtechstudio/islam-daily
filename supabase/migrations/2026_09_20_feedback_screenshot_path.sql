-- Batch 3 — feedback screenshots live in a PRIVATE bucket.
--
-- The `feedback-screenshots` bucket is no longer public, so the app stores
-- the storage object path (`feedback-screenshots/<epoch>_<rand>.jpg`) in
-- `feedback.screenshot_url` instead of a `/storage/v1/object/public/` URL,
-- which would be a dead link. Rows written before this change still hold
-- full public URLs; both forms identify the same object.
--
-- Dashboard setup that goes with this (not done by SQL):
--   1. Storage → feedback-screenshots → Public bucket: OFF.
--   2. storage.objects policies for the bucket: keep INSERT for anon
--      (content_type image/jpeg|image/png, size <= 5 MB); remove any
--      SELECT/list policy for anon so the shipped key can neither list the
--      bucket nor mint signed URLs. The development team reads objects via
--      the dashboard or the service role.

COMMENT ON COLUMN public.feedback.screenshot_url IS
  'Storage object path (feedback-screenshots/<name>) of the optional screenshot in the private feedback-screenshots bucket; rows before 2026-09-20 hold the former public URL.';
