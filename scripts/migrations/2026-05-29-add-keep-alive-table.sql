-- Migration: add `keep_alive` table for the daily GitHub Actions ping.
--
-- Purpose: free-tier Supabase pauses after 7 days of inactivity, which would
-- break feedback uploads and any future dynamic features. A daily workflow
-- inserts one row into this table so the project stays awake. The table holds
-- only timestamps and an id — no sensitive data.
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: re-running is safe.

create table if not exists public.keep_alive (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

-- RLS stays ON so we don't accidentally expose anything else. Two narrow
-- policies let the anon role do exactly what the workflow needs: INSERT
-- new ping rows, and DELETE rows older than 7 days.
alter table public.keep_alive enable row level security;

-- INSERT: anon can write a new ping row. The body is `{}` so all values
-- come from column defaults — no user input reaches the DB.
drop policy if exists "anon can ping" on public.keep_alive;
create policy "anon can ping"
  on public.keep_alive
  for insert
  to anon
  with check (true);

-- DELETE: anon can prune only rows older than 7 days. The cutoff is enforced
-- in the policy so even a misconfigured workflow can't truncate today's row
-- (which is the one keeping the project awake).
drop policy if exists "anon can prune old rows" on public.keep_alive;
create policy "anon can prune old rows"
  on public.keep_alive
  for delete
  to anon
  using (created_at < now() - interval '7 days');
