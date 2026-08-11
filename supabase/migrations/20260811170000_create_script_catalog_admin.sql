-- BGLARP script catalog administration, immutable versions, and Notion outbox.
-- This migration is additive: existing forum_scripts rows are only referenced
-- and are never rewritten or deleted.

create table if not exists public.script_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  display_name text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint script_admin_users_role_check
    check (role in ('editor', 'publisher', 'admin')),
  constraint script_admin_users_display_name_check
    check (display_name is null or char_length(btrim(display_name)) between 1 and 120)
);

create table if not exists public.catalog_scripts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  status text not null default 'draft',
  notion_page_id text,
  forum_script_id uuid references public.forum_scripts(id) on delete restrict,
  draft_version_id uuid,
  published_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unpublished_at timestamptz,
  constraint catalog_scripts_slug_check
    check (
      char_length(slug) between 1 and 160
      and slug = btrim(slug)
      and slug = lower(slug)
      and slug !~ '[[:space:]/?#%]'
    ),
  constraint catalog_scripts_status_check
    check (status in ('draft', 'published', 'unpublished')),
  constraint catalog_scripts_published_pointer_check
    check (status <> 'published' or published_version_id is not null),
  constraint catalog_scripts_published_at_check
    check (status <> 'published' or published_at is not null),
  constraint catalog_scripts_notion_page_id_check
    check (notion_page_id is null or char_length(btrim(notion_page_id)) between 1 and 200)
);

-- Additive columns keep this migration re-runnable for preview databases that
-- were created before per-script Notion serialization was introduced.
alter table public.catalog_scripts
  add column if not exists notion_sync_lease_token uuid;
alter table public.catalog_scripts
  add column if not exists notion_sync_lease_until timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_scripts_notion_sync_lease_pair_check'
      and conrelid = 'public.catalog_scripts'::regclass
  ) then
    alter table public.catalog_scripts
      add constraint catalog_scripts_notion_sync_lease_pair_check
      check (
        (notion_sync_lease_token is null)
        = (notion_sync_lease_until is null)
      );
  end if;
end;
$$;

comment on column public.catalog_scripts.notion_sync_lease_token is
  'Opaque service-role token that serializes Notion calls for one catalog script.';
comment on column public.catalog_scripts.notion_sync_lease_until is
  'Expiry for the per-script Notion synchronization lease; stale workers cannot release a newer lease.';

create table if not exists public.catalog_script_versions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.catalog_scripts(id) on delete restrict,
  version_no integer not null,
  source text not null,
  content jsonb not null,
  idempotency_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint catalog_script_versions_version_no_check
    check (version_no > 0),
  constraint catalog_script_versions_source_check
    check (source in ('human', 'ai', 'import')),
  constraint catalog_script_versions_content_check
    check (jsonb_typeof(content) = 'object'),
  constraint catalog_script_versions_idempotency_key_check
    check (
      idempotency_key is null
      or (
        idempotency_key = btrim(idempotency_key)
        and char_length(idempotency_key) between 1 and 255
      )
    ),
  constraint catalog_script_versions_script_version_key
    unique (script_id, version_no),
  constraint catalog_script_versions_script_id_id_key
    unique (script_id, id)
);

-- Both pointers must refer to a version owned by the same catalog script.
-- The guarded ALTER statements make this migration safe to re-run.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_scripts_draft_version_fk'
      and conrelid = 'public.catalog_scripts'::regclass
  ) then
    alter table public.catalog_scripts
      add constraint catalog_scripts_draft_version_fk
      foreign key (id, draft_version_id)
      references public.catalog_script_versions(script_id, id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_scripts_published_version_fk'
      and conrelid = 'public.catalog_scripts'::regclass
  ) then
    alter table public.catalog_scripts
      add constraint catalog_scripts_published_version_fk
      foreign key (id, published_version_id)
      references public.catalog_script_versions(script_id, id)
      on delete restrict;
  end if;
end;
$$;

create table if not exists public.script_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.catalog_scripts(id) on delete restrict,
  version_id uuid not null,
  target text not null default 'notion',
  action text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint script_sync_jobs_script_version_fk
    foreign key (script_id, version_id)
    references public.catalog_script_versions(script_id, id)
    on delete restrict,
  constraint script_sync_jobs_target_check
    check (target = 'notion'),
  constraint script_sync_jobs_action_check
    check (action in ('upsert', 'unpublish')),
  constraint script_sync_jobs_status_check
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'dead_letter')),
  constraint script_sync_jobs_attempts_check
    check (attempts >= 0),
  constraint script_sync_jobs_payload_check
    check (jsonb_typeof(payload) = 'object'),
  constraint script_sync_jobs_idempotency_key_check
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 1 and 255
    )
);

create table if not exists public.script_audit_log (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.catalog_scripts(id) on delete restrict,
  version_id uuid references public.catalog_script_versions(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  constraint script_audit_log_actor_type_check
    check (actor_type in ('human', 'ai', 'import', 'system')),
  constraint script_audit_log_action_check
    check (char_length(btrim(action)) between 1 and 120),
  constraint script_audit_log_before_state_check
    check (before_state is null or jsonb_typeof(before_state) = 'object'),
  constraint script_audit_log_after_state_check
    check (after_state is null or jsonb_typeof(after_state) = 'object')
);

create unique index if not exists catalog_scripts_slug_ci_key
  on public.catalog_scripts (lower(slug));

create unique index if not exists catalog_scripts_notion_page_id_key
  on public.catalog_scripts (notion_page_id)
  where notion_page_id is not null;

create unique index if not exists catalog_scripts_forum_script_id_key
  on public.catalog_scripts (forum_script_id)
  where forum_script_id is not null;

create index if not exists catalog_scripts_status_published_at_idx
  on public.catalog_scripts (status, published_at desc);

create index if not exists catalog_script_versions_script_created_idx
  on public.catalog_script_versions (script_id, created_at desc);

create index if not exists script_sync_jobs_ready_idx
  on public.script_sync_jobs (next_attempt_at, created_at)
  where status in ('pending', 'failed');

create index if not exists script_sync_jobs_script_created_idx
  on public.script_sync_jobs (script_id, created_at desc);

create index if not exists script_audit_log_script_created_idx
  on public.script_audit_log (script_id, created_at desc);

create index if not exists script_audit_log_actor_created_idx
  on public.script_audit_log (actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists script_admin_users_active_role_idx
  on public.script_admin_users (role, user_id)
  where is_active;

create or replace function public.set_script_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_schema = 'public'
    and tg_table_name = 'catalog_scripts'
    and (
      to_jsonb(new)
        - 'updated_at'
        - 'notion_sync_lease_token'
        - 'notion_sync_lease_until'
    ) is not distinct from (
      to_jsonb(old)
        - 'updated_at'
        - 'notion_sync_lease_token'
        - 'notion_sync_lease_until'
    )
  then
    -- Acquiring or releasing an operational lease is not a content edit and
    -- must not invalidate catalog caches or alter the staff-facing timestamp.
    new.updated_at = old.updated_at;
    return new;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_script_admin_users_updated_at on public.script_admin_users;
create trigger set_script_admin_users_updated_at
before update on public.script_admin_users
for each row execute function public.set_script_catalog_updated_at();

drop trigger if exists set_catalog_scripts_updated_at on public.catalog_scripts;
create trigger set_catalog_scripts_updated_at
before update on public.catalog_scripts
for each row execute function public.set_script_catalog_updated_at();

drop trigger if exists set_script_sync_jobs_updated_at on public.script_sync_jobs;
create trigger set_script_sync_jobs_updated_at
before update on public.script_sync_jobs
for each row execute function public.set_script_catalog_updated_at();

-- This security-definer helper avoids recursive RLS lookups on
-- script_admin_users. It reveals only a boolean and never user details.
create or replace function public.is_script_admin(
  p_roles text[] default array['editor', 'publisher', 'admin']::text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.script_admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.is_active
      and admin_user.role = any (p_roles)
  );
$$;

revoke all on function public.is_script_admin(text[]) from public, anon, authenticated;
grant execute on function public.is_script_admin(text[]) to authenticated, service_role;

create or replace function public.claim_catalog_script_notion_sync_lease(
  p_script_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Not authorized to claim Notion sync leases.' using errcode = '42501';
  end if;

  if p_script_id is null or p_lease_token is null then
    raise exception 'Script id and lease token are required.' using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds not between 30 and 900 then
    raise exception 'Notion sync lease must be between 30 and 900 seconds.' using errcode = '22023';
  end if;

  update public.catalog_scripts
  set
    notion_sync_lease_token = p_lease_token,
    notion_sync_lease_until = now() + make_interval(secs => p_lease_seconds)
  where id = p_script_id
    and (
      notion_sync_lease_token is null
      or notion_sync_lease_until is null
      or notion_sync_lease_until <= now()
      or notion_sync_lease_token = p_lease_token
    )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

create or replace function public.release_catalog_script_notion_sync_lease(
  p_script_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Not authorized to release Notion sync leases.' using errcode = '42501';
  end if;

  if p_script_id is null or p_lease_token is null then
    raise exception 'Script id and lease token are required.' using errcode = '22023';
  end if;

  update public.catalog_scripts
  set
    notion_sync_lease_token = null,
    notion_sync_lease_until = null
  where id = p_script_id
    and notion_sync_lease_token = p_lease_token
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

revoke all on function public.claim_catalog_script_notion_sync_lease(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.release_catalog_script_notion_sync_lease(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.claim_catalog_script_notion_sync_lease(uuid, uuid, integer)
  to service_role;
grant execute on function public.release_catalog_script_notion_sync_lease(uuid, uuid)
  to service_role;

comment on function public.claim_catalog_script_notion_sync_lease(uuid, uuid, integer) is
  'Service-role-only atomic claim or renewal of a short per-script Notion synchronization lease.';
comment on function public.release_catalog_script_notion_sync_lease(uuid, uuid) is
  'Service-role-only token-checked release; an expired worker cannot clear a newer lease.';

alter table public.script_admin_users enable row level security;
alter table public.catalog_scripts enable row level security;
alter table public.catalog_script_versions enable row level security;
alter table public.script_sync_jobs enable row level security;
alter table public.script_audit_log enable row level security;

drop policy if exists "Script staff can read own membership" on public.script_admin_users;
create policy "Script staff can read own membership"
on public.script_admin_users
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_script_admin(array['admin']::text[])
);

drop policy if exists "Script admins can add staff" on public.script_admin_users;
create policy "Script admins can add staff"
on public.script_admin_users
for insert
to authenticated
with check (public.is_script_admin(array['admin']::text[]));

drop policy if exists "Script admins can update staff" on public.script_admin_users;
create policy "Script admins can update staff"
on public.script_admin_users
for update
to authenticated
using (public.is_script_admin(array['admin']::text[]))
with check (public.is_script_admin(array['admin']::text[]));

drop policy if exists "Script admins can remove staff" on public.script_admin_users;
create policy "Script admins can remove staff"
on public.script_admin_users
for delete
to authenticated
using (public.is_script_admin(array['admin']::text[]));

drop policy if exists "Script staff can read catalog scripts" on public.catalog_scripts;
create policy "Script staff can read catalog scripts"
on public.catalog_scripts
for select
to authenticated
using (public.is_script_admin());

drop policy if exists "Script staff can read catalog versions" on public.catalog_script_versions;
create policy "Script staff can read catalog versions"
on public.catalog_script_versions
for select
to authenticated
using (public.is_script_admin());

drop policy if exists "Script publishers can read sync jobs" on public.script_sync_jobs;
create policy "Script publishers can read sync jobs"
on public.script_sync_jobs
for select
to authenticated
using (public.is_script_admin(array['publisher', 'admin']::text[]));

drop policy if exists "Script publishers can read audit log" on public.script_audit_log;
create policy "Script publishers can read audit log"
on public.script_audit_log
for select
to authenticated
using (public.is_script_admin(array['publisher', 'admin']::text[]));

-- Base management tables stay private. Staff mutations go through the atomic
-- RPCs below; service-role workers may update the outbox directly.
revoke all on table public.script_admin_users from public, anon, authenticated;
revoke all on table public.catalog_scripts from public, anon, authenticated;
revoke all on table public.catalog_script_versions from public, anon, authenticated;
revoke all on table public.script_sync_jobs from public, anon, authenticated;
revoke all on table public.script_audit_log from public, anon, authenticated;

-- Explicit server-only grants are required when the Supabase project is
-- configured not to auto-expose new public-schema tables.
grant all on table public.script_admin_users to service_role;
grant all on table public.catalog_scripts to service_role;
grant all on table public.catalog_script_versions to service_role;
grant all on table public.script_sync_jobs to service_role;
grant all on table public.script_audit_log to service_role;

grant select on table public.script_admin_users to authenticated;
grant insert (user_id, role, display_name, is_active, created_by)
  on public.script_admin_users to authenticated;
grant update (role, display_name, is_active)
  on public.script_admin_users to authenticated;
grant delete on table public.script_admin_users to authenticated;

grant select on table public.catalog_scripts to authenticated;
grant select on table public.catalog_script_versions to authenticated;
grant select on table public.script_sync_jobs to authenticated;
grant select on table public.script_audit_log to authenticated;

-- The public API receives only the current immutable published version. The
-- draft pointer, forum relation, staff fields, outbox, and audit data are not
-- exposed by this view.
create or replace view public.published_script_catalog
with (security_barrier = true)
as
select
  script.id,
  script.notion_page_id,
  script.slug,
  script.published_at,
  script.updated_at,
  version.id as version_id,
  version.version_no as version_number,
  version.content
from public.catalog_scripts as script
join public.catalog_script_versions as version
  on version.script_id = script.id
 and version.id = script.published_version_id
where script.status = 'published';

revoke all on table public.published_script_catalog from public, anon, authenticated;
grant select on table public.published_script_catalog to anon, authenticated, service_role;

comment on view public.published_script_catalog is
  'Only the version referenced by a published catalog script. This is the sole anonymous catalog read surface.';

comment on column public.catalog_script_versions.content is
  'Immutable JSON object. Full validation belongs to the API; publish RPC enforces the minimum public contract.';

-- Public cover delivery with tightly scoped staff-only object mutations.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'script-covers',
  'script-covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read script covers" on storage.objects;
create policy "Public can read script covers"
on storage.objects
for select
to public
using (bucket_id = 'script-covers');

drop policy if exists "Script staff can upload script covers" on storage.objects;
create policy "Script staff can upload script covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'script-covers'
  and public.is_script_admin()
);

drop policy if exists "Script staff can replace script covers" on storage.objects;
drop policy if exists "Script staff can delete script covers" on storage.objects;
-- Covers use immutable random paths. Browser sessions may add a new object,
-- but cannot overwrite or delete an existing published cover. Cleanup, if
-- ever needed, is an explicit service-role maintenance operation.

-- Save a complete draft as one transaction. A null script id creates the
-- script plus version 1; an existing id uses optimistic version checking.
-- The advisory lock guarantees concurrent retries with the same key converge.
create or replace function public.save_catalog_script_draft(
  p_script_id uuid,
  p_slug text,
  p_content jsonb,
  p_actor_id uuid,
  p_actor_type text,
  p_expected_version_number integer,
  p_idempotency_key text
)
returns public.catalog_script_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script public.catalog_scripts%rowtype;
  v_version public.catalog_script_versions%rowtype;
  v_existing public.catalog_script_versions%rowtype;
  v_current_version_number integer;
  v_next_version_number integer;
  v_slug text;
  v_source text;
  v_is_service_role boolean;
  v_before_state jsonb;
begin
  v_is_service_role := coalesce(auth.role() = 'service_role', false);

  if p_actor_type is null or p_actor_type not in ('human', 'ai', 'import') then
    raise exception 'Invalid draft actor type.' using errcode = '22023';
  end if;

  if not v_is_service_role then
    if p_actor_type <> 'human'
      or p_actor_id is distinct from (select auth.uid())
      or not public.is_script_admin()
    then
      raise exception 'Not authorized to save script drafts.' using errcode = '42501';
    end if;
  elsif p_actor_type = 'human' and p_actor_id is null then
    raise exception 'Human draft writes require an actor id.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_content) is distinct from 'object' then
    raise exception 'Draft content must be a JSON object.' using errcode = '22023';
  end if;

  v_slug := lower(btrim(coalesce(p_slug, '')));
  if v_slug = '' then
    raise exception 'A slug is required.' using errcode = '22023';
  end if;

  if p_idempotency_key is null
    or p_idempotency_key <> btrim(p_idempotency_key)
    or char_length(p_idempotency_key) not between 1 and 255
  then
    raise exception 'A valid idempotency key is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select *
  into v_existing
  from public.catalog_script_versions
  where idempotency_key = p_idempotency_key;

  if found then
    select *
    into v_script
    from public.catalog_scripts
    where id = v_existing.script_id;

    if (p_script_id is not null and v_existing.script_id <> p_script_id)
      or v_existing.source <> p_actor_type
      or v_existing.content <> p_content
      or v_script.slug <> v_slug
    then
      raise exception 'Idempotency key was already used for a different draft.'
        using errcode = '23505';
    end if;

    return v_existing;
  end if;

  v_source := p_actor_type;

  if p_script_id is null then
    if p_expected_version_number is not null
      and p_expected_version_number <> 0
    then
      raise exception 'A new script expects version 0.' using errcode = '40001';
    end if;

    insert into public.catalog_scripts (
      slug,
      status,
      created_by,
      updated_by
    )
    values (
      v_slug,
      'draft',
      p_actor_id,
      p_actor_id
    )
    returning * into v_script;

    insert into public.catalog_script_versions (
      script_id,
      version_no,
      source,
      content,
      idempotency_key,
      created_by
    )
    values (
      v_script.id,
      1,
      v_source,
      p_content,
      p_idempotency_key,
      p_actor_id
    )
    returning * into v_version;

    update public.catalog_scripts
    set
      draft_version_id = v_version.id,
      updated_by = p_actor_id
    where id = v_script.id;

    insert into public.script_audit_log (
      script_id,
      version_id,
      actor_user_id,
      actor_type,
      action,
      after_state
    )
    values (
      v_script.id,
      v_version.id,
      p_actor_id,
      p_actor_type,
      'script.draft_created',
      jsonb_build_object(
        'slug', v_slug,
        'status', 'draft',
        'draftVersionId', v_version.id,
        'versionNumber', v_version.version_no
      )
    );

    return v_version;
  end if;

  select *
  into v_script
  from public.catalog_scripts
  where id = p_script_id
  for update;

  if not found then
    raise exception 'Catalog script was not found.' using errcode = 'P0002';
  end if;

  if v_script.published_version_id is not null and v_script.slug <> v_slug then
    raise exception 'A published script slug is immutable.' using errcode = '22023';
  end if;

  if v_script.draft_version_id is null then
    v_current_version_number := 0;
  else
    select version_no
    into v_current_version_number
    from public.catalog_script_versions
    where script_id = v_script.id
      and id = v_script.draft_version_id;

    if not found then
      raise exception 'The current draft pointer is invalid.' using errcode = '23503';
    end if;
  end if;

  if p_expected_version_number is distinct from v_current_version_number then
    raise exception 'Draft version conflict: expected %, current %.',
      p_expected_version_number,
      v_current_version_number
      using errcode = '40001';
  end if;

  v_next_version_number := v_current_version_number + 1;
  v_before_state := jsonb_build_object(
    'slug', v_script.slug,
    'status', v_script.status,
    'draftVersionId', v_script.draft_version_id,
    'publishedVersionId', v_script.published_version_id,
    'versionNumber', v_current_version_number
  );

  insert into public.catalog_script_versions (
    script_id,
    version_no,
    source,
    content,
    idempotency_key,
    created_by
  )
  values (
    v_script.id,
    v_next_version_number,
    v_source,
    p_content,
    p_idempotency_key,
    p_actor_id
  )
  returning * into v_version;

  update public.catalog_scripts
  set
    slug = v_slug,
    draft_version_id = v_version.id,
    updated_by = p_actor_id
  where id = v_script.id;

  insert into public.script_audit_log (
    script_id,
    version_id,
    actor_user_id,
    actor_type,
    action,
    before_state,
    after_state
  )
  values (
    v_script.id,
    v_version.id,
    p_actor_id,
    p_actor_type,
    'script.draft_saved',
    v_before_state,
    jsonb_build_object(
      'slug', v_slug,
      'status', v_script.status,
      'draftVersionId', v_version.id,
      'publishedVersionId', v_script.published_version_id,
      'versionNumber', v_version.version_no
    )
  );

  return v_version;
end;
$$;

-- Atomically switch the live pointer only after validating the current draft.
-- The former published version remains immutable and available for rollback.
create or replace function public.publish_catalog_script(
  p_script_id uuid,
  p_version_id uuid,
  p_actor_id uuid,
  p_actor_type text
)
returns public.catalog_scripts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script public.catalog_scripts%rowtype;
  v_version public.catalog_script_versions%rowtype;
  v_result public.catalog_scripts%rowtype;
  v_before_state jsonb;
  v_job_key text;
  v_has_duration_minutes boolean := false;
  v_has_duration_label boolean := false;
  v_is_service_role boolean;
begin
  v_is_service_role := coalesce(auth.role() = 'service_role', false);

  if p_actor_type is null or p_actor_type not in ('human', 'ai', 'import', 'system') then
    raise exception 'Invalid publish actor type.' using errcode = '22023';
  end if;

  if not v_is_service_role then
    if p_actor_type <> 'human'
      or p_actor_id is distinct from (select auth.uid())
      or not public.is_script_admin(array['publisher', 'admin']::text[])
    then
      raise exception 'Not authorized to publish scripts.' using errcode = '42501';
    end if;
  elsif p_actor_type = 'human' and p_actor_id is null then
    raise exception 'Human publication requires an actor id.' using errcode = '22023';
  end if;

  select *
  into v_script
  from public.catalog_scripts
  where id = p_script_id
  for update;

  if not found then
    raise exception 'Catalog script was not found.' using errcode = 'P0002';
  end if;

  if v_script.status = 'published'
    and v_script.published_version_id = p_version_id
  then
    return v_script;
  end if;

  if v_script.draft_version_id is distinct from p_version_id then
    raise exception 'Only the current draft version can be published.' using errcode = '22023';
  end if;

  select *
  into v_version
  from public.catalog_script_versions
  where script_id = p_script_id
    and id = p_version_id;

  if not found then
    raise exception 'Catalog version does not belong to this script.' using errcode = '23503';
  end if;

  if jsonb_typeof(v_version.content) is distinct from 'object' then
    raise exception 'Published content must be a JSON object.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'name') is distinct from 'string'
    or nullif(btrim(v_version.content ->> 'name'), '') is null
  then
    raise exception 'Published content requires name.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'synopsis') is distinct from 'string'
    or nullif(btrim(v_version.content ->> 'synopsis'), '') is null
  then
    raise exception 'Published content requires synopsis.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'cover') is distinct from 'object'
    or jsonb_typeof(v_version.content #> '{cover,url}') is distinct from 'string'
    or nullif(btrim(v_version.content #>> '{cover,url}'), '') is null
  then
    raise exception 'Published content requires cover.url.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'playerMin') is distinct from 'number' then
    raise exception 'playerMin must be a positive integer.' using errcode = '22023';
  end if;
  if (v_version.content ->> 'playerMin') !~ '^[1-9][0-9]*$' then
    raise exception 'playerMin must be a positive integer.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'playerMax') is distinct from 'number' then
    raise exception 'playerMax must be a positive integer.' using errcode = '22023';
  end if;
  if (v_version.content ->> 'playerMax') !~ '^[1-9][0-9]*$' then
    raise exception 'playerMax must be a positive integer.' using errcode = '22023';
  end if;

  if (v_version.content ->> 'playerMin')::numeric
    > (v_version.content ->> 'playerMax')::numeric
  then
    raise exception 'playerMin cannot exceed playerMax.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_version.content -> 'priceStatus') is distinct from 'string'
    or (v_version.content ->> 'priceStatus') not in ('fixed', 'free', 'tbd')
  then
    raise exception 'priceStatus must be fixed, free, or tbd.' using errcode = '22023';
  end if;

  if (v_version.content ->> 'priceStatus') = 'fixed' then
    if jsonb_typeof(v_version.content -> 'price') is distinct from 'number' then
      raise exception 'A fixed price must be a non-negative number.' using errcode = '22023';
    end if;
    if (v_version.content ->> 'price')::numeric < 0 then
      raise exception 'A fixed price must be a non-negative number.' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(v_version.content -> 'durationMinutes') = 'number'
    and (v_version.content ->> 'durationMinutes') ~ '^[1-9][0-9]*$'
  then
    v_has_duration_minutes := true;
  end if;

  if jsonb_typeof(v_version.content -> 'durationLabel') = 'string'
    and nullif(btrim(v_version.content ->> 'durationLabel'), '') is not null
  then
    v_has_duration_label := true;
  end if;

  if not (v_has_duration_minutes or v_has_duration_label) then
    raise exception 'A positive durationMinutes or non-empty durationLabel is required.'
      using errcode = '22023';
  end if;

  v_before_state := jsonb_build_object(
    'status', v_script.status,
    'draftVersionId', v_script.draft_version_id,
    'publishedVersionId', v_script.published_version_id,
    'publishedAt', v_script.published_at,
    'unpublishedAt', v_script.unpublished_at
  );

  update public.catalog_scripts
  set
    status = 'published',
    draft_version_id = p_version_id,
    published_version_id = p_version_id,
    published_at = now(),
    unpublished_at = null,
    updated_by = p_actor_id
  where id = p_script_id
  returning * into v_result;

  insert into public.script_audit_log (
    script_id,
    version_id,
    actor_user_id,
    actor_type,
    action,
    before_state,
    after_state
  )
  values (
    p_script_id,
    p_version_id,
    p_actor_id,
    p_actor_type,
    'script.published',
    v_before_state,
    jsonb_build_object(
      'status', v_result.status,
      'draftVersionId', v_result.draft_version_id,
      'publishedVersionId', v_result.published_version_id,
      'publishedAt', v_result.published_at
    )
  );

  v_job_key := concat(
    'catalog:',
    p_script_id::text,
    ':',
    p_version_id::text,
    ':notion:upsert'
  );

  insert into public.script_sync_jobs (
    script_id,
    version_id,
    target,
    action,
    status,
    attempts,
    payload,
    idempotency_key,
    last_error,
    next_attempt_at
  )
  values (
    p_script_id,
    p_version_id,
    'notion',
    'upsert',
    'pending',
    0,
    jsonb_build_object(
      'scriptId', p_script_id,
      'versionId', p_version_id,
      'slug', v_result.slug,
      'notionPageId', v_result.notion_page_id,
      'content', v_version.content
    ),
    v_job_key,
    null,
    now()
  )
  on conflict (idempotency_key) do update
  set
    status = 'pending',
    attempts = 0,
    payload = excluded.payload,
    last_error = null,
    next_attempt_at = now();

  return v_result;
end;
$$;

-- Unpublishing removes the row from the safe public view but intentionally
-- retains published_version_id so the released content remains traceable and
-- a subsequent release can be deliberate.
-- Remove the pre-preview four-argument draft of this RPC if this additive
-- migration is re-run against a local database used during development.
drop function if exists public.unpublish_catalog_script(uuid, uuid, text, text);

create or replace function public.unpublish_catalog_script(
  p_script_id uuid,
  p_actor_id uuid,
  p_actor_type text,
  p_expected_published_version_no integer,
  p_reason text default null
)
returns public.catalog_scripts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script public.catalog_scripts%rowtype;
  v_result public.catalog_scripts%rowtype;
  v_before_state jsonb;
  v_job_key text;
  v_is_service_role boolean;
  v_published_version_no integer;
begin
  v_is_service_role := coalesce(auth.role() = 'service_role', false);

  if p_actor_type is null or p_actor_type not in ('human', 'ai', 'import', 'system') then
    raise exception 'Invalid unpublish actor type.' using errcode = '22023';
  end if;

  if not v_is_service_role then
    if p_actor_type <> 'human'
      or p_actor_id is distinct from (select auth.uid())
      or not public.is_script_admin(array['publisher', 'admin']::text[])
    then
      raise exception 'Not authorized to unpublish scripts.' using errcode = '42501';
    end if;
  elsif p_actor_type = 'human' and p_actor_id is null then
    raise exception 'Human unpublish actions require an actor id.' using errcode = '22023';
  end if;

  select *
  into v_script
  from public.catalog_scripts
  where id = p_script_id
  for update;

  if not found then
    raise exception 'Catalog script was not found.' using errcode = 'P0002';
  end if;

  if v_script.status = 'unpublished' then
    return v_script;
  end if;

  if v_script.status <> 'published' or v_script.published_version_id is null then
    raise exception 'Only a published script can be unpublished.' using errcode = '22023';
  end if;

  select version_no
  into v_published_version_no
  from public.catalog_script_versions
  where script_id = v_script.id
    and id = v_script.published_version_id;

  if not found then
    raise exception 'The published version pointer is invalid.' using errcode = '23503';
  end if;

  if p_expected_published_version_no is distinct from v_published_version_no then
    raise exception 'Published version conflict: expected %, current %.',
      p_expected_published_version_no,
      v_published_version_no
      using errcode = '40001';
  end if;

  v_before_state := jsonb_build_object(
    'status', v_script.status,
    'draftVersionId', v_script.draft_version_id,
    'publishedVersionId', v_script.published_version_id,
    'publishedAt', v_script.published_at,
    'unpublishedAt', v_script.unpublished_at
  );

  update public.catalog_scripts
  set
    status = 'unpublished',
    unpublished_at = now(),
    updated_by = p_actor_id
  where id = p_script_id
  returning * into v_result;

  insert into public.script_audit_log (
    script_id,
    version_id,
    actor_user_id,
    actor_type,
    action,
    reason,
    before_state,
    after_state
  )
  values (
    p_script_id,
    v_script.published_version_id,
    p_actor_id,
    p_actor_type,
    'script.unpublished',
    nullif(btrim(p_reason), ''),
    v_before_state,
    jsonb_build_object(
      'status', v_result.status,
      'draftVersionId', v_result.draft_version_id,
      'publishedVersionId', v_result.published_version_id,
      'publishedAt', v_result.published_at,
      'unpublishedAt', v_result.unpublished_at
    )
  );

  v_job_key := concat(
    'catalog:',
    p_script_id::text,
    ':',
    v_script.published_version_id::text,
    ':notion:unpublish'
  );

  insert into public.script_sync_jobs (
    script_id,
    version_id,
    target,
    action,
    status,
    attempts,
    payload,
    idempotency_key,
    last_error,
    next_attempt_at
  )
  values (
    p_script_id,
    v_script.published_version_id,
    'notion',
    'unpublish',
    'pending',
    0,
    jsonb_build_object(
      'scriptId', p_script_id,
      'versionId', v_script.published_version_id,
      'slug', v_result.slug,
      'notionPageId', v_result.notion_page_id,
      'reason', nullif(btrim(p_reason), '')
    ),
    v_job_key,
    null,
    now()
  )
  on conflict (idempotency_key) do update
  set
    status = 'pending',
    attempts = 0,
    payload = excluded.payload,
    last_error = null,
    next_attempt_at = now();

  return v_result;
end;
$$;

revoke all on function public.set_script_catalog_updated_at() from public, anon, authenticated;
revoke all on function public.save_catalog_script_draft(uuid, text, jsonb, uuid, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.publish_catalog_script(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.unpublish_catalog_script(uuid, uuid, text, integer, text)
  from public, anon, authenticated;

grant execute on function public.save_catalog_script_draft(uuid, text, jsonb, uuid, text, integer, text)
  to authenticated, service_role;
grant execute on function public.publish_catalog_script(uuid, uuid, uuid, text)
  to authenticated, service_role;
grant execute on function public.unpublish_catalog_script(uuid, uuid, text, integer, text)
  to authenticated, service_role;

comment on function public.save_catalog_script_draft(uuid, text, jsonb, uuid, text, integer, text) is
  'Atomically creates or versions a draft with optimistic concurrency and idempotent retries.';
comment on function public.publish_catalog_script(uuid, uuid, uuid, text) is
  'Atomically validates and publishes the current draft, writes audit history, and queues a Notion upsert.';
comment on function public.unpublish_catalog_script(uuid, uuid, text, integer, text) is
  'Atomically verifies the expected published version, hides it while retaining its pointer, then audits and queues Notion unpublish.';
