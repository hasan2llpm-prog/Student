-- Student vocabulary reminders v22: five words per day.
-- Baghdad slots: 08:00, 11:00, 14:00, 17:00, 20:00.
-- Supabase/FCM remains the single scheduler; Android does not need a new build.

alter table if exists public.english_vocabulary
  add column if not exists pronunciation_hint text;

create or replace function public.student_send_vocabulary_reminder_v21(p_slot text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  baghdad_now timestamp := now() at time zone 'Asia/Baghdad';
  learning_date date := (baghdad_now - interval '8 hours')::date;
  slot_no integer := case p_slot
    when '08' then 0
    when '11' then 1
    when '14' then 2
    when '17' then 3
    when '20' then 4
    else 0
  end;
  inserted_count integer := 0;
begin
  if to_regclass('public.notifications') is null or to_regclass('public.english_vocabulary') is null then
    return 0;
  end if;
  with ranked as (
    select
      v.id,
      v.word,
      v.meaning_ar,
      coalesce(v.pronunciation_hint, '') as pronunciation_hint,
      coalesce(v.example_en, '') as example_en,
      row_number() over (order by coalesce(v.source_rank, 2147483647), v.word, v.id)::bigint - 1 as rn,
      count(*) over ()::bigint as total
    from public.english_vocabulary v
    where v.is_active = true
  ), chosen as (
    select
      p.id as user_id,
      r.word,
      r.meaning_ar,
      r.pronunciation_hint,
      r.example_en
    from public.profiles p
    left join public.student_notification_preferences pref on pref.user_id = p.id
    cross join lateral (
      select ranked.*
      from ranked
      where ranked.rn = mod(
        mod(abs(hashtextextended(p.id::text || ':' || learning_date::text, 0)), ranked.total) + slot_no,
        ranked.total
      )
      limit 1
    ) r
    where coalesce(pref.daily_learning_reminder, true) = true
      and p.account_status is distinct from 'blocked'
  )
  insert into public.notifications(
    user_id, actor_id, title, body, kind, link, audience, is_broadcast, is_read, metadata
  )
  select
    c.user_id,
    null,
    'كلمة Student الجديدة',
    left(
      c.word || ' — ' || c.meaning_ar ||
      case when nullif(c.pronunciation_hint, '') is not null
        then ' | النطق: ' || c.pronunciation_hint
        else ' | اضغط لفتح النطق'
      end,
      500
    ),
    'daily_vocabulary',
    'english/vocabulary',
    'all',
    false,
    false,
    jsonb_build_object(
      'word', c.word,
      'meaning_ar', c.meaning_ar,
      'pronunciation_hint', c.pronunciation_hint,
      'example_en', c.example_en,
      'learning_date', learning_date::text,
      'slot', p_slot,
      'source', 'english_vocabulary'
    )
  from chosen c
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = c.user_id
      and n.kind = 'daily_vocabulary'
      and n.metadata->>'learning_date' = learning_date::text
      and n.metadata->>'slot' = p_slot
  );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.student_send_vocabulary_reminder_v21(text) from public, anon, authenticated;

do $$
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception when others then
    null;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin perform cron.unschedule('student-vocabulary-0800-v21'); exception when others then null; end;
    begin perform cron.unschedule('student-vocabulary-1100-v21'); exception when others then null; end;
    begin perform cron.unschedule('student-vocabulary-1400-v21'); exception when others then null; end;
    begin perform cron.unschedule('student-vocabulary-1700-v21'); exception when others then null; end;
    begin perform cron.unschedule('student-vocabulary-2000-v21'); exception when others then null; end;
    begin perform cron.unschedule('student-vocabulary-cleanup-v21'); exception when others then null; end;

    perform cron.schedule('student-vocabulary-0800-v21', '0 5 * * *', $cron$select public.student_send_vocabulary_reminder_v21('08');$cron$);
    perform cron.schedule('student-vocabulary-1100-v21', '0 8 * * *', $cron$select public.student_send_vocabulary_reminder_v21('11');$cron$);
    perform cron.schedule('student-vocabulary-1400-v21', '0 11 * * *', $cron$select public.student_send_vocabulary_reminder_v21('14');$cron$);
    perform cron.schedule('student-vocabulary-1700-v21', '0 14 * * *', $cron$select public.student_send_vocabulary_reminder_v21('17');$cron$);
    perform cron.schedule('student-vocabulary-2000-v21', '0 17 * * *', $cron$select public.student_send_vocabulary_reminder_v21('20');$cron$);
    perform cron.schedule('student-vocabulary-cleanup-v21', '30 2 * * *', $cron$delete from public.notifications where kind = 'daily_vocabulary' and created_at < now() - interval '45 days';$cron$);
  end if;
end;
$$;
