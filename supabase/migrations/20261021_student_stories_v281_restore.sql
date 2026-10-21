begin;

create table if not exists public.student_stories_v281 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text,
  media_type text not null default 'text' check (media_type in ('text','image','video')),
  caption text not null default '',
  background_color text not null default '#6D28D9',
  duration_seconds integer not null default 5 check (duration_seconds between 3 and 15),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  moderation_status text not null default 'approved' check (moderation_status in ('approved','rejected','review')),
  constraint student_stories_v281_media_required check (media_type = 'text' or nullif(btrim(coalesce(media_url,'')),'') is not null)
);
create index if not exists student_stories_v281_active_idx on public.student_stories_v281 (created_at desc) where moderation_status = 'approved';
create index if not exists student_stories_v281_user_idx on public.student_stories_v281 (user_id, created_at desc);

create table if not exists public.student_story_views_v281 (
  story_id uuid not null references public.student_stories_v281(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.student_stories_v281 enable row level security;
alter table public.student_story_views_v281 enable row level security;

drop policy if exists student_stories_v281_read on public.student_stories_v281;
create policy student_stories_v281_read on public.student_stories_v281 for select to authenticated using (expires_at > now() and moderation_status = 'approved' and (user_id = auth.uid() or not exists (select 1 from public.profiles p where p.id = user_id and p.account_status = 'private') or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = user_id)));
drop policy if exists student_stories_v281_insert on public.student_stories_v281;
create policy student_stories_v281_insert on public.student_stories_v281 for insert to authenticated with check (user_id = auth.uid());
drop policy if exists student_stories_v281_update on public.student_stories_v281;
create policy student_stories_v281_update on public.student_stories_v281 for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists student_stories_v281_delete on public.student_stories_v281;
create policy student_stories_v281_delete on public.student_stories_v281 for delete to authenticated using (user_id = auth.uid());

drop policy if exists student_story_views_v281_insert on public.student_story_views_v281;
create policy student_story_views_v281_insert on public.student_story_views_v281 for insert to authenticated with check (user_id = auth.uid());
drop policy if exists student_story_views_v281_update on public.student_story_views_v281;
create policy student_story_views_v281_update on public.student_story_views_v281 for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists student_story_views_v281_select on public.student_story_views_v281;
create policy student_story_views_v281_select on public.student_story_views_v281 for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.student_stories_v281 s where s.id = story_id and s.user_id = auth.uid()));

grant select, insert, update, delete on public.student_stories_v281 to authenticated;
grant select, insert, update on public.student_story_views_v281 to authenticated;

insert into storage.buckets(id, name, public) values ('stories', 'stories', true) on conflict(id) do update set public = excluded.public;
drop policy if exists student_story_media_public_read_v281 on storage.objects;
create policy student_story_media_public_read_v281 on storage.objects for select to public using (bucket_id = 'stories');
drop policy if exists student_story_media_insert_own_v281 on storage.objects;
create policy student_story_media_insert_own_v281 on storage.objects for insert to authenticated with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists student_story_media_update_own_v281 on storage.objects;
create policy student_story_media_update_own_v281 on storage.objects for update to authenticated using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists student_story_media_delete_own_v281 on storage.objects;
create policy student_story_media_delete_own_v281 on storage.objects for delete to authenticated using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
