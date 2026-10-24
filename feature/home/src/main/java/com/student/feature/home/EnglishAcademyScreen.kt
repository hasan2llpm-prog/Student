package com.student.feature.home

import android.content.Context
import android.content.Intent
import android.app.Activity
import android.speech.RecognizerIntent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import com.student.core.data.DailyGrammarItem
import com.student.core.data.DailyVerbItem
import com.student.core.data.LearningProgressState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.absoluteValue


private fun studentLearningDate(): LocalDate =
    ZonedDateTime.now(ZoneId.of("Asia/Baghdad")).minusHours(8).toLocalDate()

private fun millisUntilNextLearningRefresh(): Long {
    val zone = ZoneId.of("Asia/Baghdad")
    val now = ZonedDateTime.now(zone)
    var next = now.toLocalDate().atTime(8, 0).atZone(zone)
    if (!next.isAfter(now)) next = next.plusDays(1)
    return java.time.Duration.between(now, next).toMillis().coerceAtLeast(1000L)
}

@Composable
fun EnglishAcademyScreen(api: SupabaseApi, session: StudentSession, initialSection: String = "hub") {
    var section by remember(initialSection) { mutableStateOf(initialSection) }
    var dailyRefreshTick by remember { mutableIntStateOf(0) }
    var featureControls by remember { mutableStateOf<Map<String,Boolean>>(emptyMap()) }
    LaunchedEffect(session.userId) {
        withContext(Dispatchers.IO) { api.v14FeatureControls(session) }.onSuccess { featureControls = it }
    }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(millisUntilNextLearningRefresh() + 1200L)
            dailyRefreshTick++
        }
    }
    if (section == "hub") EnglishLearningHub(featureControls) { section = it }
    else {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { section = "hub" }) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                Text(sectionTitle(section), fontWeight = FontWeight.Black, fontSize = 20.sp, color = StudentText)
            }
            HorizontalDivider(color = StudentBorder)
            Box(Modifier.fillMaxSize()) {
                key(dailyRefreshTick) {
                when (section) {
                    "vocabulary" -> VocabularySection(api, session)
                    "parts" -> LessonSection(api, session, "parts", "Parts of Speech • Relations • Functions", EnglishSeedContent.posLessons)
                    "verbs" -> VerbsSection(api, session)
                    "grammar" -> GrammarLibrarySection(api, session)
                    "reading" -> ReadingSection(api, session)
                    "listening" -> ListeningSection(api, session)
                    "pronunciation" -> PronunciationSection(api, session)
                    "skills" -> SkillsSection(api, session)
                    "phrasal" -> SimpleDailySection(api, session, "Phrasal Verbs", listOf(
                        "look after — يعتني بـ","find out — يكتشف / يعرف","give up — يستسلم","turn on — يشغّل","pick up — يلتقط",
                        "carry on — يواصل","come across — يصادف","get along — ينسجم","get back — يعود","grow up — يكبر",
                        "look for — يبحث عن","look forward to — يتطلع إلى","put off — يؤجل","run out of — ينفد منه","set up — يؤسس",
                        "take off — يقلع / يخلع","work out — يجد حلاً / يتمرن","bring up — يطرح موضوعاً","call off — يلغي","check in — يسجل الوصول",
                        "fill in — يملأ نموذجاً","go on — يستمر","hold on — ينتظر","make up — يختلق / يتصالح","turn down — يرفض / يخفض"
                    ))
                    "idioms" -> SimpleDailySection(api, session, "Idioms & Expressions", listOf(
                        "piece of cake — سهل جداً","break the ice — يكسر حاجز الصمت","once in a blue moon — نادراً جداً","under the weather — متوعك","keep an eye on — يراقب",
                        "hit the books — يدرس بجد","cost an arm and a leg — غالي جداً","better late than never — أن تأتي متأخراً خير من ألا تأتي","on the same page — متفقون","call it a day — ينهي العمل لليوم",
                        "get the ball rolling — يبدأ العمل","in hot water — في مشكلة","miss the boat — يفوّت الفرصة","no pain no gain — لا نجاح بلا تعب","speak of the devil — ذكرنا الشخص فظهر",
                        "the best of both worlds — يجمع أفضل ميزتين","time flies — الوقت يمر بسرعة","a blessing in disguise — خير جاء في صورة مشكلة","bite the bullet — يواجه أمراً صعباً","go the extra mile — يبذل جهداً إضافياً",
                        "learn the ropes — يتعلم أساسيات العمل","out of the blue — بشكل مفاجئ","pull yourself together — تمالك نفسك","see eye to eye — يتفق تماماً","take it easy — خذ الأمور ببساطة"
                    ))
                    "spelling" -> SpellingSection(api, session)
                    "writing" -> WritingSection(api, session)
                    "speaking" -> SpeakingSection(api, session)
                    "progress" -> EnglishProgressSection(api, session)
                    "daily" -> DailyChallenge()
                    "cefr" -> CefrPlacementSection()
                    else -> EnglishLearningHub(featureControls) { section = it }
                }
                }
            }
        }
    }
}

private fun sectionTitle(key: String) = when(key) {
    "vocabulary" -> "تعلم المفردات"
    "parts" -> "Parts of Speech"
    "verbs" -> "الأفعال"
    "grammar" -> "الأزمنة والقواعد"
    "reading" -> "Reading"
    "listening" -> "Listening"
    "pronunciation" -> "Pronunciation"
    "skills" -> "مهارات اللغة"
    "phrasal" -> "Phrasal Verbs"
    "idioms" -> "Idioms"
    "spelling" -> "Spelling"
    "writing" -> "Writing"
    "speaking" -> "Speaking"
    "progress" -> "تقدمي"
    "daily" -> "Daily Challenge"
    "cefr" -> "CEFR & تحديد المستوى"
    else -> "Learn English"
}

@Composable
private fun EnglishLearningHub(featureControls: Map<String,Boolean>, onOpen: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    val cards = listOf(
        Triple("cefr","CEFR & Placement Test","حدد مستواك من A1 إلى C2 وتابع تقدمك"),
        Triple("vocabulary","تعلم المفردات","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("parts","Parts of Speech","الأنواع والعلاقات والوظائف"),
        Triple("verbs","Regular & Irregular Verbs","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("grammar","Grammar & Tenses","شرح عربي + English • بحث • يتجدد يومياً الساعة 8"),
        Triple("reading","Reading","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("listening","Listening","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("pronunciation","Pronunciation","نطق أمريكي وبريطاني"),
        Triple("phrasal","Phrasal Verbs","أفعال مركبة شائعة"),
        Triple("idioms","Idioms & Expressions","تعبيرات مستخدمة فعلياً"),
        Triple("spelling","Spelling","اسمع واكتب وصحح فوراً"),
        Triple("writing","Writing","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("speaking","Speaking","تتجدد يومياً الساعة 8:00 صباحاً"),
        Triple("progress","تقدمي","راجع إنجازك والكلمات المحفوظة"),
        Triple("daily","Daily Challenge","اختبار يومي مختلط")
    ).filter { (key,_,_) -> featureControls[key] != false }
    val visibleCards = cards.filter { query.isBlank() || it.second.contains(query, true) || it.third.contains(query, true) }
    LazyColumn(Modifier.fillMaxSize().background(Color(0xFFF5F7FA)), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Surface(shape = RoundedCornerShape(24.dp), color = Color(0xFF111827), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("English Learning Path", color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Black)
                    Text("تعلم يومي تلقائي • مراجعة متباعدة • اختبارات فورية", color = Color(0xFFD1D5DB))
                }
            }
        }
        item {
            OutlinedTextField(query, { query = it.take(60) }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(18.dp), leadingIcon = { Icon(Icons.Rounded.Search, "بحث") }, placeholder = { Text("ابحث عن درس أو مهارة") })
        }
        items(visibleCards) { (key,title,sub) ->
            StudentOutlinedCard(Modifier.fillMaxWidth().clickable { onOpen(key) }) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(15.dp), color = StudentSoft, modifier = Modifier.size(48.dp)) {
                        Box(contentAlignment = Alignment.Center) { Icon(iconFor(key), null, tint = StudentBlue) }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Black, color = StudentText); Text(sub, color = StudentMuted, fontSize = 12.sp) }
                    Icon(Icons.Rounded.ChevronRight, null, tint = StudentMuted)
                }
            }
        }
    }
}

private fun iconFor(key:String) = when(key) {
    "cefr" -> Icons.Rounded.TrendingUp
    "vocabulary" -> Icons.Rounded.MenuBook
    "parts" -> Icons.Rounded.AccountTree
    "verbs" -> Icons.Rounded.SyncAlt
    "grammar" -> Icons.Rounded.Spellcheck
    "reading" -> Icons.Rounded.Article
    "listening" -> Icons.Rounded.Headphones
    "pronunciation" -> Icons.Rounded.RecordVoiceOver
    "phrasal" -> Icons.Rounded.Hub
    "idioms" -> Icons.Rounded.Lightbulb
    "spelling" -> Icons.Rounded.EditNote
    "writing" -> Icons.Rounded.Draw
    "speaking" -> Icons.Rounded.Mic
    "progress" -> Icons.Rounded.Insights
    else -> Icons.Rounded.EmojiEvents
}


private data class LearningProgressUi(
    val sequenceIndex:Int=0,
    val completed:Boolean=false,
    val loading:Boolean=true,
    val message:String?=null,
    val completedUnits:Int=0,
    val totalUnits:Int=0,
    val completedItems:Int=0,
    val totalItems:Int=0,
    val progressPercent:Double=0.0
)

@Composable
private fun rememberLearningProgress(api: SupabaseApi, session: StudentSession, sectionKey: String): Pair<LearningProgressUi, () -> Unit> {
    val scope = rememberCoroutineScope()
    var state by remember(session.userId, sectionKey) { mutableStateOf(LearningProgressUi()) }
    fun reload() {
        scope.launch {
            val result = withContext(Dispatchers.IO) { api.learningProgress(session, sectionKey) }
            state = result.fold(
                onSuccess = { LearningProgressUi(
                    sequenceIndex = it.sequenceIndex,
                    completed = it.completedForCurrentSlot,
                    loading = false,
                    message = null,
                    completedUnits = it.completedUnits,
                    totalUnits = it.totalUnits,
                    completedItems = it.completedItems,
                    totalItems = it.totalItems,
                    progressPercent = it.progressPercent
                ) },
                onFailure = { state.copy(loading=false, message=it.message) }
            )
        }
    }
    LaunchedEffect(session.userId, sectionKey) { reload() }
    val complete: () -> Unit = {
        if (!state.completed && !state.loading) scope.launch {
            state = state.copy(loading=true, message=null)
            val result = withContext(Dispatchers.IO) { api.completeLearningSlot(session, sectionKey, state.sequenceIndex) }
            state = result.fold(
                onSuccess = { LearningProgressUi(
                    sequenceIndex = it.sequenceIndex,
                    completed = false,
                    loading = false,
                    message = "تم إكمال المحتوى وفتح المحتوى التالي مباشرة.",
                    completedUnits = it.completedUnits,
                    totalUnits = it.totalUnits,
                    completedItems = it.completedItems,
                    totalItems = it.totalItems,
                    progressPercent = it.progressPercent
                ) },
                onFailure = { state.copy(loading=false, message=it.message) }
            )
        }
    }
    return state to complete
}

@Composable
private fun LearningProgressBanner(state: LearningProgressUi, onComplete: () -> Unit) {
    StudentOutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("تقدمك", fontWeight = FontWeight.Black, color = StudentText)
                    Text("المحتوى ${state.sequenceIndex + 1}", color = StudentMuted, fontSize = 12.sp)
                }
                Text("${state.progressPercent.toInt()}%", fontWeight = FontWeight.Black, fontSize = 22.sp, color = StudentBlue)
            }
            LinearProgressIndicator(
                progress = { (state.progressPercent / 100.0).toFloat().coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(7.dp),
                trackColor = StudentSoft
            )
            val completedLabel = when {
                state.totalItems > 0 -> "${state.completedItems} / ${state.totalItems}"
                state.totalUnits > 0 -> "${state.completedUnits} / ${state.totalUnits}"
                else -> "${state.completedUnits} مكتمل"
            }
            Text(completedLabel, color = StudentMuted, fontSize = 12.sp)
            Text("بعد إكمال المحتوى يمكنك الانتقال للمحتوى التالي فوراً بدون انتظار اليوم التالي.", color = StudentMuted, fontSize = 12.sp)
            Button(
                onClick = onComplete,
                enabled = !state.loading && state.progressPercent < 100.0,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(if (state.progressPercent >= 100.0) Icons.Rounded.EmojiEvents else Icons.Rounded.DoneAll, null)
                Spacer(Modifier.width(6.dp))
                Text(
                    when {
                        state.loading -> "جارٍ الحفظ..."
                        state.progressPercent >= 100.0 -> "اكتمل القسم 100%"
                        else -> "أكملت هذا المحتوى • افتح التالي"
                    }
                )
            }
            state.message?.let { Text(it, color = Color(0xFF16834A), fontSize = 12.sp, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun VocabularySection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "vocabulary")
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_english", Context.MODE_PRIVATE) }
    val speech = rememberStudentSpeechController()
    val scope = rememberCoroutineScope()
    var today by remember(session.userId, learningProgress.sequenceIndex) { mutableStateOf<List<EnglishWord>>(emptyList()) }
    var loadingWords by remember(session.userId, learningProgress.sequenceIndex) { mutableStateOf(true) }
    var loadError by remember(session.userId, learningProgress.sequenceIndex) { mutableStateOf<String?>(null) }
    var retryTick by remember { mutableIntStateOf(0) }
    var reminderRevision by remember { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<String?>(null) }

    // Server-authoritative batch: the same sequence index always maps to the same
    // 20 vocabulary rows. Reopening Student never changes the batch.
    LaunchedEffect(session.userId, learningProgress.sequenceIndex, retryTick) {
        if (learningProgress.loading) return@LaunchedEffect
        loadingWords = true
        loadError = null
        val result = withContext(Dispatchers.IO) {
            api.vocabularyBatch(session, learningProgress.sequenceIndex)
        }
        result.onSuccess { rows ->
            today = rows.map { row ->
                EnglishWord(
                    id = row.id,
                    word = row.word,
                    meaningAr = row.meaningAr,
                    level = row.level,
                    example = "",
                    exampleAr = "",
                    partOfSpeech = row.partOfSpeech,
                    category = row.category
                )
            }
            if (today.size != 20) loadError = "تعذر تحميل دفعة المفردات كاملة (20 كلمة)."
        }.onFailure {
            today = emptyList()
            loadError = "تعذر تحميل مفرداتك الحالية. حاول مرة أخرى."
        }
        loadingWords = false
    }

    fun reviewKey(w: EnglishWord): String = "review_word_${w.word.trim().lowercase()}"
    fun isSaved(w: EnglishWord): Boolean {
        reminderRevision
        return prefs.getBoolean(reviewKey(w), false) || prefs.getBoolean("review_${w.id}", false)
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            Column(Modifier.fillMaxWidth().padding(horizontal = 2.dp, vertical = 4.dp)) {
                Text("مفرداتك — 20 كلمة", fontSize = 22.sp, fontWeight = FontWeight.Black)
                Text("تبقى نفس الكلمات حتى تكملها. بعد الإكمال تفتح لك 20 كلمة جديدة مباشرة.", color = StudentMuted, fontSize = 12.sp)
                message?.let { Text(it, color = Color(0xFF16834A), fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            }
        }
        if (loadingWords) {
            item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        }
        loadError?.let { error ->
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(error, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        Button(onClick = { retryTick++ }) { Text("إعادة المحاولة") }
                    }
                }
            }
        }
        items(today, key = { it.id.ifBlank { it.word } }) { w ->
            val saved = isSaved(w)
            Card(Modifier.fillMaxWidth().heightIn(min = 178.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)) {
                Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                        Surface(shape = androidx.compose.foundation.shape.CircleShape, color = StudentSoft, modifier = Modifier.size(58.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text(w.word.take(1).uppercase(), color = StudentBlue, fontSize = 24.sp, fontWeight = FontWeight.Black) }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(w.word, fontSize = 23.sp, fontWeight = FontWeight.Black)
                            Text(w.meaningAr, color = StudentBlue, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            val category = w.primaryVocabularyCategory()
                            Text("${vocabularyCategoryEnglish(category)} • ${vocabularyCategoryArabic(category)}", color = StudentMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                        TextButton(onClick = {
                        prefs.edit().putBoolean(reviewKey(w), true).putBoolean("review_${w.id}", true).apply()
                        reminderRevision++
                        scope.launch { withContext(Dispatchers.IO) { api.rememberEnglishWord(session, w.word) } }
                        message = "تمت إضافة ${w.word} إلى المراجعة والمحفوظات."
                        }) { Icon(if (saved) Icons.Rounded.CheckCircle else Icons.Rounded.NotificationsActive, null); Spacer(Modifier.width(3.dp)); Text(if (saved) "تم" else "ذكّرني", fontSize = 11.sp) }
                    }
                    if (!saved) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(Modifier.weight(1f).clickable { speech.speak(w.word, "american", "normal") }, shape = RoundedCornerShape(14.dp), color = Color(0xFFEAF8F5)) {
                                Column(Modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text("American", color = StudentTeal, fontWeight = FontWeight.Bold, fontSize = 12.sp); Text("اضغط للنطق", color = StudentMuted, fontSize = 10.sp) }
                            }
                            Surface(Modifier.weight(1f).clickable { speech.speak(w.word, "british", "normal") }, shape = RoundedCornerShape(14.dp), color = Color(0xFFEAF0FA)) {
                                Column(Modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text("British", color = StudentBlue, fontWeight = FontWeight.Bold, fontSize = 12.sp); Text("اضغط للنطق", color = StudentMuted, fontSize = 10.sp) }
                            }
                        }
                    } else {
                        Text("محفوظة للمراجعة اليومية", color = Color(0xFF16834A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        if (!loadingWords && loadError == null && today.isEmpty()) item { MasteryModeCard("المفردات") }
    }
}

@Composable
private fun VocabularyQuiz(words: List<EnglishWord>, onClose: () -> Unit, onNextBatch: () -> Unit) {
    var index by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    var feedback by remember { mutableStateOf<String?>(null) }

    if (index >= words.size) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            StudentOutlinedCard(Modifier.padding(20.dp)) {
                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("النتيجة $score / ${words.size}", fontSize = 24.sp, fontWeight = FontWeight.Black)
                    Text("انتهى الاختبار. الكلمات المحفوظة عبر «ذكرني بها لاحقاً» ستدخل في المراجعة اليومية.", color = StudentMuted)
                    Button(onClick = onNextBatch, modifier = Modifier.fillMaxWidth()) { Text("انتقل إلى 20 كلمة إضافية") }
                    OutlinedButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("العودة للكلمات") }
                }
            }
        }
        return
    }

    val w = words[index]
    val meaningMode = index % 2 == 0
    val wordPool = (words.filter { it.id != w.id }.map { it.word }.distinct().shuffled().take(3) + w.word).shuffled()
    val meaningPool = (words.filter { it.id != w.id }.map { it.meaningAr }.distinct().shuffled().take(3) + w.meaningAr).shuffled()
    val question = if (meaningMode) "اختر المعنى العربي الصحيح للكلمة: ${w.word}" else "اختر الكلمة الإنجليزية التي تعني: ${w.meaningAr}"
    val options = if (meaningMode) meaningPool else wordPool
    val correct = if (meaningMode) w.meaningAr else w.word

    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        StudentOutlinedCard(Modifier.padding(16.dp).fillMaxWidth()) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("${index + 1} / ${words.size}", color = StudentMuted)
                Text(question, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("${vocabularyCategoryArabic(w.primaryVocabularyCategory())} • ${w.level}", color = StudentBlue, fontWeight = FontWeight.Bold)
                options.forEach { option ->
                    OutlinedButton(
                        onClick = {
                            if (feedback == null) {
                                val ok = option == correct
                                if (ok) score++
                                feedback = if (ok) "إجابة صحيحة" else "الإجابة الصحيحة: $correct"
                            }
                        },
                        enabled = feedback == null,
                        modifier = Modifier.fillMaxWidth()
                    ) { Text(option) }
                }
                feedback?.let {
                    Text(it, color = if (it.startsWith("إجابة صحيحة")) Color(0xFF16834A) else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                    Button(onClick = { index++; feedback = null }, modifier = Modifier.fillMaxWidth()) { Text("التالي") }
                }
                TextButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("إنهاء الاختبار") }
            }
        }
    }
}

@Composable
private fun VerbsSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "verbs")
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_english_daily", Context.MODE_PRIVATE) }
    val speech = rememberStudentSpeechController()
    val day = learningProgress.sequenceIndex
    val dayKey = "sequence-$day"
    var remote by remember(dayKey) { mutableStateOf<List<DailyVerbItem>>(emptyList()) }

    LaunchedEffect(session.userId, dayKey) {
        withContext(Dispatchers.IO) { api.verbsBatch(session, day, 10) }
            .onSuccess { if (it.isNotEmpty()) remote = it }
    }

    val fallback = remember(dayKey) {
        val irregularPool = EnglishSeedContent.words.filter { it.irregular && !it.past.isNullOrBlank() && !it.participle.isNullOrBlank() }
        val regularPool = listOf(
            Triple("work — worked — worked", "يعمل", "I worked yesterday. — عملتُ أمس."),
            Triple("play — played — played", "يلعب", "She played football. — لعبت كرة القدم."),
            Triple("study — studied — studied", "يدرس", "We studied English. — درسنا الإنجليزية."),
            Triple("open — opened — opened", "يفتح", "He opened the door. — فتح الباب."),
            Triple("watch — watched — watched", "يشاهد", "They watched a film. — شاهدوا فيلماً."),
            Triple("clean — cleaned — cleaned", "ينظف", "I cleaned my room. — نظفت غرفتي."),
            Triple("visit — visited — visited", "يزور", "We visited our teacher. — زرنا مدرسنا."),
            Triple("help — helped — helped", "يساعد", "She helped me. — ساعدتني."),
            Triple("start — started — started", "يبدأ", "The class started early. — بدأ الدرس مبكراً."),
            Triple("finish — finished — finished", "ينهي", "I finished my homework. — أنهيت واجبي."),
            Triple("call — called — called", "يتصل", "He called his friend. — اتصل بصديقه."),
            Triple("need — needed — needed", "يحتاج", "They needed more time. — احتاجوا وقتاً أكثر."),
            Triple("change — changed — changed", "يغيّر", "We changed the plan. — غيّرنا الخطة."),
            Triple("learn — learned — learned", "يتعلم", "I learned a new word. — تعلمت كلمة جديدة."),
            Triple("answer — answered — answered", "يجيب", "She answered correctly. — أجابت بشكل صحيح.")
        )
        val iRows = if (irregularPool.isEmpty()) emptyList() else (0 until minOf(5, irregularPool.size)).map { idx ->
            val w = irregularPool[(day * 5 + idx) % irregularPool.size]
            DailyVerbItem(w.id, w.word, w.past.orEmpty(), w.participle.orEmpty(), w.meaningAr, w.example, w.exampleAr, true, w.level)
        }
        val rRows = (0 until minOf(5, regularPool.size)).map { idx ->
            val v = regularPool[(day * 5 + idx) % regularPool.size]
            val forms = v.first.split(" — ")
            DailyVerbItem("regular-$day-$idx", forms.getOrElse(0){""}, forms.getOrElse(1){forms.getOrElse(0){""}}, forms.getOrElse(2){forms.getOrElse(1){""}}, v.second, v.third.substringBefore(" —"), v.third.substringAfter(" — ", ""), false, "A1")
        }
        iRows + rRows
    }

    val verbs = if (remote.isNotEmpty()) remote else fallback
    val irregular = verbs.filter { it.irregular }.take(5)
    val regular = verbs.filterNot { it.irregular }.take(5)

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            Text("الأفعال", fontSize = 22.sp, fontWeight = FontWeight.Black)
            Text("أكمل المجموعة لفتح المجموعة التالية مباشرة. احفظ الصعب منها للمراجعة.", color = StudentMuted)
        }
        if (irregular.isNotEmpty()) item { Text("الأفعال الشاذة", fontSize = 19.sp, fontWeight = FontWeight.Black) }
        items(irregular, key = { it.id }) { v ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(v.baseForm, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("${v.pastForm} • ${v.participle} — ${v.meaningAr}", color = StudentMuted)
                    if (v.exampleEn.isNotBlank()) Text(v.exampleEn, fontWeight = FontWeight.Bold)
                    if (v.exampleAr.isNotBlank()) Text(v.exampleAr, color = StudentMuted)
                    Row {
                        IconButton(onClick = { speech.speak("${v.baseForm}, ${v.pastForm}, ${v.participle}", "american", "normal") }) { Icon(Icons.Rounded.VolumeUp, "نطق") }
                        TextButton(onClick = {
                            prefs.edit().putBoolean("verb_review_${v.id}", true).apply()
                            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { api.rememberEnglishWord(session, v.baseForm) }
                            android.widget.Toast.makeText(context, "تمت إضافة الفعل إلى المراجعة والمحفوظات", android.widget.Toast.LENGTH_SHORT).show()
                        }) { Text("ذكرني لاحقاً") }
                    }
                }
            }
        }
        if (regular.isNotEmpty()) item { Text("الأفعال القياسية", fontSize = 19.sp, fontWeight = FontWeight.Black) }
        items(regular, key = { it.id }) { v ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("${v.baseForm} — ${v.pastForm} — ${v.participle}", fontWeight = FontWeight.Bold)
                    Text(v.meaningAr, color = StudentMuted)
                    if (v.exampleEn.isNotBlank()) Text(v.exampleEn)
                    if (v.exampleAr.isNotBlank()) Text(v.exampleAr, color = StudentMuted)
                    Row {
                        IconButton(onClick = { speech.speak(v.baseForm, "american", "normal") }) { Icon(Icons.Rounded.VolumeUp, "نطق") }
                        TextButton(onClick = {
                            prefs.edit().putBoolean("verb_review_${v.id}", true).apply()
                            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { api.rememberEnglishWord(session, v.baseForm) }
                            android.widget.Toast.makeText(context, "تمت إضافة الفعل إلى المراجعة والمحفوظات", android.widget.Toast.LENGTH_SHORT).show()
                        }) { Text("ذكرني لاحقاً") }
                    }
                }
            }
        }
    }
}

@Composable
private fun GrammarLibrarySection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "grammar")
    val context = LocalContext.current
    val speech = rememberStudentSpeechController()
    val lessons = remember { loadGrammar300(context) }
    var query by remember { mutableStateOf("") }
    var selectedLesson by remember { mutableStateOf<GrammarLesson?>(null) }
    var answer by remember { mutableStateOf<Int?>(null) }
    val day = learningProgress.sequenceIndex

    val filtered = remember(query, lessons) {
        val q = query.trim().lowercase()
        if (q.isBlank()) lessons.distinctBy { it.topicKey.ifBlank { it.titleEn.lowercase() } }
        else lessons.filter { lesson ->
            lesson.titleEn.lowercase().contains(q) ||
                lesson.titleAr.contains(query.trim(), true) ||
                lesson.lessonTitleEn.lowercase().contains(q) ||
                lesson.lessonTitleAr.contains(query.trim(), true) ||
                lesson.level.lowercase() == q ||
                lesson.keywords.any { it.lowercase().contains(q) }
        }.distinctBy { it.topicKey.ifBlank { it.titleEn.lowercase() } }
    }
    val todayLessons = remember(day, lessons) {
        if (lessons.isEmpty()) emptyList() else {
            val unique = lessons.distinctBy { it.topicKey.ifBlank { it.titleEn.lowercase() } }
            (0 until minOf(3, unique.size)).map { offset -> unique[Math.floorMod(day * 3 + offset, unique.size)] }
        }
    }

    selectedLesson?.let { lesson ->
        BackHandler { selectedLesson = null; answer = null }
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(14.dp, 10.dp, 14.dp, 34.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { selectedLesson = null; answer = null }) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                    Column(Modifier.weight(1f)) {
                        Text(lesson.titleEn, fontSize = 23.sp, fontWeight = FontWeight.Black)
                        Text(lesson.titleAr, color = StudentBlue, fontWeight = FontWeight.Bold)
                    }
                    AssistChip(onClick = {}, label = { Text(lesson.level) })
                }
                TextButton(onClick = {
                    val key = lesson.topicKey.ifBlank { lesson.id }
                    context.getSharedPreferences("student_grammar_review", Context.MODE_PRIVATE).edit().putBoolean("grammar_review_$key", true).apply()
                    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                        api.saveItem(session, "grammar", key, lesson.titleAr.ifBlank { lesson.titleEn }, lesson.titleEn, "english_grammar", "english/grammar")
                    }
                    android.widget.Toast.makeText(context, "تمت إضافة القاعدة إلى المراجعة والمحفوظات", android.widget.Toast.LENGTH_SHORT).show()
                }) { Icon(Icons.Rounded.NotificationsActive, null); Spacer(Modifier.width(6.dp)); Text("ذكرني لاحقاً") }
            }
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Explanation in English", fontWeight = FontWeight.Black, color = StudentBlue)
                        Text(lesson.explanationEn, lineHeight = 24.sp)
                        OutlinedButton(onClick = { speech.speak(lesson.explanationEn, "british", "normal") }, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Rounded.VolumeUp, null); Spacer(Modifier.width(6.dp)); Text("Listen to English explanation")
                        }
                    }
                }
            }
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("الشرح بالعربية", fontWeight = FontWeight.Black, color = StudentBlue)
                        Text(lesson.explanationAr, lineHeight = 25.sp)
                    }
                }
            }
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Form • الصيغة", fontWeight = FontWeight.Black)
                        Text(lesson.form, color = StudentBlue, fontWeight = FontWeight.Bold)
                        if (lesson.commonMistakes.isNotEmpty()) {
                            HorizontalDivider(color = StudentBorder)
                            Text("Common mistakes • الأخطاء الشائعة", fontWeight = FontWeight.Black)
                            lesson.commonMistakes.forEach { Text("• $it", color = StudentMuted) }
                        }
                    }
                }
            }
            if (lesson.examples.isNotEmpty()) {
                item { Text("Examples • أمثلة", fontSize = 19.sp, fontWeight = FontWeight.Black) }
                items(lesson.examples) { ex ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(ex.en, Modifier.weight(1f), fontWeight = FontWeight.Bold)
                                IconButton(onClick = { speech.speak(ex.en, "american", "normal") }) { Icon(Icons.Rounded.VolumeUp, "نطق") }
                            }
                            if (ex.ar.isNotBlank() && !ex.ar.startsWith("ترجمة المثال:")) Text(ex.ar, color = StudentMuted)
                        }
                    }
                }
            }
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text("Practice • تدريب", fontWeight = FontWeight.Black)
                        Text(lesson.question)
                        lesson.options.forEachIndexed { index, option ->
                            OutlinedButton(onClick = { answer = index }, modifier = Modifier.fillMaxWidth()) { Text(option) }
                        }
                        answer?.let { choice ->
                            Text(
                                if (choice == lesson.correctIndex) "✓ Correct • صحيح" else "✗ Try again • حاول مرة أخرى",
                                color = if (choice == lesson.correctIndex) Color(0xFF16834A) else MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp, 10.dp, 14.dp, 34.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                leadingIcon = { Icon(Icons.Rounded.Search, "بحث") },
                trailingIcon = { if (query.isNotBlank()) IconButton(onClick = { query = "" }) { Icon(Icons.Rounded.Close, "مسح") } },
                placeholder = { Text("ابحث عن قاعدة بالعربي أو English") },
                shape = RoundedCornerShape(22.dp)
            )
        }
        if (query.isBlank()) {
            item {
                Text("قواعد اليوم", fontSize = 23.sp, fontWeight = FontWeight.Black)
                Text("تتجدد يومياً الساعة 8:00 صباحاً", color = StudentMuted)
            }
            items(todayLessons, key = { "today_${it.id}" }) { lesson -> GrammarLessonRow(lesson) { selectedLesson = lesson; answer = null } }
            item { Text("كل القواعد", fontSize = 20.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 6.dp)) }
        } else {
            item { Text("نتائج البحث — ${filtered.size}", fontWeight = FontWeight.Black) }
        }
        items(filtered, key = { it.id }) { lesson -> GrammarLessonRow(lesson) { selectedLesson = lesson; answer = null } }
        if (filtered.isEmpty()) item { Text("لا توجد قاعدة مطابقة للبحث.", color = StudentMuted) }
    }
}

@Composable
private fun GrammarLessonRow(lesson: GrammarLesson, onOpen: () -> Unit) {
    StudentOutlinedCard(Modifier.fillMaxWidth().clickable(onClick = onOpen)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(lesson.titleEn, fontWeight = FontWeight.Black)
                Text(lesson.titleAr, color = StudentBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(lesson.lessonTitleAr.substringAfter(": ", lesson.lessonTitleAr), color = StudentMuted, fontSize = 11.sp, maxLines = 1)
            }
            Text(lesson.level, color = StudentBlue, fontWeight = FontWeight.Black)
            Spacer(Modifier.width(5.dp)); Icon(Icons.Rounded.ChevronRight, null, tint = StudentMuted)
        }
    }
}

@Composable
private fun LessonSection(api: SupabaseApi, session: StudentSession, sectionKey: String, title: String, lessons: List<EnglishMiniLesson>) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, sectionKey)
    val day = learningProgress.sequenceIndex
    val lesson = remember(day, lessons) {
        if (lessons.isEmpty()) null else lessons[Math.floorMod(day, lessons.size)]
    }
    var selected by remember(lesson?.id) { mutableStateOf<Int?>(null) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp, 14.dp, 14.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            Text(title, fontSize = 23.sp, fontWeight = FontWeight.Black)
            Text("أكمل الدرس لفتح الدرس التالي مباشرة", color = StudentMuted)
        }
        lesson?.let { current ->
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(current.title, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Text(current.summary, color = StudentMuted)
                        Text(current.example, color = StudentBlue, fontWeight = FontWeight.Bold)
                    }
                }
            }
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text(current.question, fontWeight = FontWeight.Black)
                        current.options.forEachIndexed { index, option ->
                            OutlinedButton(
                                onClick = { selected = index },
                                modifier = Modifier.fillMaxWidth()
                            ) { Text(option) }
                        }
                        selected?.let { choice ->
                            Text(
                                if (choice == current.correctIndex) "✓ صحيح" else "✗ حاول مرة أخرى",
                                color = if (choice == current.correctIndex) Color(0xFF16834A) else MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        } ?: item {
            Text("لا يوجد محتوى متاح حالياً.", color = StudentMuted)
        }
    }
}

@Composable
private fun SkillsSection(api: SupabaseApi, session: StudentSession) {
    var selected by remember { mutableStateOf<String?>(null) }
    selected?.let { key ->
        BackHandler { selected = null }
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { selected = null }) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                Text(when(key){"reading"->"Reading";"listening"->"Listening";"writing"->"Writing";else->"Speaking"}, fontSize = 21.sp, fontWeight = FontWeight.Black)
            }
            HorizontalDivider(color = StudentBorder)
            Box(Modifier.weight(1f)) {
                when(key){
                    "reading" -> ReadingSection(api, session)
                    "listening" -> ListeningSection(api, session)
                    "writing" -> WritingSection(api, session)
                    else -> SpeakingSection(api, session)
                }
            }
        }
        return
    }
    val rows = listOf(
        Triple("reading","Reading","قراءة وفهم"),
        Triple("listening","Listening","استماع وفهم"),
        Triple("writing","Writing","كتابة متدرجة"),
        Triple("speaking","Speaking","محادثة ونطق")
    )
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp, 14.dp, 14.dp, 34.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("مهارات اللغة", fontSize = 23.sp, fontWeight = FontWeight.Black)
            Text("تتجدد يومياً الساعة 8:00 صباحاً", color = StudentMuted)
        }
        items(rows) { (key,title,sub) ->
            StudentOutlinedCard(Modifier.fillMaxWidth().clickable { selected = key }) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(when(key){"reading"->Icons.Rounded.Article;"listening"->Icons.Rounded.Headphones;"writing"->Icons.Rounded.EditNote;else->Icons.Rounded.Mic}, null, tint = StudentBlue)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Black); Text(sub, color = StudentMuted, fontSize = 12.sp) }
                    Icon(Icons.Rounded.ChevronRight, null, tint = StudentMuted)
                }
            }
        }
    }
}

@Composable
private fun ReadingSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "reading")
    val speech = rememberStudentSpeechController()
    val day = learningProgress.sequenceIndex
    val item = remember(day) { EnglishPracticeContent.readingForDay(day) }
    var selected by remember(item.id) { mutableStateOf<Map<Int, Int>>(emptyMap()) }
    var showTranslation by remember(item.id) { mutableStateOf(false) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp, 14.dp, 14.dp, 90.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            Text(item.title, fontSize = 23.sp, fontWeight = FontWeight.Black)
            Text("قطعة اليوم • ${item.level} • من مكتبة 250+ قطعة", color = StudentMuted)
            Spacer(Modifier.height(6.dp))
            Text(item.passageEn, lineHeight = 25.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { speech.speak(item.passageEn, "british", "slow") }, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Rounded.Headphones, null); Spacer(Modifier.width(5.dp)); Text("UK بطيء")
                }
                OutlinedButton(onClick = { speech.speak(item.passageEn, "american", "normal") }, modifier = Modifier.weight(1f)) {
                    Text("US طبيعي")
                }
            }
            TextButton(onClick = { showTranslation = !showTranslation }, modifier = Modifier.fillMaxWidth()) {
                Text(if (showTranslation) "إخفاء الترجمة" else "إظهار الترجمة")
            }
            if (showTranslation) {
                StudentOutlinedCard(Modifier.fillMaxWidth()) { Text(item.passageAr, modifier = Modifier.padding(13.dp), lineHeight = 24.sp) }
            }
            Text("5 أسئلة متدرجة", fontSize = 19.sp, fontWeight = FontWeight.Black)
        }
        items(item.questions.size) { i ->
            val question = item.questions[i]
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("${i + 1}. ${question.prompt}", fontWeight = FontWeight.Bold)
                    Text(
                        when (question.skill) { "direct" -> "فهم مباشر"; "detail" -> "تفاصيل"; "inference" -> "استنتاج"; else -> "تحليل" },
                        color = StudentBlue,
                        fontSize = 11.sp
                    )
                    question.options.forEachIndexed { optionIndex, option ->
                        OutlinedButton(
                            onClick = { selected = selected + (i to optionIndex) },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(option) }
                    }
                    selected[i]?.let { choice ->
                        Text(
                            if (choice == question.correctIndex) "✓ صحيح" else "✗ راجع القطعة وحاول مرة أخرى",
                            color = if (choice == question.correctIndex) Color(0xFF16834A) else MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ListeningSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "listening")
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_english_daily", Context.MODE_PRIVATE) }
    val speech = rememberStudentSpeechController()
    val day = learningProgress.sequenceIndex
    val item = remember(day) { EnglishPracticeContent.listeningForDay(day) }
    var show by remember(item.id) { mutableStateOf(false) }
    var answer by remember(item.id) { mutableStateOf<Int?>(null) }

    Column(
        Modifier.fillMaxSize().verticalScroll(androidx.compose.foundation.rememberScrollState()).padding(16.dp).navigationBarsPadding(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        LearningProgressBanner(learningProgress, completeLearning)
        Text(item.title, fontSize = 23.sp, fontWeight = FontWeight.Black)
        Text("Listening • ${item.level} • من مكتبة 250+ تدريب", color = StudentMuted)
        Text("استمع أولاً من دون قراءة، ثم أظهر النص والترجمة عند الحاجة.", color = StudentMuted)
        Button(onClick = { speech.speak(item.scriptEn, "british", "slow") }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Rounded.Headphones, null); Spacer(Modifier.width(6.dp)); Text("استمع UK ببطء")
        }
        OutlinedButton(onClick = { speech.speak(item.scriptEn, "american", "normal") }, modifier = Modifier.fillMaxWidth()) { Text("استمع US طبيعي") }
        OutlinedButton(onClick = { show = !show }, modifier = Modifier.fillMaxWidth()) { Text(if (show) "إخفاء النص والترجمة" else "إظهار النص والترجمة") }
        if (show) {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(item.scriptEn, fontWeight = FontWeight.Bold)
                    Text(item.scriptAr, color = StudentMuted)
                }
            }
        }
        Text(item.question.prompt, fontWeight = FontWeight.Black)
        item.question.options.forEachIndexed { i, opt ->
            OutlinedButton(onClick = { answer = i }, modifier = Modifier.fillMaxWidth()) { Text(opt) }
        }
        answer?.let {
            Text(
                if (it == item.question.correctIndex) "✓ صحيح — أعد الاستماع بسرعة طبيعية." else "✗ أعد الاستماع وركز على الكلمات الأساسية.",
                color = if (it == item.question.correctIndex) Color(0xFF16834A) else MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold
            )
        }
        TextButton(
            onClick = {
                prefs.edit().putBoolean("listening_review_${item.id}", true).apply()
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                    api.saveItem(session, "listening", item.id, item.title, item.level, "english_listening", "english/listening")
                }
                android.widget.Toast.makeText(context, "تمت إضافة الاستماع إلى المراجعة والمحفوظات", android.widget.Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("ذكرني بهذا الاستماع لاحقاً") }
    }
}

@Composable
private fun PronunciationSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "pronunciation")
    val context=LocalContext.current
    val prefs=remember{context.getSharedPreferences("student_english_daily",Context.MODE_PRIVATE)}
    val speech=rememberStudentSpeechController()
    val day=learningProgress.sequenceIndex
    val groups=listOf(
        listOf("ship / sheep — سفينة / خروف","live / leave — يعيش / يغادر","bit / beat — جزء صغير / يهزم","sit / seat — يجلس / مقعد","fill / feel — يملأ / يشعر"),
        listOf("hat / hot — قبعة / حار","cat / cut — قطة / يقطع","bad / bud — سيئ / برعم","cap / cup — قبعة / كوب","ran / run — ركض / يركض"),
        listOf("fan / van — مروحة / شاحنة","fine / vine — جيد / كرمة","safe / save — آمن / يحفظ","half / have — نصف / يملك","leaf / leave — ورقة / يغادر"),
        listOf("think / sink — يفكر / يغرق","three / tree — ثلاثة / شجرة","then / den — ثم / عرين","they / day — هم / يوم","thin / tin — نحيف / قصدير")
    )
    val pairs=groups[day%groups.size]
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item{Text("النطق",fontSize=23.sp,fontWeight=FontWeight.Black);Text("استمع US وUK وكرر بصوت مرتفع، ثم أكمل المجموعة لفتح التالية.",color=StudentMuted)}
        items(pairs){pair->val spoken=pair.substringBefore(" —").replace("/",",");StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp)){Text(pair,fontWeight=FontWeight.Bold);Row{IconButton(onClick={speech.speak(spoken,"american","slow")}){Icon(Icons.Rounded.VolumeUp,"US")};IconButton(onClick={speech.speak(spoken,"british","slow")}){Icon(Icons.Rounded.RecordVoiceOver,"UK")};TextButton(onClick={prefs.edit().putBoolean("pron_review_${pair.substringBefore(" —")}",true).apply(); kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { api.rememberEnglishWord(session,pair.substringBefore(" /")) }; android.widget.Toast.makeText(context,"تمت إضافة الكلمة إلى المراجعة والمحفوظات",android.widget.Toast.LENGTH_SHORT).show()}){Text("ذكرني")}}}}}
    }
}

@Composable
private fun SimpleDailySection(api: SupabaseApi, session: StudentSession, title: String, itemsList: List<String>) {
    val sectionKey = if (title.startsWith("Phrasal")) "phrasal" else "idioms"
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, sectionKey)
    val speech = rememberStudentSpeechController()
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_english_daily", Context.MODE_PRIVATE) }
    val day = learningProgress.sequenceIndex
    val daily = remember(day, itemsList) {
        if (itemsList.size <= 5) itemsList else List(5) { i -> itemsList[(day * 5 + i) % itemsList.size] }.distinct()
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item { Text(title, fontSize = 23.sp, fontWeight = FontWeight.Black); Text("أكمل المجموعة لفتح المجموعة التالية مباشرة", color = StudentMuted) }
        items(daily) { value ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(value, Modifier.weight(1f), fontWeight = FontWeight.Bold)
                    IconButton(onClick = { speech.speak(value.substringBefore(" —"), "american", "normal") }) { Icon(Icons.Rounded.VolumeUp, "نطق") }
                    TextButton(onClick = {
                        val key = value.substringBefore(" —").trim()
                        prefs.edit().putBoolean("simple_review_${title}_$key", true).apply()
                        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                            api.saveItem(session, "daily", "$title:$key", key, title, "english_daily", "english/hub")
                        }
                        android.widget.Toast.makeText(context,"تمت إضافة العنصر إلى المراجعة والمحفوظات",android.widget.Toast.LENGTH_SHORT).show()
                    }) { Text("ذكرني") }
                }
            }
        }
    }
}

@Composable
private fun SpellingSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "spelling")
    val speech = rememberStudentSpeechController()
    val word = EnglishSeedContent.words[Math.floorMod(learningProgress.sequenceIndex, EnglishSeedContent.words.size)]
    var input by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        LearningProgressBanner(learningProgress, completeLearning)
        Text("اسمع واكتب", fontSize = 23.sp, fontWeight = FontWeight.Black)
        Button(onClick = { speech.speak(word.word, "american", "slow") }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Rounded.VolumeUp, null); Spacer(Modifier.width(6.dp)); Text("اسمع الكلمة")
        }
        OutlinedTextField(input, { input = it.lowercase().filter(Char::isLetter) }, label = { Text("اكتب الكلمة") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { result = if (input.equals(word.word, true)) "✓ صحيح" else "✗ الصحيح: ${word.word}" }, modifier = Modifier.fillMaxWidth()) { Text("تحقق") }
        result?.let { Text(it, color = if (it.startsWith("✓")) Color(0xFF16834A) else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun DailyChallenge() {
    val day=studentLearningDate().dayOfYear
    val pool=EnglishSeedContent.grammarLessons
    val questions=if(pool.isEmpty()) emptyList() else (0 until minOf(5,pool.size)).map{pool[(day*3+it)%pool.size]}
    var score by remember(day){mutableIntStateOf(0)}
    var done by remember(day){mutableStateOf(setOf<String>())}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
        item{Text("تحدي اليوم",fontSize=24.sp,fontWeight=FontWeight.Black);Text("الأسئلة تتغير يومياً وتعود لاحقاً للمراجعة. اقرأ المطلوب بالإنجليزية والعربية.",color=StudentMuted);Text("النتيجة: $score / ${questions.size}",color=StudentBlue,fontWeight=FontWeight.Bold)}
        items(questions){q->StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){Text(q.question,fontWeight=FontWeight.Black);Text("اختر الإجابة الأنسب، ثم اقرأ التصحيح فوراً.",color=StudentMuted,fontSize=12.sp);q.options.forEachIndexed{i,opt->OutlinedButton(onClick={if(q.id !in done){done=done+q.id;if(i==q.correctIndex)score++}},modifier=Modifier.fillMaxWidth()){Text(opt)}};if(q.id in done)Text("الإجابة الصحيحة: ${q.options[q.correctIndex]} — راجع القاعدة وحاول تكوين مثال جديد بنفسك.",color=Color(0xFF16834A),fontWeight=FontWeight.Bold)}}}
    }
}



@Composable
private fun WritingSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "writing")
    val day = learningProgress.sequenceIndex
    val task = remember(day) { EnglishPracticeContent.writingForDay(day) }
    var answer by remember(task.id) { mutableStateOf("") }
    var checked by remember(task.id) { mutableStateOf(false) }
    val sentenceCount = remember(answer) { answer.split(Regex("[.!?]+")) .count { it.trim().isNotBlank() } }
    val wordCount = remember(answer) { answer.trim().split(Regex("\\s+")).count { it.isNotBlank() } }

    LazyColumn(Modifier.fillMaxSize().imePadding().navigationBarsPadding(), contentPadding = PaddingValues(14.dp,14.dp,14.dp,90.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item {
            Text("Writing • ${task.level}", fontSize = 23.sp, fontWeight = FontWeight.Black)
            Text("من مكتبة 250+ تمرين • يتجدد يومياً الساعة 8", color = StudentMuted)
            Text(task.promptEn, color = StudentBlue, fontWeight = FontWeight.Bold)
            Text(task.promptAr, color = StudentMuted)
        }
        item {
            OutlinedTextField(
                value = answer,
                onValueChange = { answer = it.take(5000); checked = false },
                label = { Text("اكتب إجابتك بالإنجليزية") },
                minLines = 8,
                modifier = Modifier.fillMaxWidth()
            )
        }
        item {
            Text("$wordCount كلمة • $sentenceCount جملة • الحد الأدنى ${task.minimumWords}", color = StudentMuted)
            Button(onClick = { checked = true }, enabled = answer.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("فحص سريع") }
        }
        if (checked) item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("مراجعة ذاتية", fontWeight = FontWeight.Black)
                    Text(if (wordCount >= task.minimumWords) "✓ الطول مناسب" else "• أضف تفاصيل حتى تصل إلى ${task.minimumWords} كلمة")
                    Text(if (sentenceCount >= 4) "✓ لديك عدة جمل" else "• أضف جملًا أكثر")
                    Text(if (answer.firstOrNull()?.isUpperCase() == true) "✓ بدأت بحرف كبير" else "• ابدأ الجملة بحرف كبير")
                    Text(if (answer.trim().lastOrNull() in listOf('.', '!', '?')) "✓ علامة نهاية موجودة" else "• أضف علامة نهاية للجملة")
                    task.checklist.forEach { Text("• $it") }
                }
            }
        }
    }
}

@Composable
private fun SpeakingSection(api: SupabaseApi, session: StudentSession) {
    val (learningProgress, completeLearning) = rememberLearningProgress(api, session, "speaking")
    val speech = rememberStudentSpeechController()
    val scope = rememberCoroutineScope()
    val day = learningProgress.sequenceIndex
    val speakingTask = remember(day) { EnglishPracticeContent.speakingForDay(day) }
    val task = speakingTask.promptEn
    val model = speakingTask.model
    var transcript by remember { mutableStateOf("") }
    var confidence by remember { mutableStateOf<Float?>(null) }
    var analysis by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            transcript = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull().orEmpty()
            confidence = result.data?.getFloatArrayExtra(RecognizerIntent.EXTRA_CONFIDENCE_SCORES)?.firstOrNull()?.takeIf { it >= 0f }
            analysis = null
        }
    }
    fun startRecognition() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak English")
        }
        runCatching { launcher.launch(intent) }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { LearningProgressBanner(learningProgress, completeLearning) }
        item { Text("Speaking • ${speakingTask.level}", fontSize = 23.sp, fontWeight = FontWeight.Black); Text("من مكتبة 250+ موقف", color = StudentMuted); Text(task, color = StudentBlue, fontWeight = FontWeight.Bold); Text(speakingTask.promptAr, color = StudentMuted) }
        item { StudentOutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("نموذج مساعد", fontWeight = FontWeight.Black); Text(model)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(onClick = { speech.speak(model, "american", "slow") }) { Text("US بطيء") }; OutlinedButton(onClick = { speech.speak(model, "british", "normal") }) { Text("UK") } }
        } } }
        item { Button(onClick = ::startRecognition, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Rounded.Mic, null); Spacer(Modifier.width(6.dp)); Text("تحدث الآن") } }
        if (transcript.isNotBlank()) item { StudentOutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("ما التقطه Student", fontWeight = FontWeight.Black); Text(transcript)
            confidence?.let { Text("وضوح التعرف التقريبي: ${(it * 100).toInt()}%", color = StudentMuted) }
            Button(enabled = !busy, onClick = { scope.launch { busy = true; val prompt = "Act as an English speaking coach. The learner task is: $task\nSpeech transcript: $transcript\nGive concise feedback in Arabic with: fluency estimate, grammar corrections, better natural phrasing, and 3 words/phrases to practise. Do not claim you heard pronunciation because you only received a transcript."; analysis = withContext(Dispatchers.IO) { api.callStudentAi(session, "speaking_coach", prompt) }.getOrElse { it.message ?: "تعذر تحليل المحاولة." }; busy = false } }, modifier = Modifier.fillMaxWidth()) { Text(if (busy) "جاري التحليل..." else "حلل محاولتي بالذكاء الاصطناعي") }
        } } }
        analysis?.let { a -> item { StudentOutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text("تقييم المدرب", fontWeight = FontWeight.Black); Text(a) } } } }
    }
}

@Composable
private fun CefrPlacementSection() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_cefr", Context.MODE_PRIVATE) }
    var level by remember { mutableStateOf(prefs.getString("level", "غير محدد").orEmpty()) }
    val qs = remember { listOf(
        Triple("I ___ a student.", listOf("am","is","are","be"), 0),
        Triple("She ___ English every day.", listOf("study","studies","studying","studied"), 1),
        Triple("Yesterday we ___ to the library.", listOf("go","went","gone","going"), 1),
        Triple("I have lived here ___ 2020.", listOf("for","since","from","at"), 1),
        Triple("If I had more time, I ___ more.", listOf("read","will read","would read","am reading"), 2),
        Triple("The report ___ before the meeting started.", listOf("completed","had been completed","has completed","was completing"), 1),
        Triple("Hardly ___ the room when the phone rang.", listOf("I left","had I left","I had left","did I leave"), 1),
        Triple("Her argument was both nuanced and ___.", listOf("compelling","compel","compelledly","compulsion"), 0)
    ) }
    var i by remember { mutableIntStateOf(0) }; var score by remember { mutableIntStateOf(0) }; var started by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("CEFR Learning Path", fontSize = 24.sp, fontWeight = FontWeight.Black)
        Text("Pre-A1 → A1 → A2 → B1 → B2 → C1 → C2", color = StudentBlue, fontWeight = FontWeight.Bold)
        Text("مستواك التقديري الحالي: $level", fontWeight = FontWeight.Bold)
        if (!started) {
            Text("اختبار تحديد مستوى أولي قصير. النتيجة تقديرية وليست شهادة CEFR رسمية.", color = StudentMuted)
            Button(onClick = { started = true; i = 0; score = 0 }, modifier = Modifier.fillMaxWidth()) { Text("ابدأ الاختبار") }
        } else if (i < qs.size) {
            val q=qs[i]; Text("${i+1}/${qs.size}  ${q.first}", fontWeight=FontWeight.Black)
            q.second.forEachIndexed { idx,opt -> OutlinedButton(onClick = { if(idx==q.third) score++; i++; if(i>=qs.size){ val final=score; level=when{final<=1->"A1";final<=2->"A2";final<=4->"B1";final<=5->"B2";final<=6->"C1";else->"C2"}; prefs.edit().putString("level",level).apply() } }, modifier=Modifier.fillMaxWidth()){Text(opt)} }
        } else {
            MasteryModeCard("تحديد المستوى $level")
            OutlinedButton(onClick={started=false},modifier=Modifier.fillMaxWidth()){Text("إعادة الاختبار") }
        }
    }
}

@Composable
private fun MasteryModeCard(section: String) {
    StudentOutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("اكتمل محتوى $section", fontWeight = FontWeight.Black, fontSize = 20.sp)
        Text("انتقلت الآن إلى وضع الإتقان: راجع الكلمات الصعبة، اختبر نفسك، وارجع إلى أخطائك السابقة بدل عرض صفحة فارغة.", color = StudentMuted)
        Text("المراجعة الذكية • اختبار شامل • تحديات • أخطاء سابقة • انتقال للمستوى التالي", color = StudentBlue, fontWeight = FontWeight.Bold)
    } }
}

@Composable
private fun EnglishProgressSection(api: SupabaseApi, session: StudentSession) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("student_english", Context.MODE_PRIVATE) }
    val reviewCount = remember { EnglishSeedContent.words.count { prefs.getBoolean("review_${it.id}", false) } }
    val sections = remember { listOf("vocabulary","grammar","reading","listening","writing","speaking","verbs","parts","pronunciation","phrasal","idioms","spelling") }
    var progress by remember(session.userId) { mutableStateOf<Map<String, LearningProgressState>>(emptyMap()) }
    LaunchedEffect(session.userId) {
        val loaded = withContext(Dispatchers.IO) {
            sections.mapNotNull { key -> api.learningProgress(session, key).getOrNull()?.let { key to it } }.toMap()
        }
        progress = loaded
    }
    val completedDays = progress.values.sumOf { it.completedUnits }
    LazyColumn(Modifier.fillMaxSize().imePadding().navigationBarsPadding(), contentPadding = PaddingValues(14.dp,14.dp,14.dp,90.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("تقدمي", fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("ملخص سريع لمسارك الحالي", color = StudentMuted)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StudentOutlinedCard(Modifier.weight(1f)) {
                    Column(Modifier.padding(14.dp)) {
                        Text("$reviewCount", fontSize = 26.sp, fontWeight = FontWeight.Black, color = StudentBlue)
                        Text("كلمات للمراجعة", fontSize = 12.sp, color = StudentMuted)
                    }
                }
                StudentOutlinedCard(Modifier.weight(1f)) {
                    Column(Modifier.padding(14.dp)) {
                        Text("$completedDays", fontSize = 26.sp, fontWeight = FontWeight.Black, color = StudentBlue)
                        Text("وحدات مكتملة", fontSize = 12.sp, color = StudentMuted)
                    }
                }
            }
        }
        items(sections) { key ->
            val p = progress[key]
            val label = sectionTitle(key)
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(label, fontWeight = FontWeight.Bold)
                        Text("${p?.progressPercent?.toInt() ?: 0}%", color = StudentBlue, fontWeight = FontWeight.Black)
                    }
                    LinearProgressIndicator(
                        progress = { ((p?.progressPercent ?: 0.0) / 100.0).toFloat().coerceIn(0f,1f) },
                        modifier = Modifier.fillMaxWidth().height(6.dp),
                        trackColor = StudentSoft
                    )
                    Text(
                        if ((p?.totalItems ?: 0) > 0) "${p?.completedItems ?: 0} / ${p?.totalItems ?: 0}" else "${p?.completedUnits ?: 0} / ${p?.totalUnits ?: 0}",
                        color = StudentMuted, fontSize = 11.sp
                    )
                }
            }
        }
        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("خطة التعلم", fontWeight = FontWeight.Black)
                    Text("1. أكمل المحتوى الحالي في القسم الذي تختاره")
                    Text("2. انتقل مباشرة إلى المحتوى التالي بعد الإكمال")
                    Text("3. راقب النسبة العامة لكل قسم")
                    Text("4. ارجع للمحفوظات للمراجعة")
                    Text("5. استمر بالسرعة التي تناسبك")
                }
            }
        }
    }
}
