-- Student v2.6.1 — notification retention
-- Keep the notification center lean automatically. Old ordinary notifications expire after 3 days.
-- Active forced-update and critical administrative notices are retained until replaced/cleared explicitly.

create or replace function public.student_cleanup_notifications_v261()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.notifications
  where created_at < now() - interval '3 days'
    and lower(coalesce(kind, '')) not in ('app_update', 'critical_admin');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.student_cleanup_notifications_v261() from public, anon, authenticated;
grant execute on function public.student_cleanup_notifications_v261() to service_role;

-- Supabase supports pg_cron. Run cleanup daily; each row is retained for at most ~3 days.
create extension if not exists pg_cron;

do $$
declare
  j record;
begin
  for j in select jobid from cron.job where jobname = 'student-notification-cleanup-v261' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'student-notification-cleanup-v261',
  '17 3 * * *',
  $cron$select public.student_cleanup_notifications_v261();$cron$
);
