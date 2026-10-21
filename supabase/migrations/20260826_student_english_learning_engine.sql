-- Student English Learning Engine v1
-- Safe additive migration. Existing social/store data is untouched.

create extension if not exists pgcrypto;

create table if not exists public.english_vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  meaning_ar text not null,
  level text not null default 'A1',
  example_en text,
  example_ar text,
  source text not null default 'core',
  source_rank integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists english_vocabulary_word_source_uidx
on public.english_vocabulary ((lower(word)), source);

create table if not exists public.english_review_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid references public.english_vocabulary(id) on delete cascade,
  word_key text not null,
  next_review_at timestamptz not null default now(),
  interval_days integer not null default 1,
  strength integer not null default 0,
  last_result boolean,
  updated_at timestamptz not null default now(),
  unique(user_id, word_key)
);

create table if not exists public.english_learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cefr_level text not null default 'A1',
  monthly_word_target integer not null default 25 check (monthly_word_target between 5 and 500),
  words_completed integer not null default 0,
  lessons_completed integer not null default 0,
  quiz_points integer not null default 0,
  streak_days integer not null default 0,
  last_learning_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.english_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_type text not null,
  score integer not null default 0,
  total integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.english_vocabulary enable row level security;
alter table public.english_review_queue enable row level security;
alter table public.english_learning_progress enable row level security;
alter table public.english_quiz_attempts enable row level security;

drop policy if exists english_vocab_read on public.english_vocabulary;
create policy english_vocab_read on public.english_vocabulary for select to authenticated using (is_active = true or public.is_student_admin());

drop policy if exists english_review_own on public.english_review_queue;
create policy english_review_own on public.english_review_queue for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists english_progress_own on public.english_learning_progress;
create policy english_progress_own on public.english_learning_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists english_quiz_own on public.english_quiz_attempts;
create policy english_quiz_own on public.english_quiz_attempts for insert to authenticated with check (auth.uid() = user_id);
create policy english_quiz_read_own on public.english_quiz_attempts for select to authenticated using (auth.uid() = user_id or public.is_student_admin());

grant select on public.english_vocabulary to authenticated;
grant select,insert,update,delete on public.english_review_queue to authenticated;
grant select,insert,update on public.english_learning_progress to authenticated;
grant select,insert on public.english_quiz_attempts to authenticated;

-- Admin feature switches. Compatible with either feature_key or key column.
do $$
declare
  has_feature_key boolean;
  has_key boolean;
  r record;
begin
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='feature_flags' and column_name='feature_key') into has_feature_key;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='feature_flags' and column_name='key') into has_key;

  for r in select * from (values
   ('المراحل الدراسية القديمة','education_stages',false),
   ('الترجمة','english_translation',true),
   ('تعلم المفردات','english_vocabulary',true),
   ('Parts of Speech','english_parts',true),
   ('الأفعال','english_verbs',true),
   ('القواعد والأزمنة','english_grammar',true),
   ('Reading','english_reading',true),
   ('Listening','english_listening',true),
   ('Pronunciation','english_pronunciation',true),
   ('Phrasal Verbs','english_phrasal',true),
   ('Idioms','english_idioms',true),
   ('Spelling','english_spelling',true),
   ('Daily Challenge','english_daily',true)
  ) as x(name,key,enabled)
  loop
    if has_feature_key then
      execute 'insert into public.feature_flags(name, feature_key, enabled) select $1,$2,$3 where not exists (select 1 from public.feature_flags where feature_key=$2)'
        using r.name,r.key,r.enabled;
    elsif has_key then
      execute 'insert into public.feature_flags(name, key, enabled) select $1,$2,$3 where not exists (select 1 from public.feature_flags where key=$2)'
        using r.name,r.key,r.enabled;
    end if;
  end loop;
end $$;

-- Full Oxford 3000/5000 import is intentionally data-driven.
-- Import licensed rows with source='oxford_3000' or source='oxford_5000'; the app can consume them without another APK.
create index if not exists english_vocabulary_level_idx on public.english_vocabulary(level, source_rank);
create index if not exists english_review_due_idx on public.english_review_queue(user_id, next_review_at);

create or replace function public.student_english_remember_word(p_word_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if nullif(trim(p_word_key),'') is null then raise exception 'word_key required'; end if;
  insert into public.english_review_queue(user_id, word_key, next_review_at, interval_days, strength, updated_at)
  values(auth.uid(), lower(trim(p_word_key)), now() + interval '1 day', 1, 0, now())
  on conflict(user_id, word_key) do update
    set next_review_at = least(public.english_review_queue.next_review_at, excluded.next_review_at),
        updated_at = now();
end;
$$;
grant execute on function public.student_english_remember_word(text) to authenticated;
