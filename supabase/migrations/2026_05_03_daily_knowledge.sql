-- Phase D.1 — Daily Knowledge (one hand-curated reflection per day)
-- The Home tab fetches the most recent active row whose display_date <= today.
-- RLS allows anonymous read of active rows only.

-- Reusable updated_at trigger function (idempotent).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.daily_knowledge (
  id uuid primary key default gen_random_uuid(),
  display_date date not null unique,

  -- Type drives the card's visual treatment (pill colour, header label).
  type text not null check (type in ('ayah', 'hadith', 'reflection', 'name_of_allah')),

  -- Optional Arabic source text (for ayah / hadith types).
  arabic_text text,

  -- Reference like "Quran 2:255" or "Sahih Muslim 657".
  source_reference text,

  -- Translations (Urdu primary, English secondary).
  translation_ur text,
  translation_en text,

  -- Optional 1-2 line context shown below translation.
  context_ur text,
  context_en text,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_knowledge_date_idx
  on public.daily_knowledge (display_date desc)
  where is_active = true;

alter table public.daily_knowledge enable row level security;

drop policy if exists "Active daily knowledge readable by everyone" on public.daily_knowledge;
create policy "Active daily knowledge readable by everyone"
  on public.daily_knowledge
  for select
  using (is_active = true and display_date <= current_date);

drop trigger if exists daily_knowledge_set_updated_at on public.daily_knowledge;
create trigger daily_knowledge_set_updated_at
  before update on public.daily_knowledge
  for each row
  execute function public.set_updated_at();

comment on table public.daily_knowledge
  is 'Hand-curated daily reflections (Phase D.1). One entry per display_date.';
