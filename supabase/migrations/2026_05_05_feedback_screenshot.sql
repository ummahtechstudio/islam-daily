-- Phase D.1.2 — Feedback screenshot support.
--
-- Adds a nullable URL column on the feedback table. App uploads the optional
-- screenshot to the `feedback-screenshots` storage bucket and stores the
-- public URL here.
--
-- One-time setup (run in Supabase dashboard, not via migration):
--   1. Create public storage bucket: feedback-screenshots
--   2. Add storage policy allowing INSERT for anon role with file size <= 5 MB
--      and content_type IN ('image/jpeg', 'image/png').
--   3. Optional: add Resend webhook on feedback INSERT (see
--      supabase/functions/feedback-notify/index.ts).

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT NULL;

COMMENT ON COLUMN public.feedback.screenshot_url IS
  'Public URL of optional screenshot uploaded to feedback-screenshots bucket.';
