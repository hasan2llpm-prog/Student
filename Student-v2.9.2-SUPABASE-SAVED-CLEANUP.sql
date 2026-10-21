begin;

-- =========================================================
-- Student v2.9.2 — Unified Saved Items + Document Studio cleanup
-- =========================================================

create table if not exists public.student_saved_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  title text not null default '',
  subtitle text not null default '',
  source text not null default '',
  target text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, content_type, content_id)
);

create index if not exists idx_student_saved_items_user_created
  on public.student_saved_items(user_id, created_at desc);
create index if not exists idx_student_saved_items_user_type
  on public.student_saved_items(user_id, content_type, created_at desc);

alter table public.student_saved_items enable row level security;

drop policy if exists student_saved_items_own_read on public.student_saved_items;
create policy student_saved_items_own_read
on public.student_saved_items for select to authenticated
using (user_id = auth.uid());

drop policy if exists student_saved_items_own_insert on public.student_saved_items;
create policy student_saved_items_own_insert
on public.student_saved_items for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists student_saved_items_own_update on public.student_saved_items;
create policy student_saved_items_own_update
on public.student_saved_items for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists student_saved_items_own_delete on public.student_saved_items;
create policy student_saved_items_own_delete
on public.student_saved_items for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.student_saved_items to authenticated;

create or replace function public.student_saved_upsert_v292(
  p_content_type text,
  p_content_id text,
  p_title text default '',
  p_subtitle text default '',
  p_source text default '',
  p_target text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  ctype text := lower(trim(coalesce(p_content_type,'')));
  cid text := trim(coalesce(p_content_id,''));
begin
  if uid is null then raise exception 'auth_required'; end if;
  if ctype = '' or cid = '' then raise exception 'saved_item_invalid'; end if;

  insert into public.student_saved_items(
    user_id, content_type, content_id, title, subtitle, source, target, metadata
  ) values (
    uid, ctype, cid,
    left(coalesce(p_title,''),300),
    left(coalesce(p_subtitle,''),600),
    left(coalesce(p_source,''),120),
    left(coalesce(p_target,''),500),
    coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(user_id, content_type, content_id) do update
  set title = case when excluded.title <> '' then excluded.title else public.student_saved_items.title end,
      subtitle = case when excluded.subtitle <> '' then excluded.subtitle else public.student_saved_items.subtitle end,
      source = case when excluded.source <> '' then excluded.source else public.student_saved_items.source end,
      target = case when excluded.target <> '' then excluded.target else public.student_saved_items.target end,
      metadata = public.student_saved_items.metadata || excluded.metadata,
      updated_at = now()
  returning id into rid;

  return rid;
end;
$$;

revoke all on function public.student_saved_upsert_v292(text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.student_saved_upsert_v292(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.student_saved_remove_v292(
  p_content_type text,
  p_content_id text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  delete from public.student_saved_items
  where user_id=auth.uid()
    and content_type=lower(trim(coalesce(p_content_type,'')))
    and content_id=trim(coalesce(p_content_id,''));
end;
$$;

revoke all on function public.student_saved_remove_v292(text,text) from public, anon;
grant execute on function public.student_saved_remove_v292(text,text) to authenticated;

-- Migrate legacy saved_items only when the old table/columns are present.
do $$
begin
  if to_regclass('public.saved_items') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_items' and column_name='user_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_items' and column_name='content_type')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_items' and column_name='content_id') then
    execute $m$
      insert into public.student_saved_items(user_id,content_type,content_id,source,created_at,updated_at)
      select user_id, lower(coalesce(content_type,'content')), content_id, 'legacy_saved_items',
             now(), now()
      from public.saved_items
      where user_id is not null and coalesce(content_id,'') <> ''
      on conflict(user_id,content_type,content_id) do nothing
    $m$;
  end if;
end
$$;

-- Fully disable/remove Document Studio server-side catalog entries.
do $$
begin
  if to_regclass('public.student_remote_rules') is not null then
    delete from public.student_remote_rules
    where scope='documents' or rule_key like 'documents.%';
  end if;
  if to_regclass('public.student_remote_assets') is not null then
    delete from public.student_remote_assets
    where asset_type='document_template'
       or asset_key like 'document_%'
       or lower(coalesce(title,'')) like '%مستند%'
       or lower(coalesce(title,'')) like '%pdf%';
  end if;
  if to_regclass('public.student_remote_modules') is not null then
    delete from public.student_remote_modules
    where lower(coalesce(module_key,'')) like '%document%'
       or lower(coalesce(module_key,'')) like '%pdf%'
       or lower(coalesce(target,'')) like '%document%'
       or lower(coalesce(target,'')) like '%pdf%'
       or lower(coalesce(target,'')) like '%studio%';
  end if;
  if to_regclass('public.student_native_runtime_config') is not null then
    update public.student_native_runtime_config
    set config = (coalesce(config,'{}'::jsonb) #- '{documents}') #- '{english,feature_document_studio}',
        updated_at = now()
    where id=1;
  end if;
end
$$;

commit;
