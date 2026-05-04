-- Add IndoPak Nastaleeq script and 16-line page mapping
alter table public.quran_ayahs
  add column if not exists text_indopak text,
  add column if not exists page_indopak smallint;

create index if not exists quran_ayahs_page_indopak_idx
  on public.quran_ayahs (page_indopak)
  where page_indopak is not null;

comment on column public.quran_ayahs.text_indopak
  is 'IndoPak Nastaleeq script Quran text from QUL (qul.tarteel.ai)';
comment on column public.quran_ayahs.page_indopak
  is '16-line Indo-Pak Mushaf page number (1-611) from QUL';
