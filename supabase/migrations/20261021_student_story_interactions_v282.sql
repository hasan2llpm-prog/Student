begin;
create table if not exists public.student_story_reactions_v282 (
  story_id uuid not null references public.student_stories_v281(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','laugh','wow','sad','fire')),
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
create table if not exists public.student_story_replies_v282 (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.student_stories_v281(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists student_story_replies_lookup_v282 on public.student_story_replies_v282(story_id, created_at asc);
alter table public.student_story_reactions_v282 enable row level security;
alter table public.student_story_replies_v282 enable row level security;
drop policy if exists student_story_reactions_v282_select on public.student_story_reactions_v282;
create policy student_story_reactions_v282_select on public.student_story_reactions_v282 for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.student_stories_v281 s where s.id = story_id and s.user_id = auth.uid()));
drop policy if exists student_story_reactions_v282_write on public.student_story_reactions_v282;
create policy student_story_reactions_v282_write on public.student_story_reactions_v282 for insert to authenticated with check (user_id = auth.uid());
drop policy if exists student_story_reactions_v282_update on public.student_story_reactions_v282;
create policy student_story_reactions_v282_update on public.student_story_reactions_v282 for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists student_story_reactions_v282_delete on public.student_story_reactions_v282;
create policy student_story_reactions_v282_delete on public.student_story_reactions_v282 for delete to authenticated using (user_id = auth.uid());
drop policy if exists student_story_replies_v282_select on public.student_story_replies_v282;
create policy student_story_replies_v282_select on public.student_story_replies_v282 for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.student_stories_v281 s where s.id = story_id and s.user_id = auth.uid()));
drop policy if exists student_story_replies_v282_insert on public.student_story_replies_v282;
create policy student_story_replies_v282_insert on public.student_story_replies_v282 for insert to authenticated with check (user_id = auth.uid());
drop policy if exists student_story_replies_v282_delete on public.student_story_replies_v282;
create policy student_story_replies_v282_delete on public.student_story_replies_v282 for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.student_story_reactions_v282 to authenticated;
grant select, insert, delete on public.student_story_replies_v282 to authenticated;
commit;
