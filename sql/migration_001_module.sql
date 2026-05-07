-- Migration 001: introduce a `module` discriminator on submissions.
-- Idempotent — safe to re-run.
--
-- Until now the only kind of submission was the regular-pyramid table.
-- We're adding a second module (arithmetic exercises). The new column
-- distinguishes them; existing rows default to 'piramide'.
-- pyramid_type becomes nullable because it's piramide-specific.

alter table public.submissions
  add column if not exists module text not null default 'piramide';

alter table public.submissions
  alter column pyramid_type drop not null;

-- Optional sanity check — all existing rows should now have module='piramide'.
-- (Will be a no-op if the table is currently empty.)
update public.submissions set module = 'piramide' where module is null;
