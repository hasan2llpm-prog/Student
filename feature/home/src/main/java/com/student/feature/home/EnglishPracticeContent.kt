package com.student.feature.home

data class PracticeQuestion(
    val prompt: String,
    val options: List<String>,
    val correctIndex: Int,
    val skill: String
)

data class ReadingPractice(
    val id: String,
    val level: String,
    val title: String,
    val passageEn: String,
    val passageAr: String,
    val questions: List<PracticeQuestion>
)

data class ListeningPractice(
    val id: String,
    val level: String,
    val title: String,
    val scriptEn: String,
    val scriptAr: String,
    val question: PracticeQuestion
)

data class WritingPractice(
    val id: String,
    val level: String,
    val promptEn: String,
    val promptAr: String,
    val minimumWords: Int,
    val checklist: List<String>
)

data class SpeakingPractice(
    val id: String,
    val level: String,
    val promptEn: String,
    val promptAr: String,
    val model: String
)

private data class PracticeTopic(
    val key: String,
    val titleEn: String,
    val titleAr: String,
    val person: String,
    val placeEn: String,
    val placeAr: String,
    val actionEn: String,
    val actionAr: String,
    val goalEn: String,
    val goalAr: String,
    val resultEn: String,
    val resultAr: String
)

/**
 * Offline practice corpus: 50 real-life themes × 5 CEFR bands = 250 items per skill.
 * The daily selector rotates through the complete corpus after the 08:00 Baghdad learning-day boundary.
 * Content is intentionally generated from explicit bilingual facts rather than placeholder labels.
 */
object EnglishPracticeContent {
    private val levels = listOf("A1", "A2", "B1", "B2", "C1")

    private val topics = listOf(
        PracticeTopic("morning","A Better Morning","صباح أفضل","Omar","home","المنزل","prepares breakfast and reviews five English words","يحضّر الإفطار ويراجع خمس كلمات إنجليزية","start the day calmly","بدء اليوم بهدوء","he reaches class on time and feels ready","يصل إلى الدرس في الوقت ويشعر بالاستعداد"),
        PracticeTopic("bus","The University Bus","حافلة الجامعة","Sara","the bus stop","موقف الحافلة","takes the bus and listens to a short English podcast","تركب الحافلة وتستمع إلى بودكاست إنجليزي قصير","use travel time well","استثمار وقت الطريق جيدًا","she learns useful expressions before class","تتعلم تعبيرات مفيدة قبل الدرس"),
        PracticeTopic("library","A Quiet Library","مكتبة هادئة","Maya","the library","المكتبة","reads a short story and notes unfamiliar words","تقرأ قصة قصيرة وتدوّن الكلمات غير المألوفة","understand vocabulary from context","فهم المفردات من السياق","reading becomes easier each week","تصبح القراءة أسهل كل أسبوع"),
        PracticeTopic("market","At the Market","في السوق","Ali","the local market","السوق المحلي","compares prices and asks the seller polite questions","يقارن الأسعار ويسأل البائع بأسلوب مهذب","buy fresh food within his budget","شراء طعام طازج ضمن ميزانيته","he saves money and chooses good products","يوفر المال ويختار منتجات جيدة"),
        PracticeTopic("clinic","A Clinic Appointment","موعد في العيادة","Noor","the clinic","العيادة","describes her symptoms clearly and listens to the doctor's advice","تصف أعراضها بوضوح وتستمع إلى نصيحة الطبيب","understand the treatment plan","فهم خطة العلاج","she leaves with clear instructions","تغادر ومعها تعليمات واضحة"),
        PracticeTopic("cafe","Meeting at a Café","لقاء في مقهى","Hassan","a café","مقهى","orders a drink and talks with a friend in English","يطلب مشروبًا ويتحدث مع صديق بالإنجليزية","practise everyday conversation","التدرّب على المحادثة اليومية","he becomes less afraid of making mistakes","يصبح أقل خوفًا من ارتكاب الأخطاء"),
        PracticeTopic("job","A Job Interview","مقابلة عمل","Lina","an office","مكتب","answers questions about her skills and experience","تجيب عن أسئلة حول مهاراتها وخبرتها","present herself confidently","تقديم نفسها بثقة","the interviewer asks her to return for a second meeting","يطلب منها المحاور العودة للقاء ثانٍ"),
        PracticeTopic("airport","At the Airport","في المطار","Kareem","the airport","المطار","checks his gate and asks an employee for directions","يتحقق من بوابته ويسأل موظفًا عن الاتجاهات","reach the correct gate without rushing","الوصول إلى البوابة الصحيحة دون استعجال","he boards the flight on time","يصعد إلى الطائرة في الوقت"),
        PracticeTopic("hotel","Checking into a Hotel","تسجيل الدخول في فندق","Rana","a hotel","فندق","confirms her reservation and asks about breakfast","تؤكد حجزها وتسأل عن الإفطار","understand the hotel services","فهم خدمات الفندق","she finds her room easily and knows the schedule","تجد غرفتها بسهولة وتعرف الجدول"),
        PracticeTopic("restaurant","Ordering Dinner","طلب العشاء","Yousef","a restaurant","مطعم","reads the menu and asks about ingredients","يقرأ قائمة الطعام ويسأل عن المكونات","choose a suitable meal","اختيار وجبة مناسبة","he orders confidently and enjoys the meal","يطلب بثقة ويستمتع بالوجبة"),
        PracticeTopic("phone","A Phone Call","مكالمة هاتفية","Zainab","home","المنزل","calls a classmate to confirm tomorrow's lesson","تتصل بزميلة لتأكيد درس الغد","avoid misunderstanding the schedule","تجنب سوء فهم الجدول","they agree on the exact time and room","يتفقان على الوقت والقاعة بدقة"),
        PracticeTopic("weather","Changing Weather","تغيّر الطقس","Ahmed","the city centre","مركز المدينة","checks the forecast and carries an umbrella","يتحقق من توقعات الطقس ويحمل مظلة","prepare for an afternoon storm","الاستعداد لعاصفة بعد الظهر","he stays dry when the rain begins","يبقى جافًا عندما يبدأ المطر"),
        PracticeTopic("gym","A Healthy Routine","روتين صحي","Huda","the gym","النادي الرياضي","walks for thirty minutes and drinks enough water","تمشي ثلاثين دقيقة وتشرب ماءً كافيًا","improve her energy gradually","تحسين طاقتها تدريجيًا","she feels more active during study time","تشعر بنشاط أكبر أثناء الدراسة"),
        PracticeTopic("exam","Preparing for an Exam","الاستعداد للامتحان","Mustafa","his study room","غرفة دراسته","divides the material into small daily tasks","يقسم المادة إلى مهام يومية صغيرة","review without last-minute stress","المراجعة دون ضغط اللحظة الأخيرة","he remembers more and sleeps better before the test","يتذكر أكثر وينام أفضل قبل الاختبار"),
        PracticeTopic("group","A Group Project","مشروع جماعي","Dalia","the university lab","مختبر الجامعة","organises tasks and shares a clear deadline","تنظم المهام وتحدد موعدًا نهائيًا واضحًا","help the team work fairly","مساعدة الفريق على العمل بعدل","the project is finished before the deadline","ينتهي المشروع قبل الموعد النهائي"),
        PracticeTopic("computer","A Computer Problem","مشكلة حاسوب","Sami","the computer lab","مختبر الحاسوب","backs up his files before installing an update","ينشئ نسخة احتياطية لملفاته قبل تثبيت تحديث","protect his coursework","حماية واجباته الدراسية","he restores his work after an unexpected error","يستعيد عمله بعد خطأ مفاجئ"),
        PracticeTopic("shopping","Buying Clothes","شراء الملابس","Aya","a clothing shop","متجر ملابس","tries two sizes and checks the return policy","تجرب مقاسين وتتحقق من سياسة الإرجاع","buy something comfortable","شراء شيء مريح","she chooses the correct size and keeps the receipt","تختار المقاس الصحيح وتحتفظ بالإيصال"),
        PracticeTopic("bank","At the Bank","في المصرف","Faris","the bank","المصرف","asks about a transfer fee before sending money","يسأل عن رسوم التحويل قبل إرسال المال","avoid an unexpected charge","تجنب رسوم غير متوقعة","he understands the cost and completes the transfer","يفهم التكلفة ويكمل التحويل"),
        PracticeTopic("post","Sending a Package","إرسال طرد","Maryam","the post office","مكتب البريد","writes the address carefully and chooses tracked delivery","تكتب العنوان بعناية وتختار توصيلًا قابلًا للتتبع","send a gift safely","إرسال هدية بأمان","she receives a tracking number","تحصل على رقم تتبع"),
        PracticeTopic("directions","Asking for Directions","السؤال عن الاتجاهات","Bilal","a busy street","شارع مزدحم","asks where the nearest pharmacy is and repeats the directions","يسأل عن أقرب صيدلية ويكرر الاتجاهات","make sure he understood correctly","التأكد من أنه فهم بشكل صحيح","he reaches the pharmacy without getting lost","يصل إلى الصيدلية دون أن يضيع"),
        PracticeTopic("rent","Renting an Apartment","استئجار شقة","Reem","an apartment","شقة","checks the rooms and asks what the rent includes","تتفقد الغرف وتسأل عمّا يشمله الإيجار","compare the real monthly cost","مقارنة التكلفة الشهرية الفعلية","she makes a decision after reading the contract","تتخذ قرارًا بعد قراءة العقد"),
        PracticeTopic("repair","Repairing a Phone","إصلاح هاتف","Mahdi","a repair shop","محل إصلاح","explains the problem and asks for a price estimate","يشرح المشكلة ويطلب تقديرًا للسعر","decide whether the repair is worthwhile","تحديد ما إذا كان الإصلاح يستحق","he agrees only after understanding the cost","يوافق فقط بعد فهم التكلفة"),
        PracticeTopic("sports","A Football Match","مباراة كرة قدم","Salma","a sports field","ملعب رياضي","joins a friendly match and encourages her teammates","تنضم إلى مباراة ودية وتشجع زملاءها","enjoy exercise and teamwork","الاستمتاع بالرياضة والعمل الجماعي","the team communicates better in the second half","يتواصل الفريق بشكل أفضل في الشوط الثاني"),
        PracticeTopic("movie","Choosing a Film","اختيار فيلم","Nadia","home","المنزل","reads two reviews before choosing a film","تقرأ مراجعتين قبل اختيار فيلم","find something the family will enjoy","إيجاد شيء تستمتع به العائلة","everyone agrees on a comedy","يتفق الجميع على فيلم كوميدي"),
        PracticeTopic("book","A Useful Book","كتاب مفيد","Qasim","a bookshop","مكتبة لبيع الكتب","reads the first pages and checks the contents","يقرأ الصفحات الأولى ويتحقق من المحتويات","choose a book for independent study","اختيار كتاب للدراسة الذاتية","he buys a book with practical exercises","يشتري كتابًا يحتوي تمارين عملية"),
        PracticeTopic("cooking","Cooking Together","الطبخ معًا","Amal","the kitchen","المطبخ","follows a recipe and measures the ingredients carefully","تتبع وصفة وتقيس المكونات بعناية","prepare dinner for her family","تحضير العشاء لعائلتها","the meal is ready at the planned time","تكون الوجبة جاهزة في الوقت المخطط"),
        PracticeTopic("garden","A Small Garden","حديقة صغيرة","Haider","the garden","الحديقة","waters the plants early and removes dry leaves","يسقي النباتات مبكرًا ويزيل الأوراق الجافة","keep the plants healthy in hot weather","الحفاظ على صحة النباتات في الجو الحار","new leaves appear after two weeks","تظهر أوراق جديدة بعد أسبوعين"),
        PracticeTopic("volunteer","A Volunteer Day","يوم تطوعي","Saja","a community centre","مركز مجتمعي","helps organise books and welcomes visitors","تساعد في تنظيم الكتب وترحب بالزوار","support a local reading event","دعم فعالية قراءة محلية","more children join the event than expected","ينضم أطفال أكثر مما كان متوقعًا"),
        PracticeTopic("museum","Visiting a Museum","زيارة متحف","Tariq","the museum","المتحف","reads the exhibit notes and asks the guide questions","يقرأ ملاحظات المعروضات ويسأل المرشد","learn about local history","التعرف على التاريخ المحلي","he writes down three facts to remember later","يدوّن ثلاث حقائق ليتذكرها لاحقًا"),
        PracticeTopic("traffic","A Traffic Delay","تأخير مروري","Aseel","the road to university","الطريق إلى الجامعة","sends a message when traffic suddenly stops","ترسل رسالة عندما تتوقف حركة المرور فجأة","tell her teacher she may arrive late","إخبار المدرس بأنها قد تتأخر","the class knows about the delay before she arrives","يعرف الصف بالتأخير قبل وصولها"),
        PracticeTopic("internet","No Internet","انقطاع الإنترنت","Jawad","home","المنزل","switches to offline notes when the connection fails","ينتقل إلى الملاحظات دون إنترنت عندما ينقطع الاتصال","continue studying without wasting time","مواصلة الدراسة دون إضاعة الوقت","he finishes the planned revision anyway","يكمل المراجعة المخططة رغم ذلك"),
        PracticeTopic("presentation","A Class Presentation","عرض صفي","Rasha","the classroom","الصف","practises her opening and keeps the slides simple","تتدرب على المقدمة وتحافظ على بساطة الشرائح","speak clearly instead of reading every word","التحدث بوضوح بدل قراءة كل كلمة","the audience asks useful questions at the end","يطرح الجمهور أسئلة مفيدة في النهاية"),
        PracticeTopic("email","Writing an Email","كتابة بريد إلكتروني","Nabil","the university library","مكتبة الجامعة","writes a polite email asking for an appointment","يكتب بريدًا مهذبًا يطلب فيه موعدًا","make the request clear and respectful","جعل الطلب واضحًا ومحترمًا","he receives a reply with an available time","يتلقى ردًا بوقت متاح"),
        PracticeTopic("friend","Helping a Friend","مساعدة صديق","Layla","campus","الحرم الجامعي","listens carefully when her friend feels worried","تستمع بعناية عندما يشعر صديقها بالقلق","offer support without judging","تقديم الدعم دون إصدار أحكام","her friend feels calmer after the conversation","يشعر صديقها بهدوء أكبر بعد الحديث"),
        PracticeTopic("budget","A Monthly Budget","ميزانية شهرية","Adnan","home","المنزل","records his main expenses and sets a weekly limit","يسجل نفقاته الأساسية ويضع حدًا أسبوعيًا","save money for a new laptop","توفير المال لحاسوب جديد","he notices where small purchases were adding up","يلاحظ أين كانت المشتريات الصغيرة تتراكم"),
        PracticeTopic("water","Saving Water","توفير الماء","Dina","home","المنزل","turns off the tap while brushing her teeth","تغلق الصنبور أثناء تنظيف أسنانها","reduce unnecessary water use","تقليل استخدام الماء غير الضروري","the family adopts the same simple habit","تتبنى العائلة العادة البسيطة نفسها"),
        PracticeTopic("recycle","Recycling at School","إعادة التدوير في المدرسة","Ibrahim","school","المدرسة","labels separate bins for paper and plastic","يضع ملصقات على حاويات منفصلة للورق والبلاستيك","make recycling easier for students","تسهيل إعادة التدوير للطلاب","the bins are used correctly after clear signs are added","تُستخدم الحاويات بشكل صحيح بعد إضافة لافتات واضحة"),
        PracticeTopic("trip","Planning a Day Trip","التخطيط لرحلة يومية","Haneen","home","المنزل","checks transport times and prepares a simple itinerary","تتحقق من أوقات النقل وتعد برنامجًا بسيطًا","visit two places without rushing","زيارة مكانين دون استعجال","the group agrees on an early departure","تتفق المجموعة على الانطلاق مبكرًا"),
        PracticeTopic("photo","A Photography Walk","جولة تصوير","Saif","the riverbank","ضفة النهر","takes photos at sunset and changes the angle instead of zooming","يلتقط صورًا عند الغروب ويغير الزاوية بدل التكبير","improve composition with simple choices","تحسين التكوين بخيارات بسيطة","he selects three strong photos for his project","يختار ثلاث صور قوية لمشروعه"),
        PracticeTopic("music","Learning a Song","تعلم أغنية","Farah","home","المنزل","listens to a clean short song and follows the written words","تستمع إلى أغنية قصيرة مناسبة وتتابع الكلمات المكتوبة","notice connected English sounds","ملاحظة الأصوات الإنجليزية المتصلة","she recognises phrases that were unclear before","تتعرف على عبارات كانت غير واضحة سابقًا"),
        PracticeTopic("pet","Looking After a Pet","العناية بحيوان أليف","Hussein","home","المنزل","feeds the cat at regular times and keeps fresh water available","يطعم القطة في أوقات منتظمة ويبقي الماء النظيف متاحًا","build a responsible routine","بناء روتين مسؤول","the cat becomes comfortable with the schedule","تعتاد القطة على الجدول"),
        PracticeTopic("queue","Waiting in a Queue","الانتظار في طابور","Wafa","a service centre","مركز خدمات","checks the required documents while waiting","تتحقق من المستندات المطلوبة أثناء الانتظار","avoid reaching the desk with missing papers","تجنب الوصول إلى الموظف بأوراق ناقصة","her request is processed without another visit","تُنجز معاملتها دون زيارة أخرى"),
        PracticeTopic("neighbour","A New Neighbour","جار جديد","Bashar","the neighbourhood","الحي","introduces himself and offers practical local information","يعرّف بنفسه ويقدم معلومات محلية مفيدة","welcome the new neighbour politely","الترحيب بالجار الجديد بأدب","they exchange phone numbers for emergencies","يتبادلان أرقام الهاتف للطوارئ"),
        PracticeTopic("lost","A Lost Wallet","محفظة مفقودة","Shahad","a shopping centre","مركز تسوق","reports a lost wallet and describes it accurately","تبلغ عن محفظة مفقودة وتصفها بدقة","help staff identify the correct item","مساعدة الموظفين على تحديد الغرض الصحيح","the wallet is found at the information desk","تُعثر على المحفظة عند مكتب المعلومات"),
        PracticeTopic("schedule","A Busy Schedule","جدول مزدحم","Ammar","university","الجامعة","moves non-urgent tasks and protects two study periods","ينقل المهام غير العاجلة ويحافظ على فترتين للدراسة","finish important work without staying up late","إنهاء العمل المهم دون السهر","he completes the priority tasks before evening","يكمل المهام ذات الأولوية قبل المساء"),
        PracticeTopic("news","Reading the News","قراءة الأخبار","Ghada","home","المنزل","compares two reliable reports before sharing a claim","تقارن تقريرين موثوقين قبل مشاركة معلومة","avoid spreading incorrect information","تجنب نشر معلومات غير صحيحة","she decides not to share an unverified post","تقرر عدم مشاركة منشور غير متحقق منه"),
        PracticeTopic("course","An Online Course","دورة عبر الإنترنت","Murtadha","home","المنزل","watches one short lesson and completes the exercise immediately","يشاهد درسًا قصيرًا ويكمل التمرين مباشرة","turn passive watching into active practice","تحويل المشاهدة السلبية إلى تدريب فعلي","his quiz scores improve over the next lessons","تتحسن درجات الاختبارات في الدروس التالية"),
        PracticeTopic("meeting","A Team Meeting","اجتماع فريق","Ruqaya","an office","مكتب","writes three discussion points before the meeting","تكتب ثلاث نقاط للنقاش قبل الاجتماع","keep the conversation focused","الحفاظ على تركيز النقاش","the team leaves with clear responsibilities","يغادر الفريق مع مسؤوليات واضحة"),
        PracticeTopic("choice","Making a Difficult Choice","اتخاذ قرار صعب","Laith","home","المنزل","lists the advantages and disadvantages of two options","يسجل مزايا وعيوب خيارين","make a decision based on priorities rather than pressure","اتخاذ قرار حسب الأولويات لا الضغط","he chooses the option that fits his long-term goal","يختار الخيار الذي يناسب هدفه الطويل"),
        PracticeTopic("feedback","Using Feedback","الاستفادة من الملاحظات","Asmaa","the classroom","الصف","reads her teacher's comments and rewrites one weak paragraph","تقرأ ملاحظات مدرسها وتعيد كتابة فقرة ضعيفة","turn feedback into a specific improvement","تحويل الملاحظات إلى تحسين محدد","the revised paragraph becomes clearer and more concise","تصبح الفقرة المعدلة أوضح وأكثر إيجازًا")
    )

    val readingItems: List<ReadingPractice> = topics.flatMapIndexed { topicIndex, topic ->
        levels.mapIndexed { levelIndex, level -> buildReading(topic, topicIndex, level, levelIndex) }
    }

    val listeningItems: List<ListeningPractice> = topics.flatMapIndexed { topicIndex, topic ->
        levels.mapIndexed { levelIndex, level ->
            val reading = buildReading(topic, topicIndex, level, levelIndex)
            ListeningPractice(
                id = "listen_${topic.key}_${level.lowercase()}",
                level = level,
                title = topic.titleEn,
                scriptEn = reading.passageEn,
                scriptAr = reading.passageAr,
                question = reading.questions[(levelIndex + 1) % reading.questions.size]
            )
        }
    }

    val writingItems: List<WritingPractice> = topics.flatMapIndexed { _, topic ->
        levels.mapIndexed { levelIndex, level ->
            val minimum = listOf(25, 40, 70, 110, 150)[levelIndex]
            WritingPractice(
                id = "write_${topic.key}_${level.lowercase()}",
                level = level,
                promptEn = when (levelIndex) {
                    0 -> "Write $minimum words about ${topic.titleEn.lowercase()}. Say where it happens, what ${topic.person} does, and the result."
                    1 -> "Write $minimum words about ${topic.titleEn.lowercase()}. Explain the goal and put the events in a clear order."
                    2 -> "Write $minimum words about ${topic.titleEn.lowercase()}. Add reasons, one difficulty, and a practical result."
                    3 -> "Write $minimum words discussing ${topic.titleEn.lowercase()}. Connect the situation to a wider everyday problem and suggest an improvement."
                    else -> "Write $minimum words evaluating the decisions in ${topic.titleEn.lowercase()}. Consider an alternative, justify your judgement, and end with a concise conclusion."
                },
                promptAr = "اكتب ما لا يقل عن $minimum كلمة عن «${topic.titleAr}» بمستوى $level، مع تنظيم الأفكار وربطها بوضوح.",
                minimumWords = minimum,
                checklist = listOf("بداية واضحة", "تفاصيل مرتبطة بالموضوع", "روابط بين الجمل", "مراجعة الأزمنة", "خاتمة مناسبة")
            )
        }
    }

    val speakingItems: List<SpeakingPractice> = topics.flatMapIndexed { _, topic ->
        levels.mapIndexed { levelIndex, level ->
            val model = when (levelIndex) {
                0 -> "This situation happens at ${topic.placeEn}. ${topic.person} ${topic.actionEn}. The goal is to ${topic.goalEn}. In the end, ${topic.resultEn}."
                1 -> "Let me describe ${topic.titleEn.lowercase()}. ${topic.person} is at ${topic.placeEn} and ${topic.actionEn}. This is useful because the goal is to ${topic.goalEn}. As a result, ${topic.resultEn}."
                2 -> "In this situation, ${topic.person} ${topic.actionEn}. The main reason is to ${topic.goalEn}. A practical advantage is that ${topic.resultEn}. I think this is a useful approach because it turns a simple action into a clear result."
                3 -> "The situation of ${topic.titleEn.lowercase()} shows how an ordinary decision can affect a wider outcome. ${topic.person} ${topic.actionEn}, mainly to ${topic.goalEn}. Consequently, ${topic.resultEn}. A better alternative would depend on time, cost, and the people involved."
                else -> "When considering ${topic.titleEn.lowercase()}, it is worth separating immediate convenience from long-term value. ${topic.person} ${topic.actionEn} in order to ${topic.goalEn}; importantly, ${topic.resultEn}. I would defend this choice if the evidence supported the same priorities, although a different context could justify another response."
            }
            SpeakingPractice(
                id = "speak_${topic.key}_${level.lowercase()}",
                level = level,
                promptEn = "Speak about ${topic.titleEn.lowercase()} at $level level. Explain the situation, goal, result, and your own view.",
                promptAr = "تحدث عن «${topic.titleAr}» بمستوى $level: اشرح الموقف والهدف والنتيجة ثم أضف رأيك.",
                model = model
            )
        }
    }

    init {
        require(readingItems.size >= 250)
        require(listeningItems.size >= 250)
        require(writingItems.size >= 250)
        require(speakingItems.size >= 250)
    }

    fun readingForDay(dayIndex: Int): ReadingPractice = readingItems[Math.floorMod(dayIndex, readingItems.size)]
    fun listeningForDay(dayIndex: Int): ListeningPractice = listeningItems[Math.floorMod(dayIndex * 7 + 31, listeningItems.size)]
    fun writingForDay(dayIndex: Int): WritingPractice = writingItems[Math.floorMod(dayIndex * 11 + 17, writingItems.size)]
    fun speakingForDay(dayIndex: Int): SpeakingPractice = speakingItems[Math.floorMod(dayIndex * 13 + 23, speakingItems.size)]

    private fun buildReading(topic: PracticeTopic, index: Int, level: String, levelIndex: Int): ReadingPractice {
        val en = when (levelIndex) {
            0 -> "${topic.person} is at ${topic.placeEn}. ${topic.person} ${topic.actionEn}. The goal is to ${topic.goalEn}. In the end, ${topic.resultEn}."
            1 -> "${topic.person} spends some time at ${topic.placeEn}. ${topic.person} ${topic.actionEn}. The main goal is to ${topic.goalEn}. The plan is simple, but it requires attention. In the end, ${topic.resultEn}."
            2 -> "While at ${topic.placeEn}, ${topic.person} ${topic.actionEn}. This choice is meant to ${topic.goalEn}. Instead of acting quickly, ${topic.person} pays attention to the useful details and follows a simple plan. As a result, ${topic.resultEn}. The experience shows that small practical decisions can make everyday tasks easier."
            3 -> "At ${topic.placeEn}, ${topic.person} faces an ordinary situation that still requires careful judgement. ${topic.person} ${topic.actionEn}, primarily to ${topic.goalEn}. The decision is effective because it reduces uncertainty and makes the next step clearer. Eventually, ${topic.resultEn}. Although the situation seems simple, it illustrates how preparation and communication can prevent avoidable problems."
            else -> "The experience of ${topic.titleEn.lowercase()} demonstrates how routine choices can reveal broader habits of judgement. At ${topic.placeEn}, ${topic.person} ${topic.actionEn} with the intention of trying to ${topic.goalEn}. Rather than relying on assumption, the approach gives priority to relevant information and a manageable sequence of actions. Consequently, ${topic.resultEn}. What makes the episode significant is not its difficulty but the disciplined reasoning behind it: an ordinary task becomes more reliable when decisions are explicit, evidence is checked, and the likely consequences are considered before action is taken."
        }
        val ar = when (levelIndex) {
            0 -> "${topic.person} في ${topic.placeAr}. ${topic.actionAr}. الهدف هو ${topic.goalAr}. وفي النهاية، ${topic.resultAr}."
            1 -> "يقضي ${topic.person} بعض الوقت في ${topic.placeAr}. ${topic.actionAr}. والهدف الأساسي هو ${topic.goalAr}. الخطة بسيطة لكنها تحتاج إلى انتباه. وفي النهاية، ${topic.resultAr}."
            2 -> "أثناء وجود ${topic.person} في ${topic.placeAr}، ${topic.actionAr}. يهدف هذا الاختيار إلى ${topic.goalAr}. وبدل التصرف بسرعة، يهتم بالتفاصيل المفيدة ويتبع خطة بسيطة. ونتيجة لذلك، ${topic.resultAr}. وتوضح التجربة أن القرارات العملية الصغيرة قد تجعل المهام اليومية أسهل."
            3 -> "في ${topic.placeAr} يواجه ${topic.person} موقفًا يوميًا يحتاج مع ذلك إلى حكم دقيق. ${topic.actionAr} أساسًا من أجل ${topic.goalAr}. ينجح القرار لأنه يقلل عدم اليقين ويجعل الخطوة التالية أوضح. وفي النهاية، ${topic.resultAr}. وعلى الرغم من بساطة الموقف فإنه يوضح كيف يمنع الاستعداد والتواصل مشكلات يمكن تجنبها."
            else -> "توضح تجربة «${topic.titleAr}» كيف تكشف الاختيارات اليومية عن عادات أوسع في التفكير. في ${topic.placeAr}، ${topic.actionAr} بقصد ${topic.goalAr}. وبدل الاعتماد على الافتراض، يعطي الأسلوب الأولوية للمعلومات المهمة وتسلسل عملي للخطوات. ونتيجة لذلك، ${topic.resultAr}. ولا تكمن أهمية الموقف في صعوبته، بل في التفكير المنضبط خلفه؛ فالمهمة العادية تصبح أكثر موثوقية عندما تكون القرارات واضحة، وتُفحص الأدلة، وتُدرس النتائج المحتملة قبل التصرف."
        }
        val q = listOf(
            PracticeQuestion("Where does the situation mainly happen?", listOf(topic.placeEn, "At an airport", "In another country", "The text does not say"), 0, "direct"),
            PracticeQuestion("What is ${topic.person}'s main goal?", listOf("To ${topic.goalEn}", "To avoid all work", "To change the subject", "To leave immediately"), 0, "direct"),
            PracticeQuestion("Which result is mentioned?", listOf(topic.resultEn.replaceFirstChar { it.uppercase() }, "Nothing changes", "The plan is cancelled", "A new problem is created"), 0, "detail"),
            PracticeQuestion("What can be inferred from the passage?", listOf("Careful small actions can improve an outcome", "Planning always wastes time", "Only experts can solve daily problems", "Communication has no value"), 0, "inference"),
            PracticeQuestion("Which idea best matches the writer's message?", listOf("Use relevant information and act deliberately", "Choose the fastest option without checking", "Avoid responsibility when possible", "Repeat the same mistake"), 0, "reasoning")
        )
        return ReadingPractice("read_${index}_${level.lowercase()}", level, "${topic.titleEn} • $level", en, ar, q)
    }
}
