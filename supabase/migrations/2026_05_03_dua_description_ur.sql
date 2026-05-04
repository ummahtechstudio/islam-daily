-- Phase D.1 — Urdu description for each dua
-- One short Urdu line shown under the title on the dua card. Sourced from
-- Hisn al-Muslim Urdu translation by default; override per-row if needed.

alter table public.duas
  add column if not exists description_ur text,
  add column if not exists description_source text default 'Hisn al-Muslim';

comment on column public.duas.description_ur
  is '1-2 sentence Urdu description: when/why this dua is read. Sourced from Hisn al-Muslim Urdu translation.';
comment on column public.duas.description_source
  is 'Attribution for the description. Default: Hisn al-Muslim.';
