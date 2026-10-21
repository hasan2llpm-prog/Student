-- Student Native v1.0.1 pre-release: full admin store control + instant admin request notifications
create extension if not exists pgcrypto;

create or replace function public.student_assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role,'')) = 'admin'
  ) then
    raise exception 'admin_only';
  end if;
end;
$$;

create or replace function public.student_admin_store_product_upsert(
  p_id uuid,
  p_name text,
  p_description text,
  p_product_type text,
  p_price_money numeric,
  p_price_diamonds integer,
  p_allow_money boolean,
  p_allow_diamonds boolean,
  p_is_active boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  perform public.student_assert_admin();
  if trim(coalesce(p_name,'')) = '' then raise exception 'product_name_required'; end if;
  if not coalesce(p_allow_money,false) and not coalesce(p_allow_diamonds,false) then raise exception 'payment_method_required'; end if;
  if p_id is null then
    insert into public.store_products(name,description,product_type,price_money,currency,price_diamonds,allow_money,allow_diamonds,is_active,created_by)
    values(trim(p_name),coalesce(p_description,''),coalesce(nullif(p_product_type,''),'physical'),greatest(coalesce(p_price_money,0),0),'IQD',greatest(coalesce(p_price_diamonds,0),0),coalesce(p_allow_money,true),coalesce(p_allow_diamonds,false),coalesce(p_is_active,true),auth.uid())
    returning id into v_id;
  else
    update public.store_products set
      name=trim(p_name), description=coalesce(p_description,''), product_type=coalesce(nullif(p_product_type,''),'physical'),
      price_money=greatest(coalesce(p_price_money,0),0), currency='IQD', price_diamonds=greatest(coalesce(p_price_diamonds,0),0),
      allow_money=coalesce(p_allow_money,true), allow_diamonds=coalesce(p_allow_diamonds,false), is_active=coalesce(p_is_active,true)
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'product_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.student_admin_store_product_delete(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.student_assert_admin();
  delete from public.store_products where id=p_id;
end; $$;

create or replace function public.student_admin_store_task_upsert(
  p_id uuid, p_title text, p_description text, p_reward_diamonds integer,
  p_repeat_kind text, p_verification_type text, p_is_active boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.student_assert_admin();
  if trim(coalesce(p_title,''))='' then raise exception 'task_title_required'; end if;
  if coalesce(p_reward_diamonds,0) < 1 then raise exception 'reward_invalid'; end if;
  if p_id is null then
    insert into public.store_tasks(title,description,reward_diamonds,repeat_kind,verification_type,is_active,created_by)
    values(trim(p_title),coalesce(p_description,''),p_reward_diamonds,coalesce(nullif(p_repeat_kind,''),'once'),coalesce(nullif(p_verification_type,''),'manual'),coalesce(p_is_active,true),auth.uid())
    returning id into v_id;
  else
    update public.store_tasks set title=trim(p_title),description=coalesce(p_description,''),reward_diamonds=p_reward_diamonds,
      repeat_kind=coalesce(nullif(p_repeat_kind,''),'once'),verification_type=coalesce(nullif(p_verification_type,''),'manual'),is_active=coalesce(p_is_active,true)
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'task_not_found'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.student_admin_store_task_delete(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.student_assert_admin();
  delete from public.store_tasks where id=p_id;
end; $$;

create or replace function public.student_admin_diamond_package_upsert(
  p_id uuid, p_title text, p_diamonds integer, p_user_price_iqd integer,
  p_agent_price_iqd integer, p_is_active boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.student_assert_admin();
  if trim(coalesce(p_title,''))='' then raise exception 'package_title_required'; end if;
  if coalesce(p_diamonds,0)<1 then raise exception 'diamonds_invalid'; end if;
  if p_id is null then
    insert into public.store_diamond_packages(title,diamonds,user_price_iqd,agent_price_iqd,is_active)
    values(trim(p_title),p_diamonds,greatest(coalesce(p_user_price_iqd,0),0),greatest(coalesce(p_agent_price_iqd,0),0),coalesce(p_is_active,true))
    returning id into v_id;
  else
    update public.store_diamond_packages set title=trim(p_title),diamonds=p_diamonds,user_price_iqd=greatest(coalesce(p_user_price_iqd,0),0),
      agent_price_iqd=greatest(coalesce(p_agent_price_iqd,0),0),is_active=coalesce(p_is_active,true)
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'package_not_found'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.student_admin_diamond_package_delete(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.student_assert_admin();
  delete from public.store_diamond_packages where id=p_id;
end; $$;

create or replace function public.student_admin_adjust_diamonds(p_username text, p_delta integer, p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid; v_balance integer;
begin
  perform public.student_assert_admin();
  if coalesce(p_delta,0)=0 then raise exception 'delta_must_not_be_zero'; end if;
  select id into v_user from public.profiles where lower(username)=lower(trim(both '@' from trim(p_username))) limit 1;
  if v_user is null then raise exception 'user_not_found'; end if;
  insert into public.store_user_diamonds(user_id,balance)
  values(v_user,greatest(p_delta,0))
  on conflict(user_id) do update set balance=greatest(0, public.store_user_diamonds.balance + p_delta)
  returning balance into v_balance;

  insert into public.notifications(user_id,actor_id,title,body,kind,link,is_broadcast,is_read,metadata)
  values(v_user,auth.uid(),'تحديث رصيد الألماس',
         case when p_delta>0 then 'أضافت الإدارة '||p_delta||' ألماسة إلى رصيدك.' else 'تم تعديل رصيد الألماس بمقدار '||p_delta||'.' end,
         'diamond_balance','store',false,false,jsonb_build_object('delta',p_delta,'balance',v_balance,'note',coalesce(p_note,'')));
  return jsonb_build_object('user_id',v_user,'balance',v_balance);
end; $$;

grant execute on function public.student_admin_store_product_upsert(uuid,text,text,text,numeric,integer,boolean,boolean,boolean) to authenticated;
grant execute on function public.student_admin_store_product_delete(uuid) to authenticated;
grant execute on function public.student_admin_store_task_upsert(uuid,text,text,integer,text,text,boolean) to authenticated;
grant execute on function public.student_admin_store_task_delete(uuid) to authenticated;
grant execute on function public.student_admin_diamond_package_upsert(uuid,text,integer,integer,integer,boolean) to authenticated;
grant execute on function public.student_admin_diamond_package_delete(uuid) to authenticated;
grant execute on function public.student_admin_adjust_diamonds(text,integer,text) to authenticated;

-- One generic trigger: any new request creates an admin-audience notification.
create or replace function public.student_notify_admin_on_store_request()
returns trigger language plpgsql security definer set search_path=public as $$
declare j jsonb := to_jsonb(new); v_kind text; v_title text; v_body text; v_link text := 'admin/store';
begin
  v_kind := case tg_table_name
    when 'store_orders' then 'store_order'
    when 'store_diamond_purchase_requests' then 'diamond_request'
    when 'store_agency_applications' then 'agency_request'
    when 'store_agent_stock_requests' then 'agent_stock_request'
    else 'admin_request' end;
  v_title := case tg_table_name
    when 'store_orders' then 'طلب متجر جديد'
    when 'store_diamond_purchase_requests' then 'طلب شحن ألماس جديد'
    when 'store_agency_applications' then 'طلب وكالة جديد'
    when 'store_agent_stock_requests' then 'طلب مخزون وكيل جديد'
    else 'طلب جديد' end;
  v_body := case tg_table_name
    when 'store_orders' then coalesce(j->>'product_name','لديك طلب متجر جديد')
    when 'store_diamond_purchase_requests' then coalesce(j->>'diamonds','0')||' ألماسة'
    when 'store_agency_applications' then coalesce(j->>'full_name','مستخدم')||' — '||coalesce(j->>'province','')
    else 'يوجد طلب جديد بانتظار المراجعة' end;

  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(null, nullif(j->>'user_id','')::uuid, v_title, v_body, v_kind, v_link, 'admin', true, false,
         jsonb_build_object('request_id',j->>'id','source_table',tg_table_name,'user_id',j->>'user_id'));
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['store_orders','store_diamond_purchase_requests','store_agency_applications','store_agent_stock_requests'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_student_admin_request_push on public.%I', t);
      execute format('create trigger trg_student_admin_request_push after insert on public.%I for each row execute function public.student_notify_admin_on_store_request()', t);
    end if;
  end loop;
end $$;
