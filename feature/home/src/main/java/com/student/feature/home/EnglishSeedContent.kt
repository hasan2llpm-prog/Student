package com.student.feature.home

data class EnglishWord(
    val id: String,
    val word: String,
    val meaningAr: String,
    val level: String,
    val example: String,
    val exampleAr: String,
    val irregular: Boolean = false,
    val past: String? = null,
    val participle: String? = null,
    val partOfSpeech: String = "",
    val category: String = ""
)

data class EnglishMiniLesson(
    val id: String,
    val title: String,
    val summary: String,
    val example: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int
)

/**
 * Starter content is deliberately generic CEFR/core English content.
 * The full Oxford 3000/5000 corpus is loaded from Supabase after a licensed
 * source is imported; the app must never pretend that a fallback list is Oxford.
 */
object EnglishSeedContent {
    val words = listOf(
        EnglishWord("w001","accept","يقبل","A1","I accept your idea.","أنا أقبل فكرتك."),
        EnglishWord("w002","achieve","يحقق","A2","She worked hard to achieve her goal.","عملت بجد لتحقيق هدفها."),
        EnglishWord("w003","advice","نصيحة","A1","Can you give me some advice?","هل يمكنك أن تعطيني نصيحة؟"),
        EnglishWord("w004","allow","يسمح","A2","The teacher allowed us to leave early.","سمح لنا المدرس بالمغادرة مبكراً."),
        EnglishWord("w005","answer","يجيب / إجابة","A1","Please answer the question.","رجاءً أجب عن السؤال."),
        EnglishWord("w006","appear","يظهر","A2","A rainbow appeared after the rain.","ظهر قوس قزح بعد المطر."),
        EnglishWord("w007","arrive","يصل","A1","We arrived at the station on time.","وصلنا إلى المحطة في الوقت المحدد."),
        EnglishWord("w008","avoid","يتجنب","B1","Try to avoid unnecessary mistakes.","حاول تجنب الأخطاء غير الضرورية."),
        EnglishWord("w009","believe","يعتقد","A1","I believe you are right.","أعتقد أنك على حق."),
        EnglishWord("w010","borrow","يستعير","A2","May I borrow your pen?","هل يمكنني استعارة قلمك؟"),
        EnglishWord("w011","choose","يختار","A1","Choose the best answer.","اختر أفضل إجابة."),
        EnglishWord("w012","compare","يقارن","A2","Compare the two pictures.","قارن بين الصورتين."),
        EnglishWord("w013","continue","يستمر","A2","Continue reading the story.","استمر في قراءة القصة."),
        EnglishWord("w014","decide","يقرر","A2","They decided to study together.","قرروا أن يدرسوا معاً."),
        EnglishWord("w015","describe","يصف","A2","Describe your hometown.","صف مدينتك."),
        EnglishWord("w016","develop","يطوّر","B1","Practice helps you develop your skills.","تساعدك الممارسة على تطوير مهاراتك."),
        EnglishWord("w017","discover","يكتشف","A2","Scientists discover new things.","يكتشف العلماء أشياء جديدة."),
        EnglishWord("w018","explain","يشرح","A2","Can you explain this rule?","هل يمكنك شرح هذه القاعدة؟"),
        EnglishWord("w019","improve","يحسّن","A2","Reading can improve your vocabulary.","القراءة يمكن أن تحسن مفرداتك."),
        EnglishWord("w020","include","يتضمن","A2","The course includes weekly tests.","تتضمن الدورة اختبارات أسبوعية."),
        EnglishWord("w021","increase","يزيد","B1","Daily practice increases confidence.","الممارسة اليومية تزيد الثقة."),
        EnglishWord("w022","learn","يتعلم","A1","I want to learn English.","أريد أن أتعلم الإنجليزية."),
        EnglishWord("w023","notice","يلاحظ","A2","Did you notice the difference?","هل لاحظت الفرق؟"),
        EnglishWord("w024","prepare","يحضّر","A2","Prepare for the test tonight.","حضّر للاختبار الليلة."),
        EnglishWord("w025","remember","يتذكر","A1","Remember these five words.","تذكر هذه الكلمات الخمس."),
        EnglishWord("w026","speak","يتحدث","A1","Speak slowly, please.","تحدث ببطء من فضلك.", true, "spoke", "spoken"),
        EnglishWord("w027","write","يكتب","A1","Write a short sentence.","اكتب جملة قصيرة.", true, "wrote", "written"),
        EnglishWord("w028","read","يقرأ","A1","Read the passage aloud.","اقرأ القطعة بصوت عالٍ.", true, "read", "read"),
        EnglishWord("w029","take","يأخذ","A1","Take your book with you.","خذ كتابك معك.", true, "took", "taken"),
        EnglishWord("w030","make","يصنع / يجعل","A1","Make a sentence with this word.","كوّن جملة بهذه الكلمة.", true, "made", "made"),
        EnglishWord("w031","study","يدرس","A1","I study English every day.","أدرس الإنجليزية كل يوم."),
        EnglishWord("w032","practice","يتدرب / ممارسة","A2","Practice pronunciation every day.","تدرّب على النطق كل يوم."),
        EnglishWord("w033","understand","يفهم","A1","I understand the lesson.","أنا أفهم الدرس.", true, "understood", "understood"),
        EnglishWord("w034","build","يبني","A2","Build a strong vocabulary.","ابنِ حصيلة مفردات قوية.", true, "built", "built"),
        EnglishWord("w035","think","يفكر / يعتقد","A1","Think before you answer.","فكر قبل أن تجيب.", true, "thought", "thought"),
        EnglishWord("w036","bring","يجلب","A1","Bring your notebook tomorrow.","أحضر دفترك غداً.", true, "brought", "brought"),
        EnglishWord("w037","keep","يحافظ / يبقي","A1","Keep learning every day.","استمر بالتعلم كل يوم.", true, "kept", "kept"),
        EnglishWord("w038","help","يساعد","A1","This example will help you.","هذا المثال سيساعدك."),
        EnglishWord("w039","listen","يستمع","A1","Listen to the sentence carefully.","استمع إلى الجملة بعناية."),
        EnglishWord("w040","review","يراجع / مراجعة","A2","Review yesterday's words.","راجع كلمات الأمس."),
        EnglishWord("w041","complete","يكمل","A2","Complete the sentence.","أكمل الجملة."),
        EnglishWord("w042","correct","يصحح / صحيح","A1","Choose the correct answer.","اختر الإجابة الصحيحة."),
        EnglishWord("w043","example","مثال","A1","Give me an example.","أعطني مثالاً."),
        EnglishWord("w044","meaning","معنى","A1","What is the meaning of this word?","ما معنى هذه الكلمة؟"),
        EnglishWord("w045","sentence","جملة","A1","Write one sentence.","اكتب جملة واحدة."),
        EnglishWord("w046","question","سؤال","A1","Read the question first.","اقرأ السؤال أولاً."),
        EnglishWord("w047","language","لغة","A1","English is an international language.","الإنجليزية لغة عالمية."),
        EnglishWord("w048","difficult","صعب","A1","This exercise is difficult.","هذا التمرين صعب."),
        EnglishWord("w049","easy","سهل","A1","The first question is easy.","السؤال الأول سهل."),
        EnglishWord("w050","important","مهم","A1","Pronunciation is important.","النطق مهم.")
    )

    val grammarLessons = listOf(
        EnglishMiniLesson("g01","Present Simple","نستخدمه للعادات والحقائق. مع he/she/it نضيف s للفعل.","She studies English every day.","He ___ to university every morning.", listOf("go","goes","going","went"),1),
        EnglishMiniLesson("g02","Present Continuous","لحدث يجري الآن: am/is/are + verb-ing.","They are studying now.","I ___ English now.", listOf("study","am studying","studied","studies"),1),
        EnglishMiniLesson("g03","Past Simple","لحدث انتهى في الماضي. الفعل يكون V2.","We visited Baghdad yesterday.","She ___ the lesson yesterday.", listOf("finish","finishes","finished","finishing"),2),
        EnglishMiniLesson("g04","Future with will","للتوقع أو القرار اللحظي: will + base verb.","I will call you later.","They ___ tomorrow.", listOf("arrive","will arrive","arrived","arriving"),1),
        EnglishMiniLesson("g05","First Conditional","If + present simple, will + base verb.","If you study, you will pass.","If it rains, we ___ home.", listOf("stay","will stay","stayed","staying"),1),
        EnglishMiniLesson("g06","Linking Words","and للإضافة، but للتعارض، because للسبب، so للنتيجة.","I stayed home because I was tired.","I was tired, ___ I went to bed early.", listOf("because","but","so","although"),2)
    )

    val posLessons = listOf(
        EnglishMiniLesson("p01","Noun — الاسم","يسمي شخصاً أو مكاناً أو شيئاً أو فكرة.","student, city, book, freedom","Which word is a noun?", listOf("quickly","beautiful","teacher","write"),2),
        EnglishMiniLesson("p02","Verb — الفعل","يدل على حدث أو حالة.","study, speak, be, know","Which word is a verb?", listOf("happy","speak","slowly","table"),1),
        EnglishMiniLesson("p03","Adjective — الصفة","تصف الاسم.","a difficult question","Which word is an adjective?", listOf("careful","carefully","care","caringly"),0),
        EnglishMiniLesson("p04","Adverb — الظرف","يصف فعلاً أو صفة أو ظرفاً آخر وغالباً ينتهي بـ ly.","She speaks clearly.","Which word is an adverb?", listOf("clear","clearly","clarity","clears"),1),
        EnglishMiniLesson("p05","Subject & Object Functions","الفاعل يقوم بالفعل، والمفعول به يتلقى الفعل.","Ali reads the book: Ali = subject, book = object.","In 'Sara opened the door', what is the object?", listOf("Sara","opened","the door","none"),2)
    )

    val readingPassages = listOf(
        Triple("A New Habit", "Omar wanted to improve his English, so he created a simple daily habit. Every morning he learned five new words and listened to their pronunciation. In the evening, he reviewed the words and wrote one sentence for each word. After several weeks, he noticed that reading became easier and he could speak with more confidence.", listOf("Why did Omar create a daily habit?","How many words did he learn each morning?","What did he do in the evening?","What became easier?","How did he feel when speaking?")),
        Triple("The Library", "Maya visits the library twice a week. She usually chooses short English stories because they introduce useful vocabulary in context. When she finds an unfamiliar word, she first tries to guess its meaning from the sentence. Then she checks a dictionary and saves the word for later review.", listOf("How often does Maya visit the library?","What does she usually choose?","What does she do before using a dictionary?","Why are stories useful?","What happens to new words?"))
    )
}
