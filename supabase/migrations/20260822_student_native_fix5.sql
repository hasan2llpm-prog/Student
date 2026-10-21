-- Student Native FIX5 incremental backend patch
-- Run AFTER 20260822_student_native_fix4.sql
begin;

-- Native admin can manage the same education catalog that the legacy web app used.
do $$
declare t text; pol text;
begin
  foreach t in array array[
    'education_stages','education_levels','education_subjects','education_level_subjects',
    'education_tracks','education_track_subjects','universities','university_colleges',
    'university_departments','university_levels','university_subjects','university_level_subjects'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('grant select,insert,update,delete on public.%I to authenticated', t);
      pol := 'student_native_fix5_admin_'||t;
      execute format('drop policy if exists %I on public.%I', pol, t);
      execute format('create policy %I on public.%I for all to authenticated using (public.student_native_is_admin()) with check (public.student_native_is_admin())', pol, t);
    end if;
  end loop;
end $$;

-- Image uploads for home advertisements.
insert into storage.buckets(id,name,public)
values('home-ads','home-ads',true)
on conflict(id) do update set public=true;

drop policy if exists student_native_fix5_home_ads_read on storage.objects;
create policy student_native_fix5_home_ads_read on storage.objects
for select to public using (bucket_id='home-ads');

drop policy if exists student_native_fix5_home_ads_insert on storage.objects;
create policy student_native_fix5_home_ads_insert on storage.objects
for insert to authenticated with check (bucket_id='home-ads' and public.student_native_is_admin());

drop policy if exists student_native_fix5_home_ads_update on storage.objects;
create policy student_native_fix5_home_ads_update on storage.objects
for update to authenticated using (bucket_id='home-ads' and public.student_native_is_admin()) with check (bucket_id='home-ads' and public.student_native_is_admin());

drop policy if exists student_native_fix5_home_ads_delete on storage.objects;
create policy student_native_fix5_home_ads_delete on storage.objects
for delete to authenticated using (bucket_id='home-ads' and public.student_native_is_admin());

-- Secure manual diamond payment request: sender name + last four digits only.
create or replace function public.store_submit_diamond_payment(
  p_package_id uuid,
  p_sender_name text,
  p_card_last4 text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  pkg public.store_diamond_packages%rowtype;
  rid uuid;
begin
  if uid is null then raise exception 'يجب تسجيل الدخول أولاً.'; end if;
  if char_length(trim(coalesce(p_sender_name,''))) not between 2 and 80 then raise exception 'اسم صاحب البطاقة غير صحيح.'; end if;
  if coalesce(p_card_last4,'') !~ '^[0-9]{4}$' then raise exception 'آخر 4 أرقام غير صحيحة.'; end if;

  select * into pkg from public.store_diamond_packages where id=p_package_id and is_active=true;
  if not found then raise exception 'الباقة غير متاحة.'; end if;

  insert into public.store_diamond_purchase_requests(user_id,package_id,diamonds,amount_iqd,payment_reference,status)
  values(uid,pkg.id,pkg.diamonds,pkg.user_price_iqd,
         jsonb_build_object('sender',trim(p_sender_name),'last4',p_card_last4)::text,'pending')
  returning id into rid;
  return rid;
end;
$$;
revoke all on function public.store_submit_diamond_payment(uuid,text,text) from public, anon;
grant execute on function public.store_submit_diamond_payment(uuid,text,text) to authenticated;

-- Make chat message events available to Native Realtime if not already published.
do $$
begin
  if to_regclass('public.chat_messages') is not null and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

commit;


-- Seed Learn English from the original Student open learning bank.
-- Idempotent: inserts only words not already present with the same English text.
with seed(title,english_text,arabic_text,category,level,sort_order,is_active) as (
  values
    ('ability','ability','قدرة','مفردات - noun','A2',1,true),
    ('accept','accept','يقبل','مفردات - verb','A2',2,true),
    ('achieve','achieve','يحقق','مفردات - verb','A2',3,true),
    ('action','action','فعل / إجراء','مفردات - noun','A1',4,true),
    ('activity','activity','نشاط','مفردات - noun','A1',5,true),
    ('address','address','عنوان','مفردات - noun','A1',6,true),
    ('advice','advice','نصيحة','مفردات - noun','A2',7,true),
    ('afraid','afraid','خائف','مفردات - adjective','A1',8,true),
    ('agree','agree','يوافق','مفردات - verb','A1',9,true),
    ('air','air','هواء','مفردات - noun','A2',10,true),
    ('always','always','دائمًا','مفردات - adverb','A1',11,true),
    ('answer','answer','إجابة','مفردات - noun','A1',12,true),
    ('appear','appear','يظهر','مفردات - verb','A2',13,true),
    ('arrive','arrive','يصل','مفردات - verb','A1',14,true),
    ('ask','ask','يسأل','مفردات - verb','A1',15,true),
    ('beautiful','beautiful','جميل','مفردات - adjective','A1',16,true),
    ('because','because','لأن','مفردات - conjunction','A1',17,true),
    ('become','become','يصبح','مفردات - verb','A2',18,true),
    ('before','before','قبل','مفردات - preposition','A1',19,true),
    ('begin','begin','يبدأ','مفردات - verb','A1',20,true),
    ('believe','believe','يعتقد','مفردات - verb','A2',21,true),
    ('book','book','كتاب','مفردات - noun','A1',22,true),
    ('bring','bring','يجلب','مفردات - verb','A2',23,true),
    ('build','build','يبني','مفردات - verb','A2',24,true),
    ('business','business','عمل / تجارة','مفردات - noun','A2',25,true),
    ('buy','buy','يشتري','مفردات - verb','A1',26,true),
    ('change','change','يغيّر','مفردات - verb','A1',27,true),
    ('choose','choose','يختار','مفردات - verb','A2',28,true),
    ('class','class','صف','مفردات - noun','A1',29,true),
    ('clean','clean','نظيف','مفردات - adjective','A1',30,true),
    ('close','close','يغلق','مفردات - verb','A1',31,true),
    ('come','come','يأتي','مفردات - verb','A1',32,true),
    ('computer','computer','حاسوب','مفردات - noun','A1',33,true),
    ('continue','continue','يستمر','مفردات - verb','A2',34,true),
    ('country','country','بلد','مفردات - noun','A1',35,true),
    ('create','create','ينشئ','مفردات - verb','A2',36,true),
    ('day','day','يوم','مفردات - noun','A1',37,true),
    ('decide','decide','يقرر','مفردات - verb','A2',38,true),
    ('different','different','مختلف','مفردات - adjective','A1',39,true),
    ('difficult','difficult','صعب','مفردات - adjective','A1',40,true),
    ('education','education','تعليم','مفردات - noun','A2',41,true),
    ('enjoy','enjoy','يستمتع','مفردات - verb','A1',42,true),
    ('example','example','مثال','مفردات - noun','A1',43,true),
    ('experience','experience','خبرة / تجربة','مفردات - noun','A2',44,true),
    ('family','family','عائلة','مفردات - noun','A1',45,true),
    ('feel','feel','يشعر','مفردات - verb','A1',46,true),
    ('find','find','يجد','مفردات - verb','A1',47,true),
    ('finish','finish','ينهي','مفردات - verb','A1',48,true),
    ('friend','friend','صديق','مفردات - noun','A1',49,true),
    ('future','future','مستقبل','مفردات - noun','A2',50,true),
    ('give','give','يعطي','مفردات - verb','A1',51,true),
    ('good','good','جيد','مفردات - adjective','A1',52,true),
    ('great','great','عظيم / رائع','مفردات - adjective','A1',53,true),
    ('happy','happy','سعيد','مفردات - adjective','A1',54,true),
    ('have','have','يمتلك / لديه','مفردات - verb','A1',55,true),
    ('help','help','يساعد','مفردات - verb','A1',56,true),
    ('important','important','مهم','مفردات - adjective','A1',57,true),
    ('improve','improve','يحسّن','مفردات - verb','A2',58,true),
    ('information','information','معلومات','مفردات - noun','A1',59,true),
    ('interesting','interesting','ممتع / مثير للاهتمام','مفردات - adjective','A1',60,true),
    ('know','know','يعرف','مفردات - verb','A1',61,true),
    ('language','language','لغة','مفردات - noun','A1',62,true),
    ('learn','learn','يتعلم','مفردات - verb','A1',63,true),
    ('leave','leave','يغادر','مفردات - verb','A1',64,true),
    ('lesson','lesson','درس','مفردات - noun','A1',65,true),
    ('listen','listen','يستمع','مفردات - verb','A1',66,true),
    ('live','live','يعيش','مفردات - verb','A1',67,true),
    ('look','look','ينظر','مفردات - verb','A1',68,true),
    ('make','make','يصنع','مفردات - verb','A1',69,true),
    ('mean','mean','يعني','مفردات - verb','A2',70,true),
    ('message','message','رسالة','مفردات - noun','A2',71,true),
    ('money','money','مال','مفردات - noun','A1',72,true),
    ('need','need','يحتاج','مفردات - verb','A1',73,true),
    ('new','new','جديد','مفردات - adjective','A1',74,true),
    ('next','next','التالي','مفردات - adjective','A1',75,true),
    ('number','number','رقم','مفردات - noun','A1',76,true),
    ('open','open','يفتح','مفردات - verb','A1',77,true),
    ('people','people','الناس','مفردات - noun','A1',78,true),
    ('place','place','مكان','مفردات - noun','A1',79,true),
    ('practice','practice','تدريب / ممارسة','مفردات - noun','A2',80,true),
    ('problem','problem','مشكلة','مفردات - noun','A1',81,true),
    ('question','question','سؤال','مفردات - noun','A1',82,true),
    ('read','read','يقرأ','مفردات - verb','A1',83,true),
    ('remember','remember','يتذكر','مفردات - verb','A1',84,true),
    ('right','right','صحيح / يمين','مفردات - adjective','A1',85,true),
    ('school','school','مدرسة','مفردات - noun','A1',86,true),
    ('speak','speak','يتحدث','مفردات - verb','A1',87,true),
    ('student','student','طالب','مفردات - noun','A1',88,true),
    ('study','study','يدرس','مفردات - verb','A1',89,true),
    ('success','success','نجاح','مفردات - noun','A2',90,true),
    ('teacher','teacher','مدرس','مفردات - noun','A1',91,true),
    ('think','think','يفكر','مفردات - verb','A1',92,true),
    ('time','time','وقت','مفردات - noun','A1',93,true),
    ('today','today','اليوم','مفردات - adverb','A1',94,true),
    ('translate','translate','يترجم','مفردات - verb','A2',95,true),
    ('understand','understand','يفهم','مفردات - verb','A1',96,true),
    ('university','university','جامعة','مفردات - noun','A2',97,true),
    ('use','use','يستخدم','مفردات - verb','A1',98,true),
    ('want','want','يريد','مفردات - verb','A1',99,true),
    ('word','word','كلمة','مفردات - noun','A1',100,true),
    ('work','work','عمل','مفردات - noun','A1',101,true),
    ('write','write','يكتب','مفردات - verb','A1',102,true),
    ('accurate','accurate','دقيق','مفردات - adjective','B1',103,true),
    ('achievement','achievement','إنجاز','مفردات - noun','B1',104,true),
    ('advantage','advantage','ميزة','مفردات - noun','A2',105,true),
    ('affect','affect','يؤثر','مفردات - verb','B1',106,true),
    ('allow','allow','يسمح','مفردات - verb','A2',107,true),
    ('although','although','على الرغم من','مفردات - conjunction','A2',108,true),
    ('amount','amount','كمية','مفردات - noun','B1',109,true),
    ('analyze','analyze','يحلل','مفردات - verb','B1',110,true),
    ('announce','announce','يعلن','مفردات - verb','B1',111,true),
    ('avoid','avoid','يتجنب','مفردات - verb','B1',112,true),
    ('behavior','behavior','سلوك','مفردات - noun','B1',113,true),
    ('benefit','benefit','فائدة','مفردات - noun','B1',114,true),
    ('challenge','challenge','تحدٍ','مفردات - noun','B1',115,true),
    ('communicate','communicate','يتواصل','مفردات - verb','B1',116,true),
    ('compare','compare','يقارن','مفردات - verb','B1',117,true),
    ('complete','complete','يكمل','مفردات - verb','A2',118,true),
    ('condition','condition','حالة / شرط','مفردات - noun','B1',119,true),
    ('consider','consider','يعتبر / يفكر في','مفردات - verb','B1',120,true),
    ('develop','develop','يطوّر','مفردات - verb','A2',121,true),
    ('environment','environment','بيئة','مفردات - noun','A2',122,true),
    ('explain','explain','يشرح','مفردات - verb','A2',123,true),
    ('focus','focus','يركز','مفردات - verb','B1',124,true),
    ('knowledge','knowledge','معرفة','مفردات - noun','B1',125,true),
    ('method','method','طريقة','مفردات - noun','B1',126,true),
    ('opportunity','opportunity','فرصة','مفردات - noun','B1',127,true),
    ('prepare','prepare','يستعد / يجهز','مفردات - verb','A2',128,true),
    ('progress','progress','تقدم','مفردات - noun','B1',129,true),
    ('require','require','يتطلب','مفردات - verb','B1',130,true),
    ('result','result','نتيجة','مفردات - noun','A2',131,true),
    ('skill','skill','مهارة','مفردات - noun','A2',132,true),
    ('solution','solution','حل','مفردات - noun','B1',133,true),
    ('specific','specific','محدد','مفردات - adjective','B1',134,true),
    ('support','support','دعم','مفردات - noun','B1',135,true),
    ('technology','technology','تكنولوجيا','مفردات - noun','A2',136,true),
    ('available','available','متاح','مفردات - adjective','A2',137,true),
    ('communicate','communicate','يتواصل','مفردات - verb','B1',138,true),
    ('confident','confident','واثق','مفردات - adjective','B1',139,true),
    ('effective','effective','فعّال','مفردات - adjective','B1',140,true),
    ('essential','essential','أساسي','مفردات - adjective','B1',141,true),
    ('evaluate','evaluate','يقيّم','مفردات - verb','B2',142,true),
    ('evidence','evidence','دليل','مفردات - noun','B1',143,true),
    ('independent','independent','مستقل','مفردات - adjective','B1',144,true),
    ('influence','influence','تأثير','مفردات - noun','B1',145,true),
    ('maintain','maintain','يحافظ على','مفردات - verb','B2',146,true),
    ('participate','participate','يشارك','مفردات - verb','B1',147,true),
    ('perspective','perspective','وجهة نظر','مفردات - noun','B2',148,true),
    ('relevant','relevant','ذو صلة','مفردات - adjective','B2',149,true),
    ('significant','significant','مهم / ملحوظ','مفردات - adjective','B2',150,true),
    ('approach','approach','نهج / أسلوب','مفردات - noun','B2',151,true),
    ('assume','assume','يفترض','مفردات - verb','B2',152,true),
    ('complex','complex','معقد','مفردات - adjective','B2',153,true),
    ('consequence','consequence','نتيجة / عاقبة','مفردات - noun','B2',154,true),
    ('demonstrate','demonstrate','يوضح / يبرهن','مفردات - verb','B2',155,true),
    ('establish','establish','يؤسس','مفردات - verb','B2',156,true),
    ('interpret','interpret','يفسر','مفردات - verb','B2',157,true),
    ('justify','justify','يبرر','مفردات - verb','B2',158,true),
    ('reliable','reliable','موثوق','مفردات - adjective','B2',159,true),
    ('strategy','strategy','استراتيجية','مفردات - noun','B2',160,true),
    ('coherent','coherent','مترابط','مفردات - adjective','C1',161,true),
    ('compelling','compelling','مقنع','مفردات - adjective','C1',162,true),
    ('convey','convey','ينقل / يعبّر','مفردات - verb','C1',163,true),
    ('crucial','crucial','حاسم','مفردات - adjective','C1',164,true),
    ('derive','derive','يستمد','مفردات - verb','C1',165,true),
    ('elaborate','elaborate','يفصل / مفصل','مفردات - verb','C1',166,true),
    ('enhance','enhance','يعزز','مفردات - verb','C1',167,true),
    ('explicit','explicit','صريح / واضح','مفردات - adjective','C1',168,true),
    ('fundamental','fundamental','جوهري','مفردات - adjective','C1',169,true),
    ('insight','insight','رؤية عميقة','مفردات - noun','C1',170,true),
    ('nuance','nuance','دقة / فرق بسيط','مفردات - noun','C1',171,true),
    ('plausible','plausible','معقول / محتمل','مفردات - adjective','C1',172,true),
    ('profound','profound','عميق','مفردات - adjective','C1',173,true),
    ('substantial','substantial','كبير / جوهري','مفردات - adjective','C1',174,true),
    ('sustain','sustain','يحافظ على / يدعم','مفردات - verb','C1',175,true)
)
insert into public.learn_english_content(title,english_text,arabic_text,category,level,sort_order,is_active)
select s.title,s.english_text,s.arabic_text,s.category,s.level,s.sort_order,s.is_active
from seed s
where not exists (
  select 1 from public.learn_english_content e
  where lower(trim(e.english_text)) = lower(trim(s.english_text))
);
