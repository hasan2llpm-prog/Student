-- Student v1.9.0 QA
-- Reels V2 + runtime forced update control.
-- Safe to rerun.

create table if not exists public.student_runtime_settings(
  id integer primary key default 1 check (id=1),
  force_update boolean not null default false,
  minimum_version_code integer not null default 0 check (minimum_version_code>=0),
  latest_version_code integer not null default 0 check (latest_version_code>=0),
  apk_url text not null default '',
  update_message text not null default 'يتوفر تحديث ضروري لمتابعة استخدام Student.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.student_runtime_settings(id)
values(1)
on conflict(id) do nothing;

alter table public.student_runtime_settings enable row level security;
drop policy if exists student_runtime_settings_public_read_v19 on public.student_runtime_settings;
create policy student_runtime_settings_public_read_v19
on public.student_runtime_settings for select
to anon, authenticated
using (id=1);

revoke insert,update,delete on public.student_runtime_settings from anon, authenticated;
grant select on public.student_runtime_settings to anon, authenticated;

create or replace function public.student_admin_set_runtime_update_v19(
  p_force_update boolean,
  p_minimum_version_code integer,
  p_latest_version_code integer,
  p_apk_url text,
  p_update_message text
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
  if coalesce(p_minimum_version_code,0) < 0 then raise exception 'invalid_minimum_version'; end if;
  if coalesce(p_latest_version_code,0) < coalesce(p_minimum_version_code,0) then raise exception 'latest_must_be_gte_minimum'; end if;
  if coalesce(p_force_update,false) and nullif(trim(coalesce(p_apk_url,'')),'') is null then
    raise exception 'apk_url_required_for_forced_update';
  end if;

  insert into public.student_runtime_settings(
    id,force_update,minimum_version_code,latest_version_code,apk_url,update_message,updated_at,updated_by
  ) values(
    1,
    coalesce(p_force_update,false),
    coalesce(p_minimum_version_code,0),
    coalesce(p_latest_version_code,0),
    trim(coalesce(p_apk_url,'')),
    left(coalesce(nullif(trim(p_update_message),''),'يتوفر تحديث ضروري لمتابعة استخدام Student.'),500),
    now(),
    auth.uid()
  )
  on conflict(id) do update set
    force_update=excluded.force_update,
    minimum_version_code=excluded.minimum_version_code,
    latest_version_code=excluded.latest_version_code,
    apk_url=excluded.apk_url,
    update_message=excluded.update_message,
    updated_at=now(),
    updated_by=auth.uid();
end $$;
revoke all on function public.student_admin_set_runtime_update_v19(boolean,integer,integer,text,text) from public, anon;
grant execute on function public.student_admin_set_runtime_update_v19(boolean,integer,integer,text,text) to authenticated;

-- -------------------------------------------------------------------
-- Reels
-- -------------------------------------------------------------------
create table if not exists public.reels(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null,
  caption text,
  thumbnail_url text,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reels add column if not exists hls_url text;
alter table public.reels add column if not exists video_low_url text;
alter table public.reels add column if not exists visibility text not null default 'public';
alter table public.reels add column if not exists updated_at timestamptz not null default now();
update public.reels set visibility='public' where visibility is null;

create table if not exists public.reel_likes(
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(reel_id,user_id)
);

create table if not exists public.reel_views(
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reel_comments(
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.reel_comments add column if not exists parent_id uuid;
alter table public.reel_comments add column if not exists updated_at timestamptz;
alter table public.reel_comments add column if not exists deleted_at timestamptz;

create table if not exists public.reel_comment_reactions(
  comment_id uuid not null references public.reel_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  primary key(comment_id,user_id)
);

-- reel_saves must use the SAME type as public.reels.id.
-- Older Student databases use bigint for reels.id, while clean installs may use uuid.
do $$
declare
  v_reel_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into v_reel_id_type
  from pg_attribute a
  where a.attrelid = 'public.reels'::regclass
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if v_reel_id_type is null then
    raise exception 'Could not determine public.reels.id type';
  end if;

  if to_regclass('public.reel_saves') is null then
    execute format(
      'create table public.reel_saves(
         reel_id %s not null references public.reels(id) on delete cascade,
         user_id uuid not null references auth.users(id) on delete cascade,
         created_at timestamptz not null default now(),
         primary key(reel_id,user_id)
       )',
      v_reel_id_type
    );
  end if;
end $$;

create index if not exists idx_reels_created_v19 on public.reels(created_at desc);
create index if not exists idx_reels_user_created_v19 on public.reels(user_id,created_at desc);
create index if not exists idx_reel_comments_reel_created_v19 on public.reel_comments(reel_id,created_at);
create index if not exists idx_reel_comments_parent_v19 on public.reel_comments(parent_id);
create index if not exists idx_reel_views_reel_v19 on public.reel_views(reel_id);

alter table public.reels enable row level security;
alter table public.reel_likes enable row level security;
alter table public.reel_views enable row level security;
alter table public.reel_comments enable row level security;
alter table public.reel_comment_reactions enable row level security;
alter table public.reel_saves enable row level security;

drop policy if exists reels_read_v19 on public.reels;
create policy reels_read_v19 on public.reels for select to authenticated using (visibility='public' or user_id=auth.uid());
drop policy if exists reels_insert_own_v19 on public.reels;
create policy reels_insert_own_v19 on public.reels for insert to authenticated with check(user_id=auth.uid());
drop policy if exists reels_update_own_v19 on public.reels;
create policy reels_update_own_v19 on public.reels for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists reels_delete_own_v19 on public.reels;
create policy reels_delete_own_v19 on public.reels for delete to authenticated using(user_id=auth.uid());

drop policy if exists reel_likes_read_v19 on public.reel_likes;
create policy reel_likes_read_v19 on public.reel_likes for select to authenticated using(true);
drop policy if exists reel_likes_own_v19 on public.reel_likes;
create policy reel_likes_own_v19 on public.reel_likes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists reel_views_read_v19 on public.reel_views;
create policy reel_views_read_v19 on public.reel_views for select to authenticated using(true);
drop policy if exists reel_views_insert_v19 on public.reel_views;
create policy reel_views_insert_v19 on public.reel_views for insert to authenticated with check(user_id=auth.uid());

drop policy if exists reel_comments_read_v19 on public.reel_comments;
create policy reel_comments_read_v19 on public.reel_comments for select to authenticated using(deleted_at is null);
drop policy if exists reel_comments_insert_v19 on public.reel_comments;
create policy reel_comments_insert_v19 on public.reel_comments for insert to authenticated with check(user_id=auth.uid());
drop policy if exists reel_comments_update_own_v19 on public.reel_comments;
create policy reel_comments_update_own_v19 on public.reel_comments for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists reel_comments_delete_own_v19 on public.reel_comments;
create policy reel_comments_delete_own_v19 on public.reel_comments for delete to authenticated using(user_id=auth.uid());

drop policy if exists reel_comment_reactions_read_v19 on public.reel_comment_reactions;
create policy reel_comment_reactions_read_v19 on public.reel_comment_reactions for select to authenticated using(true);
drop policy if exists reel_comment_reactions_own_v19 on public.reel_comment_reactions;
create policy reel_comment_reactions_own_v19 on public.reel_comment_reactions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists reel_saves_own_v19 on public.reel_saves;
create policy reel_saves_own_v19 on public.reel_saves for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

grant select,insert,update,delete on public.reels to authenticated;
grant select,insert,delete on public.reel_likes to authenticated;
grant select,insert on public.reel_views to authenticated;
grant select,insert,update,delete on public.reel_comments to authenticated;
grant select,insert,update,delete on public.reel_comment_reactions to authenticated;
grant select,insert,delete on public.reel_saves to authenticated;

-- Reels media bucket. Existing Student storage policies may already cover authenticated users.
insert into storage.buckets(id,name,public)
values('reels','reels',true)
on conflict(id) do update set public=true;

drop policy if exists student_reels_public_read_v19 on storage.objects;
create policy student_reels_public_read_v19 on storage.objects
for select to public using(bucket_id='reels');

drop policy if exists student_reels_insert_own_v19 on storage.objects;
create policy student_reels_insert_own_v19 on storage.objects
for insert to authenticated
with check(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_reels_update_own_v19 on storage.objects;
create policy student_reels_update_own_v19 on storage.objects
for update to authenticated
using(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_reels_delete_own_v19 on storage.objects;
create policy student_reels_delete_own_v19 on storage.objects
for delete to authenticated
using(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

notify pgrst, 'reload schema';
