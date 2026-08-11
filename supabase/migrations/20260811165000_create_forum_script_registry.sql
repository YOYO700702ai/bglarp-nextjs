-- Minimal public script registry required by the catalog admin.
-- The separate player-review feature can add its own tables later.

create table if not exists public.forum_scripts (
  id uuid primary key default gen_random_uuid(),
  notion_page_id text not null unique,
  title text not null,
  is_active boolean not null default true,
  synced_at timestamptz not null default now()
);

alter table public.forum_scripts enable row level security;

-- Projects with "Automatically expose new tables" disabled do not receive
-- Supabase's default grants. The browser can only read active registry rows;
-- all writes stay on trusted server routes.
revoke all on table public.forum_scripts from public, anon, authenticated;
grant all on public.forum_scripts to service_role;
grant select on public.forum_scripts to anon, authenticated;

drop policy if exists "Public can read active forum scripts" on public.forum_scripts;
create policy "Public can read active forum scripts"
on public.forum_scripts
for select
to anon, authenticated
using (is_active);
