-- Migration: drop tables that the client never reads/writes (verified via audit-2026-05-06).
-- The app stores bookmarks, prayer streaks, and hifz progress in AsyncStorage only.
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run.

drop table if exists public.user_bookmarks cascade;
drop table if exists public.prayer_streaks cascade;
drop table if exists public.hifz_progress cascade;
