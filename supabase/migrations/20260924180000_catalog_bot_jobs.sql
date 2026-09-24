-- Durable LINE upload conversations. Only the website's service role can use them.
create table if not exists public.catalog_bot_jobs (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  state jsonb,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  constraint catalog_bot_jobs_state_object check (state is null or jsonb_typeof(state) = 'object')
);

alter table public.catalog_bot_jobs enable row level security;
revoke all on table public.catalog_bot_jobs from public, anon, authenticated;
grant all on table public.catalog_bot_jobs to service_role;

create or replace function public.save_catalog_bot_job(
  p_id text,
  p_state jsonb,
  p_expected_revision bigint
)
returns public.catalog_bot_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.catalog_bot_jobs%rowtype;
  v_result public.catalog_bot_jobs%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to save bot jobs.' using errcode = '42501';
  end if;
  if p_id is null or p_id !~ '^[0-9a-f]{64}$'
    or p_expected_revision is null or p_expected_revision < 0
    or (p_state is not null and jsonb_typeof(p_state) <> 'object')
    or octet_length(coalesce(p_state::text, 'null')) > 524288
  then
    raise exception 'Invalid bot job.' using errcode = '22023';
  end if;

  -- Lock an absent row too, so two first writes cannot both claim revision 0.
  perform pg_advisory_xact_lock(hashtextextended('catalog_bot_job:' || p_id, 0));
  select * into v_current from public.catalog_bot_jobs where id = p_id for update;
  if not found then
    if p_expected_revision <> 0 then
      raise exception 'Bot job revision changed.' using errcode = '40001';
    end if;
    insert into public.catalog_bot_jobs(id, state, revision)
      values (p_id, p_state, 1) returning * into v_result;
  else
    -- An uncertain PUT may be retried with the same body and prior revision.
    if v_current.revision = p_expected_revision + 1 and v_current.state is not distinct from p_state then
      return v_current;
    end if;
    if v_current.revision <> p_expected_revision then
      raise exception 'Bot job revision changed.' using errcode = '40001';
    end if;
    update public.catalog_bot_jobs set state = p_state,
      revision = revision + 1, updated_at = now()
      where id = p_id returning * into v_result;
  end if;
  return v_result;
end;
$$;

revoke all on function public.save_catalog_bot_job(text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.save_catalog_bot_job(text, jsonb, bigint) to service_role;
