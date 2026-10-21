-- Student v2.10.0 — unified learning progress + 20-word vocabulary batches
begin;

-- Allow every learning section to use the same progress engine.
do $$
declare r record;
begin
  if to_regclass('public.student_learning_progress_v24') is not null then
    for r in
      select conname
      from pg_constraint
      where conrelid='public.student_learning_progress_v24'::regclass
        and contype='c'
        and pg_get_constraintdef(oid) ilike '%section_key%'
    loop
      execute format('alter table public.student_learning_progress_v24 drop constraint if exists %I', r.conname);
    end loop;
  end if;
end $$;

create table if not exists public.student_learning_catalog_v210(
  section_key text primary key,
  label text not null,
  total_units integer not null check(total_units > 0),
  items_per_unit integer not null default 1 check(items_per_unit > 0),
  total_items integer not null default 0 check(total_items >= 0),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.student_learning_catalog_v210(section_key,label,total_units,items_per_unit,total_items,sort_order)
values
 ('vocabulary','المفردات',250,20,5000,10),
 ('grammar','القواعد',100,3,300,20),
 ('reading','القراءة',250,1,250,30),
 ('listening','الاستماع',250,1,250,40),
 ('writing','الكتابة',250,1,250,50),
 ('speaking','المحادثة',250,1,250,60),
 ('verbs','الأفعال',12,10,120,70),
 ('parts','Parts of Speech',12,1,12,80),
 ('pronunciation','النطق',4,5,20,90),
 ('phrasal','Phrasal Verbs',5,5,25,100),
 ('idioms','Idioms',5,5,25,110),
 ('spelling','Spelling',5000,1,5000,120)
on conflict(section_key) do update set
  label=excluded.label,
  total_units=excluded.total_units,
  items_per_unit=excluded.items_per_unit,
  total_items=excluded.total_items,
  sort_order=excluded.sort_order,
  updated_at=now();

alter table public.student_learning_catalog_v210 enable row level security;
drop policy if exists student_learning_catalog_read_v210 on public.student_learning_catalog_v210;
create policy student_learning_catalog_read_v210 on public.student_learning_catalog_v210
for select to authenticated using(enabled=true or public.current_user_is_admin());

grant select on public.student_learning_catalog_v210 to authenticated;

create or replace function public.student_learning_progress_get_v210(p_section_key text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.student_learning_progress_v24%rowtype;
  c public.student_learning_catalog_v210%rowtype;
  completed_units integer;
  completed_items integer;
  pct numeric;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into c from public.student_learning_catalog_v210 where section_key=p_section_key and enabled=true;
  if not found then raise exception 'invalid_section'; end if;

  insert into public.student_learning_progress_v24(user_id,section_key)
  values(auth.uid(),p_section_key)
  on conflict(user_id,section_key) do nothing;

  select * into r from public.student_learning_progress_v24
   where user_id=auth.uid() and section_key=p_section_key;

  -- Compatibility migration: old v2.9.x could leave a completed slot waiting for 08:00.
  -- v2.10.0 makes the next unit available immediately.
  if r.completed_at is not null then
    update public.student_learning_progress_v24
       set sequence_index=least(sequence_index+1,c.total_units),
           completed_at=null,
           available_after=null,
           updated_at=now()
     where user_id=auth.uid() and section_key=p_section_key
     returning * into r;
  end if;

  completed_units:=least(r.sequence_index,c.total_units);
  completed_items:=case when c.total_items>0 then least(completed_units*c.items_per_unit,c.total_items) else completed_units end;
  pct:=case
    when c.total_items>0 then round((completed_items::numeric/c.total_items::numeric)*100,2)
    else round((completed_units::numeric/c.total_units::numeric)*100,2)
  end;

  return jsonb_build_object(
    'section_key',r.section_key,
    'sequence_index',least(r.sequence_index,greatest(c.total_units-1,0)),
    'completed_for_current_slot',false,
    'available_after',null,
    'completed_units',completed_units,
    'total_units',c.total_units,
    'completed_items',completed_items,
    'total_items',c.total_items,
    'progress_percent',least(pct,100)
  );
end $$;

create or replace function public.student_learning_progress_complete_v210(p_section_key text,p_expected_sequence integer)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.student_learning_progress_v24%rowtype;
  c public.student_learning_catalog_v210%rowtype;
  completed_units integer;
  completed_items integer;
  pct numeric;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into c from public.student_learning_catalog_v210 where section_key=p_section_key and enabled=true;
  if not found then raise exception 'invalid_section'; end if;

  perform public.student_learning_progress_get_v210(p_section_key);
  select * into r from public.student_learning_progress_v24
   where user_id=auth.uid() and section_key=p_section_key for update;

  if r.sequence_index<>p_expected_sequence then raise exception 'progress_out_of_date'; end if;
  if r.sequence_index < c.total_units then
    update public.student_learning_progress_v24
       set sequence_index=least(sequence_index+1,c.total_units),
           completed_at=null,
           available_after=null,
           updated_at=now()
     where user_id=auth.uid() and section_key=p_section_key
     returning * into r;
  end if;

  completed_units:=least(r.sequence_index,c.total_units);
  completed_items:=case when c.total_items>0 then least(completed_units*c.items_per_unit,c.total_items) else completed_units end;
  pct:=case
    when c.total_items>0 then round((completed_items::numeric/c.total_items::numeric)*100,2)
    else round((completed_units::numeric/c.total_units::numeric)*100,2)
  end;

  return jsonb_build_object(
    'section_key',r.section_key,
    'sequence_index',least(r.sequence_index,greatest(c.total_units-1,0)),
    'completed_for_current_slot',false,
    'available_after',null,
    'completed_units',completed_units,
    'total_units',c.total_units,
    'completed_items',completed_items,
    'total_items',c.total_items,
    'progress_percent',least(pct,100)
  );
end $$;

revoke all on function public.student_learning_progress_get_v210(text) from public,anon;
revoke all on function public.student_learning_progress_complete_v210(text,integer) from public,anon;
grant execute on function public.student_learning_progress_get_v210(text) to authenticated;
grant execute on function public.student_learning_progress_complete_v210(text,integer) to authenticated;

-- New 20-word assignments. Old v272 15-word assignments stay untouched for old clients.
create table if not exists public.student_vocabulary_assignment_v210(
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_index integer not null check(sequence_index >= 0),
  position smallint not null check(position between 0 and 19),
  vocabulary_id uuid not null references public.english_vocabulary(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(user_id,sequence_index,position),
  unique(user_id,sequence_index,vocabulary_id)
);
create index if not exists student_vocabulary_assignment_v210_word_idx
  on public.student_vocabulary_assignment_v210(vocabulary_id);
alter table public.student_vocabulary_assignment_v210 enable row level security;
revoke all on public.student_vocabulary_assignment_v210 from anon,authenticated;
grant select,insert,update,delete on public.student_vocabulary_assignment_v210 to service_role;

create or replace function public.student_vocabulary_batch_v210(p_expected_sequence integer)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  seq integer;
  total integer;
  assigned integer;
  start_idx integer;
  result jsonb;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_expected_sequence is null or p_expected_sequence < 0 then raise exception 'invalid_sequence'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(uid::text), p_expected_sequence + 210000);
  perform public.student_learning_progress_get_v210('vocabulary');
  select least(p.sequence_index,greatest(c.total_units-1,0)) into seq
    from public.student_learning_progress_v24 p
    join public.student_learning_catalog_v210 c on c.section_key=p.section_key
   where p.user_id=uid and p.section_key='vocabulary';
  if seq is distinct from p_expected_sequence then raise exception 'progress_out_of_date'; end if;

  select pg_catalog.count(*)::integer into assigned
    from public.student_vocabulary_assignment_v210
   where user_id=uid and sequence_index=seq;

  if assigned <> 20 then
    delete from public.student_vocabulary_assignment_v210 where user_id=uid and sequence_index=seq;
    select pg_catalog.count(*)::integer into total from public.english_vocabulary where is_active=true;
    if total < 20 then raise exception 'insufficient_vocabulary'; end if;
    start_idx := pg_catalog.mod(seq * 20, total);

    with ordered as (
      select ev.id,
             pg_catalog.row_number() over(order by pg_catalog.md5(uid::text || ':' || ev.id::text), ev.id)-1 as rn
        from public.english_vocabulary ev where ev.is_active=true
    ), ranked as (
      select id, pg_catalog.mod((rn::integer-start_idx+total),total) as distance from ordered
    ), picked as (
      select id,(pg_catalog.row_number() over(order by distance,id)-1)::smallint as position
        from ranked order by distance,id limit 20
    )
    insert into public.student_vocabulary_assignment_v210(user_id,sequence_index,position,vocabulary_id)
    select uid,seq,p.position,p.id from picked p on conflict do nothing;
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',ev.id,'word',ev.word,'meaning_ar',ev.meaning_ar,'level',ev.level,
      'example_en',ev.example_en,'example_ar',ev.example_ar,'source',ev.source,
      'source_rank',ev.source_rank,'part_of_speech',ev.part_of_speech,'category',ev.category
    ) order by a.position),'[]'::jsonb)
    into result
    from public.student_vocabulary_assignment_v210 a
    join public.english_vocabulary ev on ev.id=a.vocabulary_id
   where a.user_id=uid and a.sequence_index=seq;
  return result;
end $$;
revoke all on function public.student_vocabulary_batch_v210(integer) from public,anon;
grant execute on function public.student_vocabulary_batch_v210(integer) to authenticated;

-- Sequence-driven verbs for immediate next-content navigation.
create or replace function public.student_english_verbs_batch_v210(p_expected_sequence integer,p_limit integer default 10)
returns table(id uuid,base_form text,past_form text,participle text,meaning_ar text,example_en text,example_ar text,irregular boolean,level text)
language sql
stable
security definer
set search_path=public
as $$
  with ranked as (
    select v.*, row_number() over(order by v.sort_order,v.id)-1 as rn, count(*) over() as cnt
      from public.student_english_verb_bank_v20 v where v.is_active=true
  ), params as (
    select greatest(1,least(coalesce(p_limit,10),20)) as lim,
           greatest(0,coalesce(p_expected_sequence,0)) as seq,
           coalesce(max(cnt),0)::integer as cnt from ranked
  ), wanted as (
    select gs as ord, case when p.cnt=0 then -1 else mod((p.seq*p.lim)+gs,p.cnt) end as rn
      from params p cross join lateral generate_series(0,p.lim-1) gs
  )
  select r.id,r.base_form,r.past_form,r.participle,r.meaning_ar,''::text,''::text,r.irregular,r.level
    from wanted w join ranked r on r.rn=w.rn order by w.ord;
$$;
revoke all on function public.student_english_verbs_batch_v210(integer,integer) from public,anon;
grant execute on function public.student_english_verbs_batch_v210(integer,integer) to authenticated;

commit;
