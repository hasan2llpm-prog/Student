create extension if not exists pgcrypto;

create table if not exists public.academic_report_settings (
  id integer primary key default 1 check (id = 1),
  free_daily_limit integer not null default 2 check (free_daily_limit >= 0),
  premium_credit_cost integer not null default 1 check (premium_credit_cost > 0),
  free_model text not null default 'openrouter/free',
  premium_model text not null default 'openai/gpt-5-mini',
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.academic_report_settings(id)
values (1)
on conflict (id) do nothing;

create table if not exists public.academic_report_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  premium_credits integer not null default 0 check (premium_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_report_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  department text not null,
  topic text not null,
  language text not null default 'العربية',
  pages integer not null default 4 check (pages between 1 and 20),
  citation_style text not null default 'APA',
  mode text not null check (mode in ('free','premium')),
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  title text,
  content text,
  provider_model text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists academic_report_requests_user_created_idx
on public.academic_report_requests(user_id, created_at desc);

alter table public.academic_report_settings enable row level security;
alter table public.academic_report_balances enable row level security;
alter table public.academic_report_requests enable row level security;

drop policy if exists "academic_report_settings_read" on public.academic_report_settings;
create policy "academic_report_settings_read"
on public.academic_report_settings for select to authenticated
using (true);

drop policy if exists "academic_report_balances_read_own" on public.academic_report_balances;
create policy "academic_report_balances_read_own"
on public.academic_report_balances for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "academic_report_requests_read_own" on public.academic_report_requests;
create policy "academic_report_requests_read_own"
on public.academic_report_requests for select to authenticated
using (auth.uid() = user_id);

grant select on public.academic_report_settings to authenticated;
grant select on public.academic_report_balances to authenticated;
grant select on public.academic_report_requests to authenticated;

create or replace function public.academic_report_free_remaining(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  select free_daily_limit into v_limit from public.academic_report_settings where id = 1;
  select count(*)::integer into v_used
  from public.academic_report_requests
  where user_id = p_user_id
    and mode = 'free'
    and status = 'completed'
    and created_at >= date_trunc('day', now());
  return greatest(coalesce(v_limit, 0) - coalesce(v_used, 0), 0);
end;
$$;

create or replace function public.academic_report_consume_premium_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_balance integer;
begin
  select premium_credit_cost into v_cost from public.academic_report_settings where id = 1;
  insert into public.academic_report_balances(user_id, premium_credits)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select premium_credits into v_balance
  from public.academic_report_balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance,0) < coalesce(v_cost,1) then
    raise exception 'INSUFFICIENT_REPORT_CREDITS';
  end if;

  update public.academic_report_balances
  set premium_credits = premium_credits - v_cost, updated_at = now()
  where user_id = p_user_id
  returning premium_credits into v_balance;

  return v_balance;
end;
$$;

create or replace function public.admin_grant_academic_report_credits(p_user_id uuid, p_credits integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := false;
  v_balance integer;
begin
  if to_regprocedure('public.current_user_is_admin()') is not null then
    execute 'select public.current_user_is_admin()' into v_is_admin;
  elsif to_regprocedure('public.is_admin()') is not null then
    execute 'select public.is_admin()' into v_is_admin;
  end if;
  if not coalesce(v_is_admin,false) then raise exception 'ADMIN_ONLY'; end if;
  if p_credits <= 0 then raise exception 'INVALID_CREDITS'; end if;

  insert into public.academic_report_balances(user_id, premium_credits)
  values (p_user_id, p_credits)
  on conflict (user_id) do update
  set premium_credits = public.academic_report_balances.premium_credits + excluded.premium_credits,
      updated_at = now()
  returning premium_credits into v_balance;
  return v_balance;
end;
$$;

revoke all on function public.academic_report_consume_premium_credit(uuid) from public, anon, authenticated;
revoke all on function public.academic_report_free_remaining(uuid) from public, anon, authenticated;
grant execute on function public.admin_grant_academic_report_credits(uuid, integer) to authenticated;

-- Make the new feature visible in the existing admin feature-flags panel when the table exists.
do $$
begin
  if to_regclass('public.feature_flags') is not null then
    begin
      execute 'insert into public.feature_flags(name, feature_key, enabled) select $1,$2,$3 where not exists (select 1 from public.feature_flags where feature_key=$2)'
      using 'التقارير الأكاديمية','english_reports',true;
    exception when undefined_column then
      begin
        execute 'insert into public.feature_flags(name, key, enabled) select $1,$2,$3 where not exists (select 1 from public.feature_flags where key=$2)'
        using 'التقارير الأكاديمية','english_reports',true;
      exception when undefined_column then null;
      end;
    end;
  end if;
end $$;
