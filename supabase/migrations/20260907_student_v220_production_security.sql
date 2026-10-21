-- Student v2.2.0 Production security hardening
-- Server-authoritative store operations; clients may not directly mutate payment/order rows.

begin;

-- Direct client writes can carry forged price/diamond values. All writes must go through
-- SECURITY DEFINER RPCs that look up current server-side product/package prices.
do $$
begin
  if to_regclass('public.store_diamond_purchase_requests') is not null then
    execute 'revoke insert, update, delete on table public.store_diamond_purchase_requests from anon, authenticated';
  end if;
  if to_regclass('public.store_orders') is not null then
    execute 'revoke insert, update, delete on table public.store_orders from anon, authenticated';
  end if;
end $$;

-- Restrict the server-authoritative diamond payment RPC to signed-in users only.
do $$
begin
  if to_regprocedure('public.store_submit_diamond_payment(uuid,text,text)') is not null then
    execute 'revoke all on function public.store_submit_diamond_payment(uuid,text,text) from public, anon';
    execute 'grant execute on function public.store_submit_diamond_payment(uuid,text,text) to authenticated';
  end if;
end $$;

-- Runtime update settings must not be writable directly from clients.
do $$
begin
  if to_regclass('public.student_runtime_settings') is not null then
    execute 'revoke insert, update, delete on table public.student_runtime_settings from anon, authenticated';
  end if;
end $$;

-- Audit log is append-only through vetted admin RPCs; clients cannot edit/delete history.
do $$
begin
  if to_regclass('public.student_admin_audit_log_v21') is not null then
    execute 'revoke insert, update, delete on table public.student_admin_audit_log_v21 from anon, authenticated';
  end if;
end $$;

commit;
