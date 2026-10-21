package com.student.feature.home

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class AdminStoreAction(
    val kind: String,
    val id: String,
    val approve: Boolean? = null,
    val status: String? = null,
    val title: String,
    val message: String
)

@Composable
fun AdminOperationsPane(api: SupabaseApi, session: StudentSession, onMessage: (String) -> Unit, initialSection: Int = 0, showTabs: Boolean = true) {
    val scope = rememberCoroutineScope()
    var section by remember(initialSection) { mutableIntStateOf(initialSection.coerceIn(0, 5)) }
    var teachers by remember { mutableStateOf<List<TeacherRequest>>(emptyList()) }
    var ads by remember { mutableStateOf<List<HomeAd>>(emptyList()) }
    var storeOrders by remember { mutableStateOf<List<AdminStoreOrder>>(emptyList()) }
    var diamondRequests by remember { mutableStateOf<List<DiamondPurchaseRequest>>(emptyList()) }
    var agencyApplications by remember { mutableStateOf<List<AgencyApplication>>(emptyList()) }
    var wallets by remember { mutableStateOf<List<AdminWalletRow>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var reviewTeacher by remember { mutableStateOf<Pair<TeacherRequest, Boolean>?>(null) }
    var deleteAd by remember { mutableStateOf<HomeAd?>(null) }
    var storeAction by remember { mutableStateOf<AdminStoreAction?>(null) }
    var note by remember { mutableStateOf("") }
    var storeNote by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            busy = true
            val t = withContext(Dispatchers.IO) { api.adminTeacherRequests(session) }
            val a = withContext(Dispatchers.IO) { api.adminHomeAds(session) }
            t.onSuccess { teachers = it }
            a.onSuccess { ads = it }
            busy = false
        }
    }

    fun refreshStore() {
        scope.launch {
            busy = true
            val o = withContext(Dispatchers.IO) { api.adminStoreOrders(session) }
            val d = withContext(Dispatchers.IO) { api.adminDiamondPurchaseRequests(session) }
            val a = withContext(Dispatchers.IO) { api.adminAgencyApplications(session) }
            val w = withContext(Dispatchers.IO) { api.adminWallets(session) }
            o.onSuccess { storeOrders = it }.onFailure { onMessage(it.message ?: "تعذر تحميل طلبات المتجر.") }
            d.onSuccess { diamondRequests = it }.onFailure { onMessage(it.message ?: "تعذر تحميل طلبات الألماس.") }
            a.onSuccess { agencyApplications = it }.onFailure { onMessage(it.message ?: "تعذر تحميل طلبات الوكالة.") }
            w.onSuccess { wallets = it }.onFailure { onMessage(it.message ?: "تعذر تحميل المحافظ.") }
            busy = false
        }
    }

    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(section) { if (section == 4) refreshStore() }

    reviewTeacher?.let { (request, approve) ->
        AlertDialog(
        modifier = Modifier.imePadding().navigationBarsPadding(),
            onDismissRequest = { if (!busy) { reviewTeacher = null; note = "" } },
            title = { Text(if (approve) "تأكيد قبول المدرس" else "تأكيد رفض الطلب") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${request.fullName} — ${request.subject}")
                    if (approve) Text("عند الموافقة سيتحول الدور إلى مدرس ويُمنح التوثيق الأحمر تلقائيًا.", color = StudentMuted)
                    OutlinedTextField(note, { note = it.take(500) }, label = { Text("ملاحظة الإدارة") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.adminReviewTeacherRequest(session, request.id, approve, note.trim()) }
                            busy = false
                            r.onSuccess { onMessage(if (approve) "تم قبول طلب المدرس وتفعيل صلاحياته." else "تم رفض طلب المدرس."); reviewTeacher = null; note = ""; refresh() }
                                .onFailure { onMessage(it.message ?: "تعذر تحديث الطلب.") }
                        }
                    },
                    colors = if (approve) ButtonDefaults.buttonColors(containerColor = StudentBlue) else ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) { Text(if (approve) "تأكيد القبول" else "تأكيد الرفض") }
            },
            dismissButton = { TextButton(onClick = { reviewTeacher = null; note = "" }, enabled = !busy) { Text("إلغاء") } }
        )
    }

    deleteAd?.let { ad ->
        AlertDialog(
            onDismissRequest = { if (!busy) deleteAd = null },
            title = { Text("حذف الإعلان") },
            text = { Text("هل تريد حذف إعلان «${ad.title}» نهائيًا؟") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.adminDeleteHomeAd(session, ad.id) }
                            busy = false
                            r.onSuccess { onMessage("تم حذف الإعلان."); deleteAd = null; refresh() }.onFailure { onMessage(it.message ?: "تعذر حذف الإعلان.") }
                        }
                    }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) { Text("حذف") }
            },
            dismissButton = { TextButton(onClick = { deleteAd = null }, enabled = !busy) { Text("إلغاء") } }
        )
    }

    storeAction?.let { action ->
        AlertDialog(
            onDismissRequest = { if (!busy) { storeAction = null; storeNote = "" } },
            title = { Text(action.title) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(action.message)
                    if (action.kind == "agency") {
                        OutlinedTextField(
                            value = storeNote,
                            onValueChange = { storeNote = it.take(500) },
                            label = { Text("ملاحظة الإدارة — اختياري") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            val result = withContext(Dispatchers.IO) {
                                when (action.kind) {
                                    "order" -> api.adminUpdateStoreOrder(session, action.id, action.status ?: error("Missing order status"))
                                    "diamond" -> api.adminReviewDiamondRequest(session, action.id, action.approve == true)
                                    "agency" -> api.adminReviewAgencyApplication(session, action.id, action.approve == true, storeNote.trim())
                                    else -> Result.failure(IllegalArgumentException("عملية إدارة غير صالحة."))
                                }
                            }
                            busy = false
                            result.onSuccess {
                                onMessage("تم تنفيذ العملية بنجاح عبر الخادم.")
                                storeAction = null
                                storeNote = ""
                                refreshStore()
                            }.onFailure { onMessage(it.message ?: "تعذر تنفيذ العملية.") }
                        }
                    },
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (action.approve == false || action.status == "cancelled" || action.status == "refunded") Color(0xFFC62828) else StudentBlue
                    )
                ) { Text("تأكيد") }
            },
            dismissButton = { TextButton(onClick = { storeAction = null; storeNote = "" }, enabled = !busy) { Text("إلغاء") } }
        )
    }

    Column(Modifier.fillMaxSize()) {
        if (showTabs) {
            ScrollableTabRow(selectedTabIndex = section, edgePadding = 6.dp, containerColor = Color.White, contentColor = StudentBlue) {
                listOf("طلبات المدرسين", "الإعلانات", "Learn English", "التعليم", "المتجر", "الغرف").forEachIndexed { i, label ->
                    Tab(selected = section == i, onClick = { section = i }, text = { Text(label) })
                }
            }
        }
        when (section) {
            0 -> TeacherRequestsAdmin(teachers, onApprove = { reviewTeacher = it to true }, onReject = { reviewTeacher = it to false })
            1 -> AdsAdmin(api, session, ads, busy, onMessage, onRefresh = ::refresh, onDelete = { deleteAd = it })
            2 -> LearnEnglishAdmin(api, session, busy, onMessage)
            3 -> EducationAdmin(api, session, busy, onMessage)
            4 -> AdminStorePane(api, session, storeOrders, diamondRequests, agencyApplications, wallets, { storeAction = it }, { refreshStore() }, onMessage)
            else -> AdminRoomsPane(api, session, onMessage)
        }
    }
}

@Composable
private fun TeacherRequestsAdmin(items: List<TeacherRequest>, onApprove: (TeacherRequest) -> Unit, onReject: (TeacherRequest) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(items, key = { it.id }) { request ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(request.fullName, fontWeight = FontWeight.Black)
                    if (request.username.isNotBlank()) Text("@${request.username}", color = StudentMuted)
                    if (request.email.isNotBlank()) Text(request.email, color = StudentMuted, style = MaterialTheme.typography.bodySmall)
                    Text("المرحلة: ${request.educationStage}", color = StudentMuted)
                    Text("المادة: ${request.subject}", color = StudentMuted)
                    if (request.experience.isNotBlank()) Text("الخبرة: ${request.experience}", color = StudentMuted, style = MaterialTheme.typography.bodySmall)
                    if (request.note.isNotBlank()) Text("ملاحظة الطالب: ${request.note}", color = StudentMuted, style = MaterialTheme.typography.bodySmall)
                    Text("تاريخ الطلب: ${prettyTime(request.createdAt)}", color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                    Text("الحالة: ${request.status}", color = StudentBlue)
                    if (request.status == "pending") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { onApprove(request) }) { Text("قبول") }
                            OutlinedButton(onClick = { onReject(request) }, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828))) { Text("رفض") }
                        }
                    }
                }
            }
        }
        if (items.isEmpty()) item { Text("لا توجد طلبات مدرسين.", color = StudentMuted, modifier = Modifier.padding(14.dp)) }
    }
}

@Composable
private fun AdsAdmin(
    api: SupabaseApi, session: StudentSession, ads: List<HomeAd>, busy: Boolean,
    onMessage: (String) -> Unit, onRefresh: () -> Unit, onDelete: (HomeAd) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var uploadingImage by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var imageUrl by remember { mutableStateOf("") }
    var actionUrl by remember { mutableStateOf("") }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        if (picked != null) {
            scope.launch {
                uploadingImage = true
                val r = withContext(Dispatchers.IO) {
                    runCatching {
                        val mime = context.contentResolver.getType(picked) ?: "image/jpeg"
                        val ext = when { mime.contains("png") -> "png"; mime.contains("webp") -> "webp"; else -> "jpg" }
                        val temp = try {
                            materializeUriToCacheFile(context, picked, ext, 5L * 1024L * 1024L)
                        } catch (t: IllegalStateException) {
                            if (t.message == "حجم الملف أكبر من الحد المسموح.") throw IllegalStateException("الحد الأقصى لصورة الإعلان 5MB.")
                            throw t
                        }
                        try {
                            api.uploadObjectFile(session, "home-ads", "${session.userId}/${System.currentTimeMillis()}.$ext", temp, mime).getOrThrow()
                        } finally {
                            temp.delete()
                        }
                    }
                }
                uploadingImage = false
                r.onSuccess { imageUrl = it; onMessage("تم رفع صورة الإعلان.") }.onFailure { onMessage(it.message ?: "تعذر رفع الصورة.") }
            }
        }
    }
    LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("إنشاء إعلان للرئيسية", fontWeight = FontWeight.Black)
                    OutlinedTextField(title, { title = it.take(120) }, label = { Text("العنوان") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(body, { body = it.take(500) }, label = { Text("النص") }, modifier = Modifier.fillMaxWidth())
                    OutlinedButton(onClick = { imagePicker.launch("image/*") }, modifier = Modifier.fillMaxWidth(), enabled = !busy && !uploadingImage) {
                        Text(if (uploadingImage) "جارٍ رفع الصورة..." else if (imageUrl.isBlank()) "اختيار صورة الإعلان" else "تغيير صورة الإعلان")
                    }
                    if (imageUrl.isNotBlank()) Text("تم تجهيز الصورة ✓", color = Color(0xFF16803C))
                    OutlinedTextField(actionUrl, { actionUrl = it.take(500) }, label = { Text("رابط عند الضغط — اختياري") }, modifier = Modifier.fillMaxWidth())
                    Button(onClick = {
                        if (title.isBlank() || busy) return@Button
                        scope.launch {
                            val r = withContext(Dispatchers.IO) { api.adminCreateHomeAd(session, title.trim(), body.trim(), imageUrl.trim().ifBlank { null }, actionUrl.trim().ifBlank { null }) }
                            r.onSuccess { title = ""; body = ""; imageUrl = ""; actionUrl = ""; onMessage("تم نشر الإعلان في الرئيسية."); onRefresh() }
                                .onFailure { onMessage(it.message ?: "تعذر إنشاء الإعلان.") }
                        }
                    }, modifier = Modifier.fillMaxWidth(), enabled = !busy) { Text("نشر الإعلان") }
                }
            }
        }
        items(ads, key = { it.id }) { ad ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, Color(0xFFE6DDF5))) {
                Column(Modifier.padding(12.dp)) {
                    Text(ad.title, fontWeight = FontWeight.Bold)
                    Text(ad.body, color = StudentMuted)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = ad.isActive, onClick = {
                            scope.launch {
                                val r = withContext(Dispatchers.IO) { api.adminToggleHomeAd(session, ad.id, !ad.isActive) }
                                r.onSuccess { onMessage("تم تحديث حالة الإعلان."); onRefresh() }.onFailure { onMessage(it.message ?: "تعذر التحديث.") }
                            }
                        }, label = { Text(if (ad.isActive) "ظاهر" else "مخفي") })
                        TextButton(onClick = { onDelete(ad) }) { Text("حذف", color = Color(0xFFC62828)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun LearnEnglishAdmin(api: SupabaseApi, session: StudentSession, busy: Boolean, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var english by remember { mutableStateOf("") }
    var arabic by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("مفردات") }
    var level by remember { mutableStateOf("all") }
    Column(Modifier.fillMaxSize().imePadding().navigationBarsPadding().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("إضافة محتوى Learn English", fontWeight = FontWeight.Black)
        OutlinedTextField(title, { title = it.take(120) }, label = { Text("العنوان") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(english, { english = it.take(2000) }, label = { Text("النص الإنجليزي") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
        OutlinedTextField(arabic, { arabic = it.take(2000) }, label = { Text("الشرح/الترجمة العربية") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
        OutlinedTextField(category, { category = it.take(80) }, label = { Text("التصنيف") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(level, { level = it.take(40) }, label = { Text("المستوى") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = {
            if (title.isBlank() || english.isBlank() || busy) return@Button
            scope.launch {
                val r = withContext(Dispatchers.IO) { api.adminAddLearnEnglish(session, title.trim(), english.trim(), arabic.trim(), category.trim(), level.trim()) }
                r.onSuccess { title = ""; english = ""; arabic = ""; onMessage("تمت إضافة محتوى Learn English.") }.onFailure { onMessage(it.message ?: "تعذر الإضافة.") }
            }
        }, modifier = Modifier.fillMaxWidth(), enabled = !busy) { Text("إضافة المحتوى") }
    }
}

@Composable
private fun SuggestionsAdmin(items: List<StudentSuggestion>, onReview: (StudentSuggestion) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(items, key = { it.id }) { item ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp)) {
                    Text(item.title, fontWeight = FontWeight.Bold)
                    Text(item.body, color = StudentMuted, maxLines = 4)
                    Text("${item.category} — ${item.status}", color = StudentBlue, style = MaterialTheme.typography.labelMedium)
                    TextButton(onClick = { onReview(item) }) { Text("مراجعة ورد") }
                }
            }
        }
        if (items.isEmpty()) item { Text("لا توجد اقتراحات.", color = StudentMuted) }
    }
}

@Composable
private fun EducationAdmin(api: SupabaseApi, session: StudentSession, busy: Boolean, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var mode by remember { mutableIntStateOf(0) }
    var stages by remember { mutableStateOf<List<EducationStage>>(emptyList()) }
    var levels by remember { mutableStateOf<List<EducationLevel>>(emptyList()) }
    var subjects by remember { mutableStateOf<List<EducationSubject>>(emptyList()) }
    var selectedStage by remember { mutableStateOf<EducationStage?>(null) }
    var selectedLevel by remember { mutableStateOf<EducationLevel?>(null) }
    var selectedSubject by remember { mutableStateOf<EducationSubject?>(null) }

    var universities by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var colleges by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var departments by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var universityLevels by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var selectedUniversity by remember { mutableStateOf<UniversityNode?>(null) }
    var selectedCollege by remember { mutableStateOf<UniversityNode?>(null) }
    var selectedDepartment by remember { mutableStateOf<UniversityNode?>(null) }
    var selectedUniversityLevel by remember { mutableStateOf<UniversityNode?>(null) }

    var subjectName by remember { mutableStateOf("") }
    var subjectSlug by remember { mutableStateOf("") }
    var subjectDescription by remember { mutableStateOf("") }
    var lessonTitle by remember { mutableStateOf("") }
    var lessonDescription by remember { mutableStateOf("") }
    var lessonType by remember { mutableStateOf("text") }
    var lessonUrl by remember { mutableStateOf("") }
    var working by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        stages = withContext(Dispatchers.IO) { api.educationStages(session).getOrDefault(emptyList()) }
            .filter { it.slug != "university" }
        universities = withContext(Dispatchers.IO) { api.universities(session).getOrDefault(emptyList()) }
    }

    fun loadLevels(stage: EducationStage) {
        selectedStage = stage
        selectedLevel = null
        selectedSubject = null
        subjects = emptyList()
        scope.launch {
            levels = withContext(Dispatchers.IO) { api.educationLevels(session, stage.id).getOrDefault(emptyList()) }
        }
    }

    fun loadSubjects(level: EducationLevel) {
        selectedLevel = level
        selectedSubject = null
        scope.launch {
            subjects = withContext(Dispatchers.IO) { api.educationSubjects(session, level.id).getOrDefault(emptyList()) }
        }
    }

    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = mode) {
            Tab(selected = mode == 0, onClick = { mode = 0 }, text = { Text("مدرسي") })
            Tab(selected = mode == 1, onClick = { mode = 1 }, text = { Text("جامعة") })
        }

        LazyColumn(
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (mode == 0) {
                item { Text("اختر المرحلة", fontWeight = FontWeight.Black) }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(stages, key = { it.id }) { s ->
                            FilterChip(
                                selected = selectedStage?.id == s.id,
                                onClick = { loadLevels(s) },
                                label = { Text(s.name) }
                            )
                        }
                    }
                }

                if (selectedStage != null) {
                    item { Text("اختر الصف", fontWeight = FontWeight.Bold) }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(levels, key = { it.id }) { l ->
                                FilterChip(
                                    selected = selectedLevel?.id == l.id,
                                    onClick = { loadSubjects(l) },
                                    label = { Text(l.name) }
                                )
                            }
                        }
                    }
                }

                if (selectedLevel != null) {
                    item {
                        StudentOutlinedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Text("إضافة مادة جديدة إلى ${selectedLevel!!.name}", fontWeight = FontWeight.Black)
                                OutlinedTextField(subjectName, { subjectName = it.take(100) }, label = { Text("اسم المادة") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(subjectSlug, { value -> subjectSlug = value.filter { c -> c.isLetterOrDigit() || c == '-' || c == '_' }.take(100) }, label = { Text("المعرّف المختصر") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(subjectDescription, { subjectDescription = it.take(800) }, label = { Text("الوصف — اختياري") }, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        val level = selectedLevel ?: return@Button
                                        if (subjectName.isBlank() || subjectSlug.isBlank() || working) return@Button
                                        scope.launch {
                                            working = true
                                            val r = withContext(Dispatchers.IO) {
                                                api.adminCreateSchoolSubject(session, level.id, subjectName, subjectSlug, subjectDescription)
                                            }
                                            working = false
                                            r.onSuccess {
                                                onMessage("تمت إضافة المادة وربطها بالصف.")
                                                subjectName = ""; subjectSlug = ""; subjectDescription = ""
                                                loadSubjects(level)
                                            }.onFailure { onMessage(it.message ?: "تعذر إضافة المادة.") }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !busy && !working
                                ) { Text("إضافة المادة") }
                            }
                        }
                    }
                    item { Text("المواد الموجودة", fontWeight = FontWeight.Bold) }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(subjects, key = { it.id }) { s ->
                                FilterChip(
                                    selected = selectedSubject?.id == s.id,
                                    onClick = { selectedSubject = s },
                                    label = { Text(s.name) }
                                )
                            }
                        }
                    }
                }
            } else {
                item { Text("الجامعة ← الكلية ← القسم ← المرحلة", fontWeight = FontWeight.Black) }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(universities, key = { it.id }) { u ->
                            FilterChip(
                                selected = selectedUniversity?.id == u.id,
                                onClick = {
                                    selectedUniversity = u
                                    selectedCollege = null
                                    selectedDepartment = null
                                    selectedUniversityLevel = null
                                    selectedSubject = null
                                    scope.launch {
                                        colleges = withContext(Dispatchers.IO) { api.universityColleges(session, u.id).getOrDefault(emptyList()) }
                                    }
                                },
                                label = { Text(u.name) }
                            )
                        }
                    }
                }

                if (selectedUniversity != null) {
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(colleges, key = { it.id }) { c ->
                                FilterChip(
                                    selected = selectedCollege?.id == c.id,
                                    onClick = {
                                        selectedCollege = c
                                        selectedDepartment = null
                                        selectedUniversityLevel = null
                                        selectedSubject = null
                                        scope.launch {
                                            departments = withContext(Dispatchers.IO) { api.universityDepartments(session, c.id).getOrDefault(emptyList()) }
                                        }
                                    },
                                    label = { Text(c.name) }
                                )
                            }
                        }
                    }
                }

                if (selectedCollege != null) {
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(departments, key = { it.id }) { d ->
                                FilterChip(
                                    selected = selectedDepartment?.id == d.id,
                                    onClick = {
                                        selectedDepartment = d
                                        selectedUniversityLevel = null
                                        selectedSubject = null
                                        scope.launch {
                                            universityLevels = withContext(Dispatchers.IO) { api.universityLevels(session, d.id).getOrDefault(emptyList()) }
                                        }
                                    },
                                    label = { Text(d.name) }
                                )
                            }
                        }
                    }
                }

                if (selectedDepartment != null) {
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(universityLevels, key = { it.id }) { l ->
                                FilterChip(
                                    selected = selectedUniversityLevel?.id == l.id,
                                    onClick = {
                                        selectedUniversityLevel = l
                                        selectedSubject = null
                                        scope.launch {
                                            subjects = withContext(Dispatchers.IO) { api.universitySubjects(session, l.id).getOrDefault(emptyList()) }
                                        }
                                    },
                                    label = { Text(l.name) }
                                )
                            }
                        }
                    }
                }

                if (selectedUniversityLevel != null) {
                    item {
                        StudentOutlinedCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Text("إضافة مادة جامعة", fontWeight = FontWeight.Black)
                                OutlinedTextField(subjectName, { subjectName = it.take(100) }, label = { Text("اسم المادة") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(subjectSlug, { value -> subjectSlug = value.filter { c -> c.isLetterOrDigit() || c == '-' || c == '_' }.take(100) }, label = { Text("المعرّف المختصر") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(subjectDescription, { subjectDescription = it.take(800) }, label = { Text("الوصف") }, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        val level = selectedUniversityLevel ?: return@Button
                                        if (subjectName.isBlank() || subjectSlug.isBlank() || working) return@Button
                                        scope.launch {
                                            working = true
                                            val r = withContext(Dispatchers.IO) {
                                                api.adminCreateUniversitySubject(session, level.id, subjectName, subjectSlug, subjectDescription)
                                            }
                                            working = false
                                            r.onSuccess {
                                                onMessage("تمت إضافة مادة الجامعة وربطها بالمرحلة.")
                                                subjectName = ""; subjectSlug = ""; subjectDescription = ""
                                                subjects = withContext(Dispatchers.IO) { api.universitySubjects(session, level.id).getOrDefault(emptyList()) }
                                            }.onFailure { onMessage(it.message ?: "تعذر إضافة المادة.") }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !busy && !working
                                ) { Text("إضافة المادة") }
                            }
                        }
                    }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(subjects, key = { it.id }) { s ->
                                FilterChip(
                                    selected = selectedSubject?.id == s.id,
                                    onClick = { selectedSubject = s },
                                    label = { Text(s.name) }
                                )
                            }
                        }
                    }
                }
            }

            if (selectedSubject != null) {
                item {
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("إضافة درس إلى ${selectedSubject!!.name}", fontWeight = FontWeight.Black)
                            OutlinedTextField(lessonTitle, { lessonTitle = it.take(160) }, label = { Text("عنوان الدرس") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(lessonDescription, { lessonDescription = it.take(4000) }, label = { Text("الشرح") }, modifier = Modifier.fillMaxWidth(), minLines = 4)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("text", "link", "video", "pdf").forEach { v ->
                                    FilterChip(selected = lessonType == v, onClick = { lessonType = v }, label = { Text(v) })
                                }
                            }
                            OutlinedTextField(lessonUrl, { lessonUrl = it.take(600) }, label = { Text("رابط خارجي — اختياري") }, modifier = Modifier.fillMaxWidth())
                            Button(
                                onClick = {
                                    val subject = selectedSubject ?: return@Button
                                    if (lessonTitle.isBlank() || working) return@Button
                                    scope.launch {
                                        working = true
                                        val r = withContext(Dispatchers.IO) {
                                            api.adminAddEducationMaterial(
                                                session,
                                                subject.id,
                                                lessonTitle,
                                                lessonDescription,
                                                lessonType,
                                                lessonUrl.ifBlank { null },
                                                if (mode == 1) selectedUniversityLevel?.id else null
                                            )
                                        }
                                        working = false
                                        r.onSuccess {
                                            lessonTitle = ""; lessonDescription = ""; lessonUrl = ""
                                            onMessage("تم نشر الدرس وسيظهر للمستخدمين دون APK جديد.")
                                        }.onFailure { onMessage(it.message ?: "تعذر نشر الدرس.") }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !busy && !working
                            ) { Text("نشر الدرس") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminStorePane(
    api: SupabaseApi,
    session: StudentSession,
    orders: List<AdminStoreOrder>,
    diamondRequests: List<DiamondPurchaseRequest>,
    agencies: List<AgencyApplication>,
    wallets: List<AdminWalletRow>,
    onAction: (AdminStoreAction) -> Unit,
    onRefresh: () -> Unit,
    onMessage: (String) -> Unit
) {
    var tab by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        ScrollableTabRow(selectedTabIndex = tab, edgePadding = 6.dp, containerColor = Color.White, contentColor = StudentBlue) {
            listOf("إدارة المتجر", "الطلبات", "طلبات الألماس", "الوكالات", "المحافظ").forEachIndexed { index, label ->
                Tab(selected = tab == index, onClick = { tab = index }, text = { Text(label) })
            }
        }
        when (tab) {
            0 -> AdminStoreManagementPane(api, session, onMessage, onRefresh)
            1 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(orders, key = { it.id }) { order ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(order.productName, fontWeight = FontWeight.Black)
                            Text("الحالة: ${order.status}", color = StudentBlue)
                            Text("المستخدم: ${order.userId.take(10)}…", color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                            Text("الدفع: ${order.paymentMethod} · ${if (order.diamondAmount > 0) "${order.diamondAmount} ألماسة" else "${order.moneyAmount.toLong()} IQD"}", color = StudentMuted)
                            if (order.status !in setOf("completed", "cancelled", "refunded")) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    if (order.status == "pending") {
                                        OutlinedButton(onClick = { onAction(AdminStoreAction("order", order.id, status = "confirmed", title = "تأكيد قبول طلب ${order.productName}", message = "سيتم تحويل الطلب إلى مؤكد.")) }) { Text("تأكيد") }
                                    }
                                    Button(onClick = { onAction(AdminStoreAction("order", order.id, status = "completed", title = "تأكيد إكمال الطلب", message = "هل تم تنفيذ/تسليم هذا الطلب فعلًا؟")) }) { Text("مكتمل") }
                                    TextButton(onClick = { onAction(AdminStoreAction("order", order.id, status = "cancelled", title = "تأكيد إلغاء الطلب", message = "قد تؤدي هذه العملية إلى استرجاع الرصيد/المخزون حسب طريقة الدفع.")) }) { Text("إلغاء", color = Color(0xFFC62828)) }
                                }
                            }
                            if (order.status == "completed") {
                                TextButton(onClick = { onAction(AdminStoreAction("order", order.id, status = "refunded", title = "تأكيد استرجاع الطلب", message = "سيتم تنفيذ منطق الاسترجاع المالي عبر الخادم. تأكد قبل المتابعة.")) }) { Text("استرجاع", color = Color(0xFFC62828)) }
                            }
                        }
                    }
                }
                if (orders.isEmpty()) item { Text("لا توجد طلبات متجر.", color = StudentMuted, modifier = Modifier.padding(12.dp)) }
            }
            2 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(diamondRequests, key = { it.id }) { request ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text("${request.diamonds} ألماسة — ${request.amountIqd} IQD", fontWeight = FontWeight.Black)
                            Text("الحالة: ${request.status}", color = StudentBlue)
                            Text("مرجع الدفع: ${request.paymentReference ?: "غير مرفق"}", color = StudentMuted)
                            Text("المستخدم: ${request.fullName.ifBlank { request.userId.take(10)+"…" }}${request.username.takeIf { it.isNotBlank() }?.let { "  @$it" } ?: ""}", color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                            if (request.status == "pending") {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { onAction(AdminStoreAction("diamond", request.id, approve = true, title = "تأكيد إضافة الألماس", message = "بعد التأكيد سيضيف الخادم ${request.diamonds} ألماسة إلى محفظة المستخدم. تأكد من وصول الدفع أولًا.")) }) { Text("اعتماد") }
                                    OutlinedButton(onClick = { onAction(AdminStoreAction("diamond", request.id, approve = false, title = "تأكيد رفض طلب الألماس", message = "لن تتم إضافة أي رصيد للمستخدم.")) }, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828))) { Text("رفض") }
                                }
                            }
                        }
                    }
                }
                if (diamondRequests.isEmpty()) item { Text("لا توجد طلبات ألماس.", color = StudentMuted, modifier = Modifier.padding(12.dp)) }
            }
            3 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(agencies, key = { it.id }) { application ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(application.fullName, fontWeight = FontWeight.Black)
                            Text("${application.province} — ${application.phone}", color = StudentMuted)
                            Text("الحالة: ${application.status}", color = StudentBlue)
                            if (application.status == "pending") {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { onAction(AdminStoreAction("agency", application.id, approve = true, title = "تأكيد قبول الوكالة", message = "سيُنشئ الخادم حساب وكيل فعّال لهذا المستخدم.")) }) { Text("قبول") }
                                    OutlinedButton(onClick = { onAction(AdminStoreAction("agency", application.id, approve = false, title = "تأكيد رفض الوكالة", message = "سيتم رفض الطلب ويمكن إضافة ملاحظة للمستخدم.")) }, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828))) { Text("رفض") }
                                }
                            }
                        }
                    }
                }
                if (agencies.isEmpty()) item { Text("لا توجد طلبات وكالة.", color = StudentMuted, modifier = Modifier.padding(12.dp)) }
            }
            else -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(wallets, key = { it.userId }) { wallet ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("محفظة ${wallet.userId.take(10)}…", fontWeight = FontWeight.Bold)
                            Text("المتاح: ${wallet.availableBalance.toLong()} · المحجوز: ${wallet.heldBalance.toLong()}", color = StudentBlue)
                            Text("إجمالي الشراء: ${wallet.totalPurchased.toLong()} · المصروف: ${wallet.totalSpent.toLong()}", color = StudentMuted)
                            Text(prettyTime(wallet.updatedAt), color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                if (wallets.isEmpty()) item { Text("لا توجد محافظ لعرضها.", color = StudentMuted, modifier = Modifier.padding(12.dp)) }
            }
        }
    }
}



@Composable
private fun AdminRoomsPane(api: SupabaseApi, session: StudentSession, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var settings by remember { mutableStateOf(VoiceRoomSettings()) }
    var creationPrice by remember { mutableStateOf("100") }
    var micPrice by remember { mutableStateOf("50") }
    var bgName by remember { mutableStateOf("") }
    var bgPrice by remember { mutableStateOf("0") }
    var bgUrl by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var uploadBusy by remember { mutableStateOf(false) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        if (picked != null) scope.launch {
            uploadBusy = true
            val r = withContext(Dispatchers.IO) {
                runCatching {
                    val mime = context.contentResolver.getType(picked) ?: "image/jpeg"
                    val ext = when { mime.contains("png") -> "png"; mime.contains("webp") -> "webp"; else -> "jpg" }
                    val temp = try {
                        materializeUriToCacheFile(context, picked, ext, 8L * 1024L * 1024L)
                    } catch (t: IllegalStateException) {
                        if (t.message == "حجم الملف أكبر من الحد المسموح.") throw IllegalStateException("الحد الأقصى للخلفية 8MB.")
                        throw t
                    }
                    try {
                        api.uploadObjectFile(session, "home-ads", "room-backgrounds/${session.userId}/${System.currentTimeMillis()}.$ext", temp, mime).getOrThrow()
                    } finally {
                        temp.delete()
                    }
                }
            }
            uploadBusy = false
            r.onSuccess { bgUrl = it; onMessage("تم تجهيز خلفية الغرفة.") }.onFailure { onMessage(it.message ?: "تعذر رفع الخلفية.") }
        }
    }
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) { api.voiceRoomSettings(session) }.onSuccess {
            settings = it; creationPrice = it.creationPriceDiamonds.toString(); micPrice = it.extraMicPriceDiamonds.toString()
        }
    }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("إعدادات الغرف", fontWeight = FontWeight.Black)
                    OutlinedTextField(creationPrice, { creationPrice = it.filter(Char::isDigit).take(8) }, label = { Text("سعر إنشاء الغرفة بالألماس") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(micPrice, { micPrice = it.filter(Char::isDigit).take(8) }, label = { Text("سعر فتح مايك إضافي") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = settings.roomsEnabled, onClick = { settings = settings.copy(roomsEnabled = !settings.roomsEnabled) }, label = { Text("الغرف") })
                        FilterChip(selected = settings.giftsEnabled, onClick = { settings = settings.copy(giftsEnabled = !settings.giftsEnabled) }, label = { Text("الهدايا") })
                    }
                    Button(enabled=!busy,onClick={
                        scope.launch { busy=true; val next=settings.copy(creationPriceDiamonds=creationPrice.toIntOrNull()?:0,extraMicPriceDiamonds=micPrice.toIntOrNull()?:0,maxSpeakers=10); withContext(Dispatchers.IO){api.adminSetVoiceRoomSettingsV25(session,next)}.onSuccess{settings=next;onMessage("تم حفظ إعدادات الغرف.")}.onFailure{onMessage(it.message ?: "تعذر الحفظ.")};busy=false }
                    },modifier=Modifier.fillMaxWidth()){Text("حفظ")}
                }
            }
        }
        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("إضافة خلفية للغرف", fontWeight = FontWeight.Black)
                    OutlinedTextField(bgName,{bgName=it.take(80)},label={Text("اسم الخلفية")},modifier=Modifier.fillMaxWidth())
                    OutlinedTextField(bgPrice,{bgPrice=it.filter(Char::isDigit).take(8)},label={Text("السعر بالألماس — 0 مجاني")},modifier=Modifier.fillMaxWidth())
                    OutlinedButton(onClick={picker.launch("image/*")},enabled=!uploadBusy,modifier=Modifier.fillMaxWidth()){Text(if(uploadBusy)"جارٍ الرفع..." else if(bgUrl.isBlank())"اختيار صورة" else "تغيير الصورة")}
                    Button(enabled=bgName.isNotBlank()&&bgUrl.isNotBlank()&&!busy,onClick={scope.launch{busy=true;withContext(Dispatchers.IO){api.adminAddVoiceRoomBackground(session,bgName,bgUrl,bgPrice.toIntOrNull()?:0)}.onSuccess{bgName="";bgPrice="0";bgUrl="";onMessage("تمت إضافة الخلفية للمتجر والغرف.")}.onFailure{onMessage(it.message ?: "تعذر إضافة الخلفية.")};busy=false}},modifier=Modifier.fillMaxWidth()){Text("إضافة الخلفية")}
                }
            }
        }
    }
}
