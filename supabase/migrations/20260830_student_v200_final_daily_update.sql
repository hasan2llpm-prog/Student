-- Student v2.0.0 FINAL — Daily learning + update foundation
-- Safe additive migration. Run once after the v2.0.0 build succeeds.
-- Baghdad learning day changes at 08:00 Asia/Baghdad.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) User activity heartbeat (used to stop reminder repeats)
-- ------------------------------------------------------------
alter table if exists public.profiles add column if not exists last_active_at timestamptz;
create index if not exists idx_profiles_last_active_v20 on public.profiles(last_active_at);

create or replace function public.student_mark_active_v20()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.profiles set last_active_at=now() where id=auth.uid();
end $$;
revoke all on function public.student_mark_active_v20() from public, anon;
grant execute on function public.student_mark_active_v20() to authenticated;

-- ------------------------------------------------------------
-- 2) Server-managed daily grammar and verbs
-- ------------------------------------------------------------
create table if not exists public.student_english_grammar_bank_v20(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  explanation_ar text not null,
  example_en text not null default '',
  example_ar text not null default '',
  level text not null default 'A1',
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(title)
);

create table if not exists public.student_english_verb_bank_v20(
  id uuid primary key default gen_random_uuid(),
  base_form text not null,
  past_form text not null,
  participle text not null,
  meaning_ar text not null,
  irregular boolean not null default false,
  level text not null default 'A1',
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(base_form)
);

alter table public.student_english_grammar_bank_v20 enable row level security;
alter table public.student_english_verb_bank_v20 enable row level security;

drop policy if exists student_grammar_bank_read_v20 on public.student_english_grammar_bank_v20;
create policy student_grammar_bank_read_v20 on public.student_english_grammar_bank_v20
for select to authenticated using(is_active=true or public.current_user_is_admin());

drop policy if exists student_verb_bank_read_v20 on public.student_english_verb_bank_v20;
create policy student_verb_bank_read_v20 on public.student_english_verb_bank_v20
for select to authenticated using(is_active=true or public.current_user_is_admin());

drop policy if exists student_grammar_bank_admin_v20 on public.student_english_grammar_bank_v20;
create policy student_grammar_bank_admin_v20 on public.student_english_grammar_bank_v20
for all to authenticated using(public.current_user_is_admin()) with check(public.current_user_is_admin());

drop policy if exists student_verb_bank_admin_v20 on public.student_english_verb_bank_v20;
create policy student_verb_bank_admin_v20 on public.student_english_verb_bank_v20
for all to authenticated using(public.current_user_is_admin()) with check(public.current_user_is_admin());

grant select,insert,update,delete on public.student_english_grammar_bank_v20 to authenticated;
grant select,insert,update,delete on public.student_english_verb_bank_v20 to authenticated;

insert into public.student_english_grammar_bank_v20(title,explanation_ar,example_en,example_ar,level,sort_order)
values
  ('Present Simple','نستخدم المضارع البسيط للعادات والحقائق والأشياء المتكررة. مع he / she / it نضيف s أو es للفعل.','She studies English every day.','هي تدرس الإنجليزية كل يوم.','A1',1),
  ('Present Continuous','نستخدمه لحدث يحدث الآن أو حول الوقت الحالي: am / is / are + verb-ing.','They are studying now.','هم يدرسون الآن.','A1',2),
  ('Past Simple','نستخدم الماضي البسيط لحدث انتهى في وقت محدد في الماضي. نستخدم التصريف الثاني للفعل.','We visited Baghdad yesterday.','زرنا بغداد أمس.','A1',3),
  ('Past Continuous','نستخدمه لوصف حدث كان مستمراً في وقت معين في الماضي: was / were + verb-ing.','I was reading at eight o''clock.','كنت أقرأ الساعة الثامنة.','A2',4),
  ('Present Perfect','نستخدمه لخبرة أو نتيجة مرتبطة بالحاضر: have / has + past participle.','I have finished my homework.','لقد أنهيت واجبي.','A2',5),
  ('Present Perfect Continuous','نستخدمه لحدث بدأ في الماضي وما زال مستمراً أو أثره واضح: have / has been + verb-ing.','She has been studying for two hours.','هي تدرس منذ ساعتين.','B1',6),
  ('Past Perfect','نستخدمه لحدث وقع قبل حدث آخر في الماضي: had + past participle.','They had left before I arrived.','كانوا قد غادروا قبل أن أصل.','B1',7),
  ('Future with Will','نستخدم will للتوقعات والقرارات اللحظية والوعود: will + base verb.','I will call you later.','سأتصل بك لاحقاً.','A1',8),
  ('Be Going To','نستخدم be going to للخطط المسبقة أو التوقع المبني على دليل.','We are going to travel next week.','سنُسافر الأسبوع القادم.','A1',9),
  ('Future Continuous','نستخدمه لحدث سيكون مستمراً في وقت معين في المستقبل: will be + verb-ing.','This time tomorrow, I will be studying.','في مثل هذا الوقت غداً سأكون أدرس.','B1',10),
  ('First Conditional','للاحتمالات الحقيقية في المستقبل: If + present simple, will + base verb.','If you study, you will pass.','إذا درست فسوف تنجح.','A2',11),
  ('Second Conditional','للمواقف الافتراضية أو غير المحتملة: If + past simple, would + base verb.','If I had more time, I would read more.','لو كان لدي وقت أكثر لقرأت أكثر.','B1',12),
  ('Third Conditional','للتحدث عن ماضٍ لم يحدث ونتيجته الافتراضية: If + had + pp, would have + pp.','If I had studied, I would have passed.','لو كنت قد درست لنجحت.','B2',13),
  ('Zero Conditional','للحقائق العامة: If + present simple, present simple.','If you heat water, it boils.','إذا سخنت الماء فإنه يغلي.','A2',14),
  ('Can and Could','can للقدرة أو الطلب الحالي، وcould للقدرة الماضية أو الطلب الأكثر تهذيباً.','Could you help me, please?','هل يمكنك مساعدتي من فضلك؟','A1',15),
  ('Must and Have To','نستخدم must وhave to للضرورة، لكن have to شائع للالتزام الخارجي.','I have to attend the class.','يجب أن أحضر الدرس.','A2',16),
  ('Should','نستخدم should للنصيحة والتوصية.','You should practise every day.','ينبغي أن تتدرب كل يوم.','A1',17),
  ('May and Might','نستخدم may وmight للتعبير عن الاحتمال، وغالباً might أقل يقيناً.','It might rain this evening.','قد تمطر هذا المساء.','A2',18),
  ('Articles: A / An / The','نستخدم a/an مع اسم مفرد غير محدد، وthe عندما يكون الشيء محدداً أو معروفاً.','I saw a book on the table.','رأيت كتاباً على الطاولة.','A1',19),
  ('Countable and Uncountable Nouns','الأسماء المعدودة تقبل أرقاماً وmany، وغير المعدودة تستخدم غالباً much أو some.','We need some information.','نحتاج إلى بعض المعلومات.','A2',20),
  ('Some and Any','some شائعة في الجمل المثبتة، وany في النفي والأسئلة، مع وجود استثناءات في العروض والطلبات.','Do you have any questions?','هل لديك أي أسئلة؟','A1',21),
  ('Much, Many and A Lot Of','many مع المعدود، much مع غير المعدود، وa lot of مع الاثنين في الاستعمال اليومي.','She has many books.','لديها كتب كثيرة.','A1',22),
  ('Comparatives','نستخدم صيغة المقارنة للمقارنة بين شيئين: -er أو more + adjective.','This lesson is easier than the last one.','هذا الدرس أسهل من السابق.','A1',23),
  ('Superlatives','نستخدم صيغة التفضيل للمقارنة ضمن مجموعة: the + -est أو the most.','This is the most useful example.','هذا هو المثال الأكثر فائدة.','A1',24),
  ('Adverbs of Frequency','always, usually, often, sometimes, rarely, never تصف تكرار الفعل وغالباً تأتي قبل الفعل الرئيسي.','I usually study in the morning.','عادةً أدرس في الصباح.','A1',25),
  ('There Is / There Are','نستخدم there is للمفرد وthere are للجمع للإخبار عن وجود شيء.','There are three books on the desk.','هناك ثلاثة كتب على المكتب.','A1',26),
  ('Question Forms','في كثير من أسئلة المضارع والماضي نستخدم do / does / did قبل الفاعل.','Where do you study?','أين تدرس؟','A1',27),
  ('Wh- Questions','كلمات مثل what, where, when, why, who, how تحدد نوع المعلومة المطلوبة.','Why are you learning English?','لماذا تتعلم الإنجليزية؟','A1',28),
  ('Gerunds','يمكن أن يأتي الفعل بصيغة -ing كاسم بعد أفعال وحروف جر معينة.','I enjoy reading English stories.','أستمتع بقراءة القصص الإنجليزية.','B1',29),
  ('Infinitives','يأتي to + base verb بعد أفعال وصفات كثيرة للتعبير عن هدف أو فعل تالٍ.','I want to improve my English.','أريد تحسين لغتي الإنجليزية.','A2',30),
  ('Passive Voice','نستخدم المبني للمجهول عندما يكون الفعل أو النتيجة أهم من الفاعل: be + past participle.','English is spoken in many countries.','تُتحدث الإنجليزية في دول كثيرة.','B1',31),
  ('Reported Speech','عند نقل كلام شخص غالباً تتغير الأزمنة والضمائر والظروف حسب السياق.','She said that she was tired.','قالت إنها كانت متعبة.','B1',32),
  ('Relative Clauses','who للأشخاص وwhich للأشياء وthat لكليهما غالباً لربط الاسم بمعلومة إضافية.','The student who answered is my friend.','الطالب الذي أجاب هو صديقي.','B1',33),
  ('Used To','نستخدم used to لعادات أو حالات كانت موجودة في الماضي ولم تعد كذلك الآن.','I used to play football every day.','كنت ألعب كرة القدم كل يوم.','A2',34),
  ('Too and Enough','too تعني أكثر من اللازم، وenough تعني بالقدر الكافي.','The bag is too heavy to carry.','الحقيبة ثقيلة جداً بحيث لا يمكن حملها.','A2',35),
  ('So and Such','so يأتي غالباً قبل الصفة أو الظرف، وsuch قبل تركيب الاسم.','It was such an interesting lesson.','كان درساً ممتعاً جداً.','B1',36),
  ('Although / Even Though','تربطان فكرتين متعارضتين داخل الجملة.','Although it was difficult, she continued.','مع أنه كان صعباً، واصلت.','B1',37),
  ('Because / Because Of','because يتبعها جملة، بينما because of يتبعها اسم أو عبارة اسمية.','We stayed home because it was raining.','بقينا في المنزل لأن الجو كان ممطراً.','A2',38),
  ('Prepositions of Time','نستخدم at للوقت المحدد، on للأيام والتواريخ، وin للأشهر والسنوات والفترات.','The class starts at eight o''clock.','يبدأ الدرس الساعة الثامنة.','A1',39),
  ('Prepositions of Place','in داخل مكان أو منطقة، on على سطح، at لنقطة أو موقع محدد.','She is waiting at the bus stop.','هي تنتظر عند موقف الحافلة.','A1',40),
  ('Present Simple vs Continuous','المضارع البسيط للعادات والحقائق، والمستمر لما يحدث الآن أو مؤقتاً.','I study every day, but I am resting now.','أدرس كل يوم، لكنني أستريح الآن.','A2',41),
  ('Past Simple vs Present Perfect','الماضي البسيط مع وقت ماضٍ منتهٍ، والمضارع التام عندما لا نحدد وقتاً منتهياً أو تكون النتيجة مرتبطة بالحاضر.','I visited Basra last year, and I have visited Baghdad many times.','زرت البصرة العام الماضي، وقد زرت بغداد مرات عديدة.','B1',42),
  ('Subject-Verb Agreement','يجب أن يتوافق الفعل مع الفاعل في العدد والشخص، خصوصاً في المضارع البسيط.','The student works hard, but the students work hard.','الطالب يعمل بجد، والطلاب يعملون بجد.','A2',43),
  ('Linking Words','and للإضافة، but للتعارض، because للسبب، so للنتيجة، however للانتقال إلى فكرة مخالفة.','I was tired, so I went to bed early.','كنت متعباً، لذلك ذهبت إلى النوم مبكراً.','A2',44),
  ('Neither / Either','either للاختيار بين اثنين أو الموافقة في النفي بصيغة معينة، وneither تعني لا هذا ولا ذاك.','Neither answer is correct.','لا واحدة من الإجابتين صحيحة.','B1',45)
on conflict(title) do update set
  explanation_ar=excluded.explanation_ar,
  example_en=excluded.example_en,
  example_ar=excluded.example_ar,
  level=excluded.level,
  sort_order=excluded.sort_order,
  is_active=true;

insert into public.student_english_verb_bank_v20(base_form,past_form,participle,meaning_ar,irregular,level,sort_order)
values
  ('be','was/were','been','يكون',true,'A1',1),
  ('become','became','become','يصبح',true,'A2',2),
  ('begin','began','begun','يبدأ',true,'A1',3),
  ('break','broke','broken','يكسر',true,'A2',4),
  ('bring','brought','brought','يجلب',true,'A1',5),
  ('build','built','built','يبني',true,'A2',6),
  ('buy','bought','bought','يشتري',true,'A1',7),
  ('catch','caught','caught','يمسك / يلحق',true,'A2',8),
  ('choose','chose','chosen','يختار',true,'A2',9),
  ('come','came','come','يأتي',true,'A1',10),
  ('cost','cost','cost','يكلف',true,'A2',11),
  ('cut','cut','cut','يقطع',true,'A1',12),
  ('do','did','done','يفعل',true,'A1',13),
  ('draw','drew','drawn','يرسم',true,'A2',14),
  ('drink','drank','drunk','يشرب',true,'A1',15),
  ('drive','drove','driven','يقود',true,'A2',16),
  ('eat','ate','eaten','يأكل',true,'A1',17),
  ('fall','fell','fallen','يسقط',true,'A2',18),
  ('feel','felt','felt','يشعر',true,'A1',19),
  ('find','found','found','يجد',true,'A1',20),
  ('fly','flew','flown','يطير',true,'A2',21),
  ('forget','forgot','forgotten','ينسى',true,'A2',22),
  ('get','got','got/gotten','يحصل على',true,'A1',23),
  ('give','gave','given','يعطي',true,'A1',24),
  ('go','went','gone','يذهب',true,'A1',25),
  ('grow','grew','grown','ينمو',true,'A2',26),
  ('have','had','had','يملك / لديه',true,'A1',27),
  ('hear','heard','heard','يسمع',true,'A1',28),
  ('hold','held','held','يمسك',true,'A2',29),
  ('keep','kept','kept','يحتفظ',true,'A2',30),
  ('know','knew','known','يعرف',true,'A1',31),
  ('leave','left','left','يغادر',true,'A1',32),
  ('lose','lost','lost','يفقد',true,'A2',33),
  ('make','made','made','يصنع',true,'A1',34),
  ('meet','met','met','يلتقي',true,'A1',35),
  ('pay','paid','paid','يدفع',true,'A2',36),
  ('read','read','read','يقرأ',true,'A1',37),
  ('ride','rode','ridden','يركب',true,'A2',38),
  ('run','ran','run','يركض',true,'A1',39),
  ('say','said','said','يقول',true,'A1',40),
  ('see','saw','seen','يرى',true,'A1',41),
  ('sell','sold','sold','يبيع',true,'A2',42),
  ('send','sent','sent','يرسل',true,'A1',43),
  ('sing','sang','sung','يغني',true,'A2',44),
  ('sit','sat','sat','يجلس',true,'A1',45),
  ('sleep','slept','slept','ينام',true,'A1',46),
  ('speak','spoke','spoken','يتحدث',true,'A1',47),
  ('spend','spent','spent','ينفق / يقضي',true,'A2',48),
  ('stand','stood','stood','يقف',true,'A1',49),
  ('swim','swam','swum','يسبح',true,'A2',50),
  ('take','took','taken','يأخذ',true,'A1',51),
  ('teach','taught','taught','يدرّس',true,'A2',52),
  ('tell','told','told','يخبر',true,'A1',53),
  ('think','thought','thought','يفكر',true,'A1',54),
  ('understand','understood','understood','يفهم',true,'A2',55),
  ('wear','wore','worn','يرتدي',true,'A2',56),
  ('win','won','won','يفوز',true,'A2',57),
  ('write','wrote','written','يكتب',true,'A1',58),
  ('accept','accepted','accepted','يقبل',false,'A1',59),
  ('add','added','added','يضيف',false,'A1',60),
  ('answer','answered','answered','يجيب',false,'A1',61),
  ('arrive','arrived','arrived','يصل',false,'A1',62),
  ('ask','asked','asked','يسأل',false,'A1',63),
  ('believe','believed','believed','يعتقد',false,'A1',64),
  ('call','called','called','يتصل / ينادي',false,'A1',65),
  ('change','changed','changed','يغير',false,'A1',66),
  ('clean','cleaned','cleaned','ينظف',false,'A1',67),
  ('close','closed','closed','يغلق',false,'A1',68),
  ('compare','compared','compared','يقارن',false,'A2',69),
  ('complete','completed','completed','يكمل',false,'A2',70),
  ('continue','continued','continued','يواصل',false,'A2',71),
  ('cook','cooked','cooked','يطبخ',false,'A1',72),
  ('decide','decided','decided','يقرر',false,'A2',73),
  ('describe','described','described','يصف',false,'A2',74),
  ('develop','developed','developed','يطور',false,'B1',75),
  ('discover','discovered','discovered','يكتشف',false,'A2',76),
  ('enjoy','enjoyed','enjoyed','يستمتع',false,'A1',77),
  ('explain','explained','explained','يشرح',false,'A2',78),
  ('finish','finished','finished','ينهي',false,'A1',79),
  ('follow','followed','followed','يتبع',false,'A1',80),
  ('help','helped','helped','يساعد',false,'A1',81),
  ('hope','hoped','hoped','يأمل',false,'A1',82),
  ('improve','improved','improved','يحسن',false,'A2',83),
  ('include','included','included','يتضمن',false,'A2',84),
  ('invite','invited','invited','يدعو',false,'A2',85),
  ('join','joined','joined','ينضم',false,'A1',86),
  ('learn','learned','learned','يتعلم',false,'A1',87),
  ('like','liked','liked','يحب',false,'A1',88),
  ('listen','listened','listened','يستمع',false,'A1',89),
  ('live','lived','lived','يعيش',false,'A1',90),
  ('look','looked','looked','ينظر',false,'A1',91),
  ('love','loved','loved','يحب',false,'A1',92),
  ('move','moved','moved','يتحرك / ينتقل',false,'A1',93),
  ('need','needed','needed','يحتاج',false,'A1',94),
  ('open','opened','opened','يفتح',false,'A1',95),
  ('organize','organized','organized','ينظم',false,'A2',96),
  ('plan','planned','planned','يخطط',false,'A1',97),
  ('play','played','played','يلعب',false,'A1',98),
  ('practice','practiced','practiced','يتدرب',false,'A1',99),
  ('prepare','prepared','prepared','يجهز',false,'A2',100),
  ('remember','remembered','remembered','يتذكر',false,'A1',101),
  ('repeat','repeated','repeated','يكرر',false,'A1',102),
  ('return','returned','returned','يعود',false,'A1',103),
  ('review','reviewed','reviewed','يراجع',false,'A2',104),
  ('save','saved','saved','يحفظ',false,'A1',105),
  ('share','shared','shared','يشارك',false,'A1',106),
  ('start','started','started','يبدأ',false,'A1',107),
  ('stay','stayed','stayed','يبقى',false,'A1',108),
  ('study','studied','studied','يدرس',false,'A1',109),
  ('talk','talked','talked','يتحدث',false,'A1',110),
  ('travel','traveled','traveled','يسافر',false,'A1',111),
  ('try','tried','tried','يحاول',false,'A1',112),
  ('use','used','used','يستخدم',false,'A1',113),
  ('visit','visited','visited','يزور',false,'A1',114),
  ('wait','waited','waited','ينتظر',false,'A1',115),
  ('walk','walked','walked','يمشي',false,'A1',116),
  ('want','wanted','wanted','يريد',false,'A1',117),
  ('watch','watched','watched','يشاهد',false,'A1',118),
  ('work','worked','worked','يعمل',false,'A1',119)
on conflict(base_form) do update set
  past_form=excluded.past_form,
  participle=excluded.participle,
  meaning_ar=excluded.meaning_ar,
  irregular=excluded.irregular,
  level=excluded.level,
  sort_order=excluded.sort_order,
  is_active=true;

-- Drop only the exact RPC signatures that Student v2 uses.
drop function if exists public.student_english_get_daily_grammar(date);
create function public.student_english_get_daily_grammar(p_day date)
returns table(id uuid,title text,explanation text,example_sentence text,example_ar text,level text)
language sql
stable
security definer
set search_path=public
as $$
  with ranked as (
    select g.*, row_number() over(order by g.sort_order,g.id)-1 as rn, count(*) over() as cnt
    from public.student_english_grammar_bank_v20 g where g.is_active=true
  ), pick as (
    select case when max(cnt) is null or max(cnt)=0 then 0
      else mod(greatest(0,(coalesce(p_day,current_date)-date '2026-08-30'))::integer, max(cnt)::integer) end as wanted
    from ranked
  )
  select r.id,r.title,r.explanation_ar,r.example_en,r.example_ar,r.level
  from ranked r cross join pick p where r.rn=p.wanted limit 1;
$$;
grant execute on function public.student_english_get_daily_grammar(date) to authenticated;

drop function if exists public.student_english_get_daily_verbs(date,integer);
create function public.student_english_get_daily_verbs(p_day date,p_limit integer default 10)
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
           greatest(0,(coalesce(p_day,current_date)-date '2026-08-30'))::integer as day_no,
           coalesce(max(cnt),0)::integer as cnt from ranked
  ), wanted as (
    select gs as ord,
           case when p.cnt=0 then -1 else mod((p.day_no*p.lim)+gs,p.cnt) end as rn
    from params p cross join lateral generate_series(0,p.lim-1) gs
  )
  select r.id,r.base_form,r.past_form,r.participle,r.meaning_ar,
         ''::text as example_en,''::text as example_ar,r.irregular,r.level
  from wanted w join ranked r on r.rn=w.rn
  order by w.ord;
$$;
grant execute on function public.student_english_get_daily_verbs(date,integer) to authenticated;

-- Daily vocabulary for the general Learn English feed.
drop function if exists public.student_english_get_daily_vocabulary(date);
create function public.student_english_get_daily_vocabulary(p_day date)
returns table(id uuid,word text,meaning_ar text,example_sentence text,level text)
language sql
stable
security definer
set search_path=public
as $$
  with ranked as (
    select v.id,v.word,v.meaning_ar,coalesce(v.example_en,'') as example_sentence,v.level,
           row_number() over(order by coalesce(v.source_rank,2147483647),v.word,v.id)-1 as rn,
           count(*) over() as cnt
    from public.english_vocabulary v where v.is_active=true
  ), params as (
    select greatest(0,(coalesce(p_day,current_date)-date '2026-08-30'))::integer as day_no,
           coalesce(max(cnt),0)::integer as cnt from ranked
  ), wanted as (
    select gs as ord,case when p.cnt=0 then -1 else mod((p.day_no*10)+gs,p.cnt) end as rn
    from params p cross join lateral generate_series(0,9) gs
  )
  select r.id,r.word,r.meaning_ar,r.example_sentence,r.level
  from wanted w join ranked r on r.rn=w.rn order by w.ord;
$$;
grant execute on function public.student_english_get_daily_vocabulary(date) to authenticated;

-- ------------------------------------------------------------
-- 3) Daily learning notifications at 08:00 Baghdad, then +5h
--    Repeats stop as soon as the user opens Student after 08:00.
--    No 04:00 overnight reminder; the sequence is 08, 13, 18, 23.
-- ------------------------------------------------------------
create table if not exists public.student_notification_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_learning_reminder boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.student_notification_preferences enable row level security;
drop policy if exists student_notification_preferences_own_v20 on public.student_notification_preferences;
create policy student_notification_preferences_own_v20 on public.student_notification_preferences
for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.student_notification_preferences to authenticated;

create or replace function public.student_send_learning_reminder_v20(p_slot text)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  baghdad_now timestamp := now() at time zone 'Asia/Baghdad';
  learning_date date := (baghdad_now - interval '8 hours')::date;
  day_start_utc timestamptz := ((learning_date::text || ' 08:00:00')::timestamp at time zone 'Asia/Baghdad');
  inserted_count integer := 0;
begin
  if to_regclass('public.notifications') is null then return 0; end if;

  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  select p.id,null,
         'تحديث جديد في Learn English',
         case when p_slot='08' then 'تم تحديث شروحات اليوم والقواعد والأفعال. افتح Student وأكمل التعلم.'
              else 'محتوى اليوم ما زال بانتظارك. أكمل التعلم وراجع قاعدة اليوم والأفعال الجديدة.' end,
         'daily_learning_refresh','english/daily','all',false,false,
         jsonb_build_object('target_type','english_daily','learning_date',learning_date::text,'slot',p_slot)
  from public.profiles p
  left join public.student_notification_preferences pref on pref.user_id=p.id
  where coalesce(pref.daily_learning_reminder,true)=true
    and coalesce(p.last_active_at,'1970-01-01'::timestamptz) < day_start_utc
    and not exists(
      select 1 from public.notifications n
      where n.user_id=p.id and n.kind='daily_learning_refresh'
        and n.metadata->>'learning_date'=learning_date::text
        and n.metadata->>'slot'=p_slot
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;
revoke all on function public.student_send_learning_reminder_v20(text) from public, anon, authenticated;

-- Keep only 45 days of these generated reminders.
create or replace function public.student_cleanup_learning_reminders_v20()
returns void language sql security definer set search_path=public as $$
  delete from public.notifications where kind='daily_learning_refresh' and created_at < now()-interval '45 days';
$$;
revoke all on function public.student_cleanup_learning_reminders_v20() from public, anon, authenticated;

-- pg_cron uses UTC. Baghdad 08/13/18/23 = UTC 05/10/15/20.
do $$
begin
  begin execute 'create extension if not exists pg_cron with schema extensions'; exception when others then null; end;
  if exists(select 1 from pg_extension where extname='pg_cron') then
    begin perform cron.unschedule('student-learning-0800-v20'); exception when others then null; end;
    begin perform cron.unschedule('student-learning-1300-v20'); exception when others then null; end;
    begin perform cron.unschedule('student-learning-1800-v20'); exception when others then null; end;
    begin perform cron.unschedule('student-learning-2300-v20'); exception when others then null; end;
    begin perform cron.unschedule('student-learning-cleanup-v20'); exception when others then null; end;
    -- Disable older daily reminder to prevent duplicate 08:00 pushes.
    begin perform cron.unschedule('student-daily-learning-reminder'); exception when others then null; end;
    perform cron.schedule('student-learning-0800-v20','0 5 * * *',$cron$select public.student_send_learning_reminder_v20('08');$cron$);
    perform cron.schedule('student-learning-1300-v20','0 10 * * *',$cron$select public.student_send_learning_reminder_v20('13');$cron$);
    perform cron.schedule('student-learning-1800-v20','0 15 * * *',$cron$select public.student_send_learning_reminder_v20('18');$cron$);
    perform cron.schedule('student-learning-2300-v20','0 20 * * *',$cron$select public.student_send_learning_reminder_v20('23');$cron$);
    perform cron.schedule('student-learning-cleanup-v20','20 2 * * *',$cron$select public.student_cleanup_learning_reminders_v20();$cron$);
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) Runtime update defaults for v2.0.0.
--    The direct release URL becomes valid after GitHub Release is created.
-- ------------------------------------------------------------
create table if not exists public.student_runtime_settings(
  id integer primary key default 1 check(id=1),
  force_update boolean not null default false,
  minimum_version_code integer not null default 0,
  latest_version_code integer not null default 0,
  apk_url text not null default '',
  update_message text not null default 'يتوفر تحديث جديد لـ Student.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.student_runtime_settings enable row level security;
drop policy if exists student_runtime_settings_public_read_v20 on public.student_runtime_settings;
create policy student_runtime_settings_public_read_v20 on public.student_runtime_settings
for select to anon,authenticated using(id=1);
grant select on public.student_runtime_settings to anon,authenticated;

insert into public.student_runtime_settings(id,force_update,minimum_version_code,latest_version_code,apk_url,update_message,updated_at)
values(
  1,false,0,21,
  'https://github.com/hasan2llpm-prog/Student/releases/download/v2.0.0/Student-v2.0.0.apk',
  'يتوفر تحديث جديد لـ Student يتضمن Reels وتحسينات وإصلاحات مهمة.',
  now()
)
on conflict(id) do update set
  latest_version_code=greatest(public.student_runtime_settings.latest_version_code,21),
  apk_url=excluded.apk_url,
  update_message=excluded.update_message,
  updated_at=now();

-- Future releases only need a higher versionCode + same applicationId/signing key,
-- then update student_runtime_settings. No second application is created.
