-- Student Native FIX6: never create a notification for an action performed by the same user.
-- This fixes self-notifications at the database source, including native FCM while the app is closed.
create or replace function public.student_skip_self_notification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.actor_id is not null and new.user_id is not null and new.actor_id = new.user_id then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_student_skip_self_notification on public.notifications;
create trigger trg_student_skip_self_notification
before insert on public.notifications
for each row
execute function public.student_skip_self_notification();
