-- Islam Daily — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- ─── Quran Ayahs ──────────────────────────────────────────────────────────────
create table if not exists public.quran_ayahs (
  id                  integer primary key,  -- global ayah number 1–6236
  surah_number        smallint  not null,
  ayah_number         smallint  not null,
  arabic_text         text      not null,
  urdu_translation    text,
  english_translation text,
  juz                 smallint,
  page                smallint
);

create index if not exists idx_quran_surah on public.quran_ayahs (surah_number, ayah_number);

-- ─── Hadiths ──────────────────────────────────────────────────────────────────
-- Run this to recreate the hadiths table with the full dataset schema.
-- WARNING: This drops the existing table. Run seed-hadiths.ts afterwards.
DROP TABLE IF EXISTS public.hadiths CASCADE;
CREATE TABLE public.hadiths (
  id              SERIAL PRIMARY KEY,
  collection_key  TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  book_id         INT,
  book_name       TEXT,
  chapter_id      INT,
  chapter_name    TEXT,
  hadith_number   TEXT NOT NULL,
  arabic          TEXT,
  english         TEXT,
  narrator        TEXT,
  grade           TEXT DEFAULT 'Sahih'
);

CREATE INDEX idx_hadiths_collection ON public.hadiths (collection_key);
CREATE INDEX idx_hadiths_number ON public.hadiths (collection_key, hadith_number);

ALTER TABLE public.hadiths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hadiths"   ON public.hadiths FOR SELECT USING (true);
CREATE POLICY "Anon insert hadiths"   ON public.hadiths FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete hadiths"   ON public.hadiths FOR DELETE USING (true);

-- ─── Duas ─────────────────────────────────────────────────────────────────────
create table if not exists public.duas (
  id              integer primary key,
  category        text    not null,
  title           text    not null,
  arabic          text    not null,
  transliteration text,
  urdu            text,
  english         text    not null,
  source          text,
  audio_url       text
);

create index if not exists idx_duas_category on public.duas (category);

-- ─── 99 Names of Allah ────────────────────────────────────────────────────────
create table if not exists public.names_of_allah (
  id               integer primary key,
  number           smallint not null unique,
  arabic           text     not null,
  transliteration  text     not null,
  english_meaning  text     not null,
  urdu_meaning     text,
  quran_reference  text,
  dua              text
);

-- ─── Row Level Security (enable for production) ───────────────────────────────
-- Content tables (quran_ayahs, hadiths, duas, names_of_allah) should be public-read:
-- alter table public.quran_ayahs   enable row level security;
-- create policy "Public read" on public.quran_ayahs for select using (true);
-- (repeat for hadiths, duas, names_of_allah)


-- ─── Feedback ──────────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id              uuid    default gen_random_uuid() primary key,
  rating          int,
  category        text,
  message         text    not null,
  name            text,
  email           text,
  app_version     text,
  device_platform text,
  device_model    text,
  created_at      timestamp default now()
);

-- Add columns if they don't exist (for existing deployments)
alter table public.feedback add column if not exists device_platform text;
alter table public.feedback add column if not exists device_model text;

-- Allow anyone to insert feedback (no auth required)
alter table public.feedback enable row level security;
create policy "Anyone can insert feedback" on public.feedback for insert with check (true);
-- Only service role can read feedback (for admin purposes)
create policy "Service role reads feedback" on public.feedback for select using (auth.role() = 'service_role');
